// ===== Winter Arc — lógica de la app =====

import { enCambiarSesion, entrar, salir, escucharArc, subirArc } from './firebase.js';

// ---- Los 6 hábitos del arc ----
// "inverso" = menos es mejor (el móvil: objetivo MÁXIMO de horas, no mínimo)
const HABITOS = [
  { id: 'ejercicio', nombre: 'Ejercicio', def: 1 },
  { id: 'trabajo',   nombre: 'Trabajo',   def: 8 },
  { id: 'estudio',   nombre: 'Estudio',   def: 2 },
  { id: 'lectura',   nombre: 'Lectura',   def: 0.5 },
  { id: 'sueno',     nombre: 'Sueño',     def: 8 },
  { id: 'movil',     nombre: 'Móvil',     def: 6, inverso: true }
];

const UMBRAL_EXITO = 4; // con 4 hábitos el día cuenta como logrado

// ---- Estado ----

let uid = null;
let estado = { objetivos: {}, dias: {} };
let detenerEscucha = null;

// ---- Utilidades de fecha (locales, sin UTC) ----

function aISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const j = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${j}`;
}

function deISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const hoyISO = () => aISO(new Date());

function lunesDe(d) {
  const c = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const resta = (c.getDay() + 6) % 7; // lunes = 0
  c.setDate(c.getDate() - resta);
  return c;
}

function sumarDias(d, n) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

// ---- Datos de hábitos ----

function objetivoDe(id) {
  const h = HABITOS.find(x => x.id === id);
  const v = estado.objetivos[id];
  return (typeof v === 'number' && v >= 0) ? v : h.def;
}

function diaDe(iso) {
  return estado.dias[iso] || {};
}

function hechosDe(iso) {
  return HABITOS.filter(h => diaDe(iso)[h.id] === true).length;
}

function formatearHoras(v) {
  if (v === 0) return '0 h';
  if (v < 1) return `${Math.round(v * 60)} min`;
  const h = Math.floor(v);
  const min = Math.round((v - h) * 60);
  return min ? `${h} h ${min} min` : `${h} h`;
}

function textoObjetivo(h) {
  const v = formatearHoras(objetivoDe(h.id));
  return h.inverso ? `máx ${v} al día` : `mín ${v} al día`;
}

// ---- Referencias del DOM ----

const $ = (id) => document.getElementById(id);
const elLogin = $('login'), elApp = $('app');
const elTarjetas = $('tarjetas'), elContador = $('contador'), elContadorNum = $('contador-num');
const elToast = $('toast'), elFechaHoy = $('fecha-hoy');
const elMediaSemana = $('media-semana'), elMediaMes = $('media-mes');
const elGrid9 = $('grid9'), elResumen9 = $('resumen9');
const elMeses = $('meses'), elDiasCabecera = $('dias-cabecera'), elRangoArc = $('rango-arc');
const elModalFondo = $('modal-fondo'), elModalTitulo = $('modal-titulo'), elModalSub = $('modal-sub');
const elModalInput = $('modal-input'), elModalAyuda = $('modal-ayuda'), elModalHecho = $('modal-hecho');
const elModalHechoTexto = $('modal-hecho-texto');

// ---- Render ----

function renderTodo() {
  renderHoy();
  renderMedias();
  renderGrid9();
}

function renderHoy() {
  const hoy = hoyISO();
  const hechos = hechosDe(hoy);

  elContadorNum.textContent = hechos;
  elContadorNum.style.color = hechos >= UMBRAL_EXITO ? 'var(--verde)' : 'var(--texto)';

  elTarjetas.innerHTML = '';
  for (const h of HABITOS) {
    const hecha = diaDe(hoy)[h.id] === true;

    const tarjeta = document.createElement('button');
    tarjeta.className = 'tarjeta-habito' + (hecha ? ' hecha' : '');
    tarjeta.innerHTML = `
      <span class="check">✓</span>
      <span class="nombre">${h.nombre}</span>
      <span class="objetivo${h.inverso ? ' inverso' : ''}">${textoObjetivo(h)}</span>
    `;

    // Pulsar la tarjeta = marcar / desmarcar el día
    tarjeta.addEventListener('click', () => alternarHabito(h.id));

    // Botón pequeño ✎ = abrir el menú del objetivo
    const ajuste = document.createElement('button');
    ajuste.className = 'btn-objetivo';
    ajuste.textContent = '✎';
    ajuste.title = 'Cambiar objetivo';
    ajuste.addEventListener('click', (e) => {
      e.stopPropagation();
      abrirModal(h);
    });
    tarjeta.appendChild(ajuste);

    elTarjetas.appendChild(tarjeta);
  }
}

function alternarHabito(id) {
  const hoy = hoyISO();
  const antes = hechosDe(hoy);

  const dia = { ...diaDe(hoy) };
  dia[id] = !dia[id];
  estado.dias[hoy] = dia;

  const despues = hechosDe(hoy);

  subir();
  renderTodo();

  // Al cruzar el umbral: mensaje de motivación + contador iluminado 1 s
  if (antes < UMBRAL_EXITO && despues >= UMBRAL_EXITO) celebrar();
}

function celebrar() {
  elContador.classList.remove('brilla');
  void elContador.offsetWidth; // reinicia la animación
  elContador.classList.add('brilla');
  elToast.classList.add('visible');
  setTimeout(() => elToast.classList.remove('visible'), 1400);
  setTimeout(() => elContador.classList.remove('brilla'), 1000);
}

// ---- Medias semana y mes ----

// Devuelve [hechos, diasTranscurridos] de un hábito entre dos fechas (incluidas)
function contarEntre(id, desde, hasta) {
  let hechos = 0, dias = 0;
  for (let d = new Date(desde); aISO(d) <= aISO(hasta); d = sumarDias(d, 1)) {
    dias++;
    if (diaDe(aISO(d))[id] === true) hechos++;
  }
  return [hechos, dias];
}

function renderMedias() {
  const hoy = new Date();

  const lunes = lunesDe(hoy);
  const primeroDeMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  renderTablaMedias(elMediaSemana, lunes, hoy);
  renderTablaMedias(elMediaMes, primeroDeMes, hoy);
}

function renderTablaMedias(contenedor, desde, hasta) {
  contenedor.innerHTML = '';
  for (const h of HABITOS) {
    const [hechos, dias] = contarEntre(h.id, desde, hasta);
    const pct = dias ? Math.round((hechos / dias) * 100) : 0;

    const linea = document.createElement('div');
    linea.className = 'linea-media';
    linea.innerHTML = `
      <span class="nombre">${h.nombre}</span>
      <span class="barra"><span class="barra-relleno" style="width:${pct}%"></span></span>
      <span class="dato">${hechos}/${dias} · ${pct}%</span>
    `;
    contenedor.appendChild(linea);
  }
}

// ---- Grid del winter arc: 9 semanas del 1 de noviembre al 1 de enero ----

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS_SEMANA = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const FILAS_ARC = 9, COLUMNAS_ARC = 7; // 63 días: 1 nov → 2 ene (el 1 de enero incluido)

// ¿Qué arc toca mostrar? El que empieza el 1 de noviembre:
// en marcha (desde el 1-nov), el recién terminado (1-2 de enero) o el próximo.
function inicioArc() {
  const hoy = new Date();
  const novEsteAnio = new Date(hoy.getFullYear(), 10, 1);
  if (hoy >= novEsteAnio) return novEsteAnio;
  if (hoy.getMonth() === 0 && hoy.getDate() <= 2) return new Date(hoy.getFullYear() - 1, 10, 1);
  return novEsteAnio;
}

function renderGrid9() {
  const hoy = hoyISO();
  const inicio = inicioArc();
  const fin = sumarDias(inicio, FILAS_ARC * COLUMNAS_ARC - 1);
  const totalDias = FILAS_ARC * COLUMNAS_ARC;

  // Rango visible: "1 nov 2026 → 2 ene 2027"
  elRangoArc.textContent =
    `${inicio.getDate()} ${MESES[inicio.getMonth()]} ${inicio.getFullYear()} → ` +
    `${fin.getDate()} ${MESES[fin.getMonth()]} ${fin.getFullYear()}`;

  // Cabecera: el día de la semana depende del día en que caiga el 1 de noviembre
  elDiasCabecera.innerHTML = '';
  const primerDia = inicio.getDay(); // 0 = domingo
  for (let c = 0; c < COLUMNAS_ARC; c++) {
    const letra = document.createElement('span');
    letra.textContent = DIAS_SEMANA[(primerDia + c) % 7];
    elDiasCabecera.appendChild(letra);
  }

  elGrid9.innerHTML = '';
  elMeses.innerHTML = '';
  let diasTranscurridos = 0, diasLogrados = 0;

  for (let fila = 0; fila < FILAS_ARC; fila++) {
    // Etiqueta del mes a la izquierda de cada fila
    const etiqueta = document.createElement('span');
    etiqueta.textContent = MESES[sumarDias(inicio, fila * COLUMNAS_ARC).getMonth()];
    elMeses.appendChild(etiqueta);

    for (let col = 0; col < COLUMNAS_ARC; col++) {
      const fecha = sumarDias(inicio, fila * COLUMNAS_ARC + col);
      const iso = aISO(fecha);
      const n = hechosDe(iso);

      const c = document.createElement('div');
      c.className = 'circulo-dia';
      if (iso > hoy) c.classList.add('futuro');
      if (iso === hoy) c.classList.add('hoy');
      if (n >= UMBRAL_EXITO) c.classList.add('n' + Math.min(n, 6));
      c.title = `${fecha.getDate()} ${MESES[fecha.getMonth()]} · ${n} de ${HABITOS.length} hábitos`;

      if (iso <= hoy && iso >= aISO(inicio)) {
        diasTranscurridos++;
        if (n >= UMBRAL_EXITO) diasLogrados++;
      }

      elGrid9.appendChild(c);
    }
  }

  // Resumen según el momento del arc
  const parte = `Días con ${UMBRAL_EXITO}+ hábitos: <strong>${diasLogrados} de ${diasTranscurridos}</strong>`;
  if (hoy < aISO(inicio)) {
    elResumen9.innerHTML = `El arc empieza el 1 de noviembre. ${parte}`;
  } else if (hoy > aISO(fin)) {
    elResumen9.innerHTML = `Arc terminado. ${parte} de ${totalDias}`;
  } else {
    const quedan = totalDias - diasTranscurridos;
    elResumen9.innerHTML = `${parte} · quedan ${quedan} días de arc`;
  }
}

// ---- Modal de objetivo ----

let habitoModal = null;

function abrirModal(h) {
  habitoModal = h;
  elModalTitulo.textContent = h.nombre;
  elModalSub.textContent = h.inverso
    ? 'Este hábito es al revés: menos es mejor.'
    : '¿Cuánto quieres lograr cada día?';
  elModalInput.value = objetivoDe(h.id);
  elModalHecho.checked = diaDe(hoyISO())[h.id] === true;
  elModalHechoTexto.textContent = elModalHecho.checked
    ? 'Hecho hoy ✓'
    : 'Marcar como hecho hoy';
  elModalAyuda.textContent = h.inverso
    ? `Ej.: 6 = como mucho 6 h de móvil (pon ${h.def} para volver al valor por defecto).`
    : `En horas. Ej.: 0.5 = 30 min (pon ${h.def} para volver al valor por defecto).`;
  elModalFondo.classList.remove('oculto');
  elModalInput.focus();
}

function cerrarModal() {
  elModalFondo.classList.add('oculto');
  habitoModal = null;
}

function guardarModal() {
  if (!habitoModal) return;
  const h = habitoModal;

  const antes = hechosDe(hoyISO());
  const valor = parseFloat(elModalInput.value);
  if (!isNaN(valor) && valor >= 0) estado.objetivos[h.id] = valor;

  const hoy = hoyISO();
  const dia = { ...diaDe(hoy) };
  dia[h.id] = elModalHecho.checked;
  estado.dias[hoy] = dia;

  cerrarModal();
  subir();
  renderTodo();

  const despues = hechosDe(hoy);
  if (antes < UMBRAL_EXITO && despues >= UMBRAL_EXITO) celebrar();
}

// ---- Sincronización ----

function subir() {
  if (uid) subirArc(uid, estado).catch(() => marcarEstado('mal'));
}

function marcarEstado(txt) {
  const el = $('estado');
  if (txt === 'conectado') { el.className = 'estado ok'; el.title = 'Sincronizado'; }
  else { el.className = 'estado mal'; el.title = 'Sin conexión: ' + txt; }
}

// ---- Eventos ----

$('btn-entrar').addEventListener('click', () => entrar().catch(e => alert('No se pudo entrar: ' + e.message)));
$('btn-salir').addEventListener('click', () => salir());
$('modal-cancelar').addEventListener('click', cerrarModal);
$('modal-guardar').addEventListener('click', guardarModal);
elModalHecho.addEventListener('change', () => {
  elModalHechoTexto.textContent = elModalHecho.checked ? 'Hecho hoy ✓' : 'Marcar como hecho hoy';
});
elModalFondo.addEventListener('click', (e) => { if (e.target === elModalFondo) cerrarModal(); });

$('tab-hoy').addEventListener('click', () => cambiarPestana('hoy'));
$('tab-progreso').addEventListener('click', () => cambiarPestana('progreso'));

function cambiarPestana(cual) {
  $('tab-hoy').classList.toggle('activa', cual === 'hoy');
  $('tab-progreso').classList.toggle('activa', cual === 'progreso');
  $('vista-hoy').classList.toggle('oculto', cual !== 'hoy');
  $('vista-progreso').classList.toggle('oculto', cual !== 'progreso');
}

// ---- Arranque ----

elFechaHoy.textContent = new Date().toLocaleDateString('es-ES', {
  weekday: 'long', day: 'numeric', month: 'long'
});

enCambiarSesion((usuario) => {
  if (detenerEscucha) { detenerEscucha(); detenerEscucha = null; }

  if (!usuario) {
    uid = null;
    elApp.classList.add('oculto');
    elLogin.classList.remove('oculto');
    return;
  }

  uid = usuario.uid;
  elLogin.classList.add('oculto');
  elApp.classList.remove('oculto');

  detenerEscucha = escucharArc(uid, (datos) => {
    if (datos && datos.objetivos) estado.objetivos = datos.objetivos;
    if (datos && datos.dias) estado.dias = datos.dias;
    if (!datos) estado = { objetivos: {}, dias: {} };
    renderTodo();
  }, marcarEstado);
});
