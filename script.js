(function () {
  const form = document.querySelector("#leadForm");
  const status = document.querySelector("#formStatus");
  const cloudbedsUrl = window.UVAS_CLOUDBEDS_URL || "https://hotels.cloudbeds.com/reservation/PwLRQb?currency=ARS";
  const endpoint = window.UVAS_LEADS_ENDPOINT || "";
  const ghlTrackingSrc = window.UVAS_GHL_EXTERNAL_TRACKING_SRC || "";
  const ghlTrackingId = window.UVAS_GHL_TRACKING_ID || "";

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function installGhlExternalTracking() {
    if (!ghlTrackingSrc || !ghlTrackingId) return false;
    const existing = document.querySelector(`script[data-tracking-id="${ghlTrackingId}"]`);
    if (existing) return true;

    const script = document.createElement("script");
    script.async = true;
    script.src = ghlTrackingSrc;
    script.setAttribute("data-tracking-id", ghlTrackingId);
    document.body.appendChild(script);
    return true;
  }

  function updateCountdown() {
    const now = new Date();
    const target = new Date(now);
    target.setHours(24, 0, 0, 0);
    const diff = Math.max(0, target.getTime() - now.getTime());
    const hours = Math.floor(diff / 1000 / 60 / 60);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    document.querySelector("[data-count='hours']").textContent = pad(hours);
    document.querySelector("[data-count='minutes']").textContent = pad(minutes);
    document.querySelector("[data-count='seconds']").textContent = pad(seconds);
  }

  function getUtmPayload() {
    const params = new URLSearchParams(window.location.search);
    const utm = {};
    params.forEach((value, key) => {
      if (key.startsWith("utm_") || ["fbclid", "campaign_id", "ad_id"].includes(key)) {
        utm[key] = value;
      }
    });
    return utm;
  }

  function setStatus(message, type) {
    status.textContent = message;
    status.className = "form-status";
    if (type) {
      status.classList.add(type);
    }
  }

  function buildCloudbedsUrl(payload) {
    const url = new URL(cloudbedsUrl);
    if (payload.checkin) {
      url.searchParams.set("checkin", payload.checkin);
    }
    if (payload.checkout) {
      url.searchParams.set("checkout", payload.checkout);
    }
    if (payload.guests) {
      url.searchParams.set("adults", payload.guests);
    }
    return url.toString();
  }

  async function submitLead(payload) {
    if (!endpoint) {
      if (ghlTrackingSrc && ghlTrackingId) {
        // External Tracking captures the DOM-based form submission into GoHighLevel.
        return { offline: false, ghl: true };
      }

      const stored = JSON.parse(localStorage.getItem("uvas_leads_pending") || "[]");
      stored.push(payload);
      localStorage.setItem("uvas_leads_pending", JSON.stringify(stored));
      return { offline: true, ghl: false };
    }

    await fetch(endpoint, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });
    return { offline: false };
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector("button[type='submit']");
    const data = new FormData(form);
    const payload = {
      createdAt: new Date().toISOString(),
      name: String(data.get("name") || "").trim(),
      whatsapp: String(data.get("whatsapp") || "").trim(),
      email: String(data.get("email") || "").trim(),
      checkin: String(data.get("checkin") || "").trim(),
      checkout: String(data.get("checkout") || "").trim(),
      guests: String(data.get("guests") || "").trim(),
      message: String(data.get("message") || "").trim(),
      source: "landing-github-pages",
      utm: getUtmPayload(),
      pageUrl: window.location.href
    };

    if (!payload.name || !payload.whatsapp || !payload.email) {
      setStatus("Completá nombre, WhatsApp y email para activar la promo.", "is-error");
      return;
    }

    button.disabled = true;
    button.textContent = "Guardando...";
    setStatus("Estamos guardando tus datos.", "");

    try {
      const result = await submitLead(payload);
      form.reset();
      setStatus(
        result.offline
          ? "Datos guardados localmente. Falta configurar GoHighLevel (External Tracking) o el endpoint de Google Sheets."
          : "Listo. Ya activaste la promo, ahora podés consultar disponibilidad.",
        result.offline ? "is-error" : "is-ok"
      );

      if (!result.offline) {
        window.setTimeout(() => {
          window.open(buildCloudbedsUrl(payload), "_blank", "noopener");
        }, 750);
      }
    } catch (error) {
      setStatus("No pudimos guardar el contacto. Probá de nuevo en unos segundos.", "is-error");
    } finally {
      button.disabled = false;
      button.textContent = "Quiero mi descuento";
    }
  });

  updateCountdown();
  window.setInterval(updateCountdown, 1000);

  // Install GoHighLevel External Tracking after the page is ready.
  // This keeps the landing self-hosted/centralized while sending leads into GHL CRM.
  installGhlExternalTracking();
})();
