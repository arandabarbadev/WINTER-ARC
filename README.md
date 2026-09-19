# WINTER-ARC ❄️

Web para seguir el **winter arc** de hábitos diarios: ejercicio, trabajo, estudio, lectura, sueño y móvil (el móvil al revés: menos es mejor).

## Qué hace

- **Login con Google** — cada uno ve solo sus datos (Firebase Auth).
- **Vista Hoy**: 6 botones de hábitos; pulsar marca el día como hecho. El botón ✎ de cada hábito abre su menú de objetivo (ej. sueño 8 h, móvil máx 6 h).
- **Al llegar a 4 hábitos** en el día: mensaje de motivación *«El camino al éxito está lleno de errores.»* y el contador se ilumina 1 segundo.
- **Medias**: cumplimiento de cada hábito en la semana y en el mes.
- **Grid de 9 semanas × 7 días**: circulitos verdes los días con 4+ hábitos, grises los que no.
- **Datos en Firebase** (Firestore), guardado por día.
- **PWA instalable**: en el móvil, "Añadir a pantalla de inicio" y se abre como una app con su icono.

## Técnica

HTML + CSS + JavaScript puro, sin frameworks. Firebase v11 por CDN (mismo proyecto que deberes / examenes / notas / mi-semana). Service worker para abrir sin conexión. Iconos generados con `generar-iconos.ps1`.

---
Por [arandabarbadev](https://github.com/arandabarbadev)
