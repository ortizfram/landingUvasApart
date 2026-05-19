/**
 * Cloudbeds -> GoHighLevel bridge (Apps Script Web App)
 *
 * What it does
 * - Receives Cloudbeds webhook events (POST JSON).
 * - On reservation/status_changed with status=confirmed:
 *   - Fetches reservation details from Cloudbeds API (getReservation).
 *   - Sends a normalized payload to a GoHighLevel "Inbound Webhook" URL.
 *
 * How to deploy
 * 1) Create a new Apps Script project and paste this file.
 * 2) In Project Settings -> Script properties, set:
 *    - CLOUDBEDS_API_KEY        (e.g. cbat_....)
 *    - WEBHOOK_SHARED_SECRET    (random string; you'll add it to the Cloudbeds webhook URL as ?secret=...)
 * 3) Deploy -> New deployment -> Web app:
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4) Copy the Web app URL, then subscribe Cloudbeds webhooks to:
 *    <WEB_APP_URL>?secret=<WEBHOOK_SHARED_SECRET>
 *
 * Notes
 * - Cloudbeds webhook delivery may retry; we keep a short idempotency cache.
 * - Cloudbeds recommends returning 2XX quickly; we do fast accept + best-effort processing.
 */

const CLOUDBEDS_API_BASE = "https://api.cloudbeds.com/api/v1.3";
const DEFAULT_GHL_INBOUND_WEBHOOK_URL =
  "https://services.leadconnectorhq.com/hooks/CegTFhE8LXsd7FFwgbIh/webhook-trigger/732109c7-ca54-4bda-af42-c017d7878c2b";

function doPost(e) {
  const secret = (e && e.parameter && e.parameter.secret) ? String(e.parameter.secret) : "";
  const expectedSecret = String(PropertiesService.getScriptProperties().getProperty("WEBHOOK_SHARED_SECRET") || "");
  if (!expectedSecret || secret !== expectedSecret) {
    return json_(401, { ok: false, error: "unauthorized" });
  }

  let payload = {};
  try {
    payload = JSON.parse((e && e.postData && e.postData.contents) ? e.postData.contents : "{}");
  } catch (err) {
    return json_(400, { ok: false, error: "invalid_json" });
  }

  // Immediate 2XX response recommended; still try to process now.
  tryProcess_(payload);
  return json_(200, { ok: true });
}

function doGet() {
  return json_(200, { ok: true, service: "cloudbeds-ghl-bridge" });
}

function tryProcess_(payload) {
  const eventName = String(payload.event || "");
  if (!eventName) return;

  // We only care about confirmed reservations.
  // Event sample: reservation/status_changed with status=confirmed
  const status = String(payload.status || "");
  if (eventName !== "reservation/status_changed" || status !== "confirmed") return;

  const reservationId = String(payload.reservationID || payload.reservationId || "");
  const propertyId = String(payload.propertyID || payload.propertyId || "");
  if (!reservationId || !propertyId) return;

  // Idempotency (Cloudbeds may retry, and ordering isn't guaranteed).
  const idempotencyKey = [eventName, reservationId, String(payload.timestamp || "")].join("|");
  if (!acquireIdempotency_(idempotencyKey)) return;

  const reservation = fetchReservation_(propertyId, reservationId);
  const normalized = normalize_(payload, reservation);
  sendToGhl_(normalized);
}

function acquireIdempotency_(key) {
  // CacheService TTL max varies; use 6 hours as a safe window.
  const cache = CacheService.getScriptCache();
  const existing = cache.get(key);
  if (existing) return false;
  cache.put(key, "1", 21600);
  return true;
}

function fetchReservation_(propertyId, reservationId) {
  const apiKey = String(PropertiesService.getScriptProperties().getProperty("CLOUDBEDS_API_KEY") || "");
  if (!apiKey) {
    throw new Error("Missing CLOUDBEDS_API_KEY in script properties");
  }

  const url =
    CLOUDBEDS_API_BASE +
    "/getReservation" +
    "?propertyID=" +
    encodeURIComponent(propertyId) +
    "&reservationID=" +
    encodeURIComponent(reservationId);

  const resp = UrlFetchApp.fetch(url, {
    method: "get",
    muteHttpExceptions: true,
    headers: {
      "x-api-key": apiKey
    }
  });

  const status = resp.getResponseCode();
  const text = resp.getContentText();
  if (status < 200 || status >= 300) {
    throw new Error("Cloudbeds getReservation failed: HTTP " + status + " body=" + text);
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    return { raw: text };
  }
}

