# Uvas Apart Hotel landing

Landing estatica pensada para GitHub Pages, con formulario de descuento y redireccion al motor oficial de Cloudbeds.

## Publicacion en GitHub Pages

1. Crear un repositorio en GitHub, por ejemplo `uvas-apart-landing`.
2. Subir estos archivos al branch `main`.
3. En GitHub: `Settings > Pages > Build and deployment`.
4. Seleccionar `Deploy from a branch`, branch `main`, carpeta `/root`.
5. Guardar y esperar la URL publica de GitHub Pages.

## Conexion con Google Sheets

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

Mientras `window.UVAS_LEADS_ENDPOINT` este vacio, el formulario no envia a Sheets.

## Cloudbeds

El motor oficial configurado es:

https://hotels.cloudbeds.com/reservation/PwLRQb?currency=ARS

Despues de guardar un lead correctamente, la landing abre Cloudbeds en una pestana nueva con la cantidad de personas si el visitante la completo.
