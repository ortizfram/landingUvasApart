const SPREADSHEET_ID = "1E_Sz_eY4fq9VB8SDIE-E9123I5Y9ACEoQRZ4t-8hB4k";
const SHEET_NAME = "Hoja 1";

function doPost(e) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  const payload = JSON.parse(e.postData.contents || "{}");
  const utm = payload.utm ? JSON.stringify(payload.utm) : "";

  sheet.appendRow([
    payload.createdAt || new Date().toISOString(),
    payload.name || "",
    payload.whatsapp || "",
    payload.email || "",
    payload.checkin || "",
    payload.checkout || "",
    payload.guests || "",
    payload.message || "",
    payload.source || "",
    utm,
    payload.pageUrl || "",
    "Nuevo"
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: "Uvas Apart leads" }))
    .setMimeType(ContentService.MimeType.JSON);
}