function normalize_(eventPayload, reservationResponse) {
  const reservationObj = (reservationResponse && reservationResponse.data) ? reservationResponse.data : reservationResponse;

  const reservationId =
    String(eventPayload.reservationID || eventPayload.reservationId || (reservationObj && reservationObj.reservationID) || (reservationObj && reservationObj.reservationId) || "");
  const propertyId = String(eventPayload.propertyID || eventPayload.propertyId || "");

  const startDate = String(eventPayload.startDate || (reservationObj && reservationObj.startDate) || "");
  const endDate = String(eventPayload.endDate || (reservationObj && reservationObj.endDate) || "");

  // Guest info varies by response shape; try a few common keys.
  const guestFirst =
    String(
      (reservationObj && reservationObj.guestFirstName) ||
        (reservationObj && reservationObj.guest && reservationObj.guest.firstName) ||
        ""
    );
  const guestLast =
    String(
      (reservationObj && reservationObj.guestLastName) ||
        (reservationObj && reservationObj.guest && reservationObj.guest.lastName) ||
        ""
    );
  const guestName =
    String(
      (reservationObj && reservationObj.guestName) ||
        (reservationObj && reservationObj.guest && reservationObj.guest.name) ||
        [guestFirst, guestLast].filter(Boolean).join(" ")
    );

  const guestEmail =
    String(
      (reservationObj && reservationObj.guestEmail) ||
        (reservationObj && reservationObj.guest && reservationObj.guest.email) ||
        ""
    );

  const guestPhone =
    String(
      (reservationObj && reservationObj.guestPhone) ||
        (reservationObj && reservationObj.guest && reservationObj.guest.phone) ||
        ""
    );

  // Totals also vary; pass raw + try common fields.
  const currency =
    String(
      (reservationObj && reservationObj.currency) ||
        (reservationObj && reservationObj.paymentCurrency) ||
        (reservationObj && reservationObj.hotelCurrency) ||
        "ARS"
    );

  const totalAmount =
    toNumber_(
      (reservationObj && reservationObj.total) ||
        (reservationObj && reservationObj.totalAmount) ||
        (reservationObj && reservationObj.grandTotal) ||
        (reservationObj && reservationObj.balance) ||
        ""
    );

  return {
    event: "cloudbeds_reservation_confirmed",
    reservationId: reservationId,
    propertyId: propertyId,
    startDate: startDate,
    endDate: endDate,
    status: String(eventPayload.status || "confirmed"),
    guest: {
      firstName: guestFirst,
      lastName: guestLast,
      name: guestName,
      email: guestEmail,
      phone: guestPhone
    },
    total: {
      amount: totalAmount,
      currency: currency
    },
    cloudbeds: {
      webhook: eventPayload,
      reservation: reservationResponse
    }
  };
}

function sendToGhl_(payload) {
  const ghlUrl = String(
    PropertiesService.getScriptProperties().getProperty("GHL_INBOUND_WEBHOOK_URL") || DEFAULT_GHL_INBOUND_WEBHOOK_URL
  );
  if (!ghlUrl) {
    throw new Error("Missing GHL_INBOUND_WEBHOOK_URL in script properties");
  }

  UrlFetchApp.fetch(ghlUrl, {
    method: "post",
    contentType: "application/json",
    muteHttpExceptions: true,
    payload: JSON.stringify(payload)
  });
}

function toNumber_(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  const text = String(value).replace(/[^\d.,-]/g, "").replace(",", ".");
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function json_(statusCode, obj) {
  const out = ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
  // Apps Script doesn't let you set HTTP status explicitly for ContentService responses.
  // We still include it in body for debugging.
  return out;
}

