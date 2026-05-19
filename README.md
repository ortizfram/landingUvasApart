# Uvas Apart Hotel landing

Landing estática pensada para GitHub Pages, con formulario de descuento y redirección al motor oficial de Cloudbeds.

## Publicación en GitHub Pages

1. Crear un repositorio en GitHub, por ejemplo `uvas-apart-landing`.
2. Subir estos archivos al branch `main`.
3. En GitHub: `Settings > Pages > Build and deployment`.
4. Seleccionar `Deploy from a branch`, branch `main`, carpeta `/root`.
5. Guardar y esperar la URL pública de GitHub Pages.

## Conexión con Google Sheets

La planilla de leads es:

https://docs.google.com/spreadsheets/d/1E_Sz_eY4fq9VB8SDIE-E9123I5Y9ACEoQRZ4t-8hB4k/edit

Pasos para activar el guardado real:

1. Abrir https://script.google.com/ y crear un proyecto nuevo.
2. Pegar el contenido de `apps-script.gs`.
3. Guardar el proyecto.
4. Ir a `Deploy > New deployment`.
5. Elegir tipo `Web app`.
6. Ejecutar como `Me`.
7. Acceso: `Anyone`.
8. Copiar la URL del web app.
9. Pegar esa URL en `config.js`, en `window.UVAS_LEADS_ENDPOINT`.

Mientras `window.UVAS_LEADS_ENDPOINT` esté vacío, el formulario no envía a Sheets.

## GoHighLevel (recomendado)

Si querés capturar los contactos en GoHighLevel de forma centralizada (CRM + workflows), usá External Tracking.

1. En GoHighLevel: `Settings -> External Tracking -> Copy Script`.
2. En `config.js`, completar:
   - `window.UVAS_GHL_EXTERNAL_TRACKING_SRC`
   - `window.UVAS_GHL_TRACKING_ID`

El script detecta el `<form>` y guarda los leads en GoHighLevel sin necesidad de endpoint propio. (No sirve con forms en iframe; este sitio usa un `<form>` real.)

## Cloudbeds

El motor oficial configurado es:

https://hotels.cloudbeds.com/reservation/PwLRQb?currency=ARS

Después de guardar un lead correctamente, la landing abre Cloudbeds en una pestaña nueva con fechas y cantidad de personas si el visitante las completó.
