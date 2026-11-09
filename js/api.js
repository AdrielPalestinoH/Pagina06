/**
 * api.js — Helpers AJAX y constantes de endpoints
 * Sistema de Objetos Perdidos – UNIVA
 *
 * Endpoints definidos en el documento de especificación (Sección 5.1):
 *
 *  POST   /api/usuarios/identificacion          → PNT-01
 *  GET    /api/catalogos/{tipo}                 → PNT-03, PNT-05, PNT-07
 *  GET    /api/objetos?estado=&tipoObjetoId=&colorId=&otrasEtiquetaIds=  → PNT-03, PNT-05
 *  GET    /api/objetos/{id}                     → PNT-04, PNT-06, PNT-09 (detalle)
 *  POST   /api/peticiones                       → PNT-04
 *  POST   /api/objetos                          → PNT-07 (alta, multipart/form-data)
 *  PUT    /api/objetos/{id}                     → PNT-06 (edición)
 *  DELETE /api/objetos/{id}                     → PNT-06 (eliminar)
 *  GET    /api/peticiones?matricula=            → PNT-08
 *  GET    /api/peticiones/{id}                  → PNT-08 (detalle)
 *  GET    /api/peticiones/{id}/contacto-previo  → PNT-08 (reclamo de error)
 *  PUT    /api/peticiones/{id}/liberacion       → PNT-08 (liberar)
 *  GET    /api/objetos?estado=RECLAMADO         → PNT-09
 */

const API_BASE = 'http://localhost:8080';   // Cambiar por la URL real del servidor Spring Boot

const API = {
  // Usuarios
  identificacion:       `${API_BASE}/api/usuarios/identificacion`,

  // Catálogos (tipo: tiposObjeto | colores | etiquetas | modulos)
  catalogos: (tipo)  => `${API_BASE}/api/catalogos/${tipo}`,

  // Objetos
  objetos:              `${API_BASE}/api/objetos`,
  objetoDetalle: (id)=> `${API_BASE}/api/objetos/${id}`,

  // Peticiones
  peticiones:           `${API_BASE}/api/peticiones`,
  peticionDetalle:(id)=> `${API_BASE}/api/peticiones/${id}`,
  contactoPrevio: (id)=> `${API_BASE}/api/peticiones/${id}/contacto-previo`,
  liberacion:     (id)=> `${API_BASE}/api/peticiones/${id}/liberacion`,
};

/* ---------------------------------------------------------------
   Sesión: guardar y leer el usuario autenticado en sessionStorage
--------------------------------------------------------------- */
const Session = {
  set(usuario) { sessionStorage.setItem('usuario', JSON.stringify(usuario)); },
  get()        { return JSON.parse(sessionStorage.getItem('usuario') || 'null'); },
  clear()      { sessionStorage.removeItem('usuario'); },
  redirigirSiNoHaySesion() {
    if (!Session.get()) { window.location.href = raizRelativa() + 'index.html'; }
  },
  redirigirSiNoEsAdmin() {
    const u = Session.get();
    if (!u || u.rol !== 'ADMINISTRADOR') {
      window.location.href = raizRelativa() + 'index.html';
    }
  },
};

/* ---------------------------------------------------------------
   Devuelve la ruta relativa hacia la raíz del proyecto
   según la profundidad de la página actual
--------------------------------------------------------------- */
function raizRelativa() {
  const path = window.location.pathname;
  const depth = (path.match(/\//g) || []).length;
  // Heurística: si estamos en pages/xxx/archivo.html => 2 niveles
  if (path.includes('/pages/')) return '../../';
  return '';
}

/* ---------------------------------------------------------------
   Helper AJAX genérico (wrapper de $.ajax)
--------------------------------------------------------------- */
function apiCall({ url, method = 'GET', data = null, isFormData = false, success, error }) {
  const opts = {
    url,
    type: method,
    success(res) { if (success) success(res); },
    error(xhr)   { if (error) error(xhr); else alertError('Error al conectar con el servidor.'); },
  };

  if (data) {
    if (isFormData) {
      opts.data        = data;
      opts.processData = false;
      opts.contentType = false;
    } else {
      opts.data        = JSON.stringify(data);
      opts.contentType = 'application/json';
    }
  }

  $.ajax(opts);
}

/* ---------------------------------------------------------------
   Helpers de UI
--------------------------------------------------------------- */

/** Muestra un mensaje de error en un elemento .alert */
function mostrarAlerta(selector, msg, tipo = 'danger') {
  const el = $(selector);
  el.removeClass('alert-danger alert-ok alert-warn').addClass(`alert-${tipo}`).text(msg).addClass('show');
}

function ocultarAlerta(selector) { $(selector).removeClass('show'); }

/** Muestra el error global simple (alertas nativas) */
function alertError(msg) { alert('Error: ' + msg); }

/** Marca un campo con error */
function setError(inputId, msg) {
  const g = $('#' + inputId).closest('.form-group');
  g.addClass('has-error');
  g.find('.error-msg').text(msg);
}

/** Quita todos los errores del formulario */
function clearErrors(formId) {
  $('#' + formId + ' .form-group').removeClass('has-error');
}

/* ---------------------------------------------------------------
   Carga un catálogo y llena un <select>
--------------------------------------------------------------- */
function cargarCatalogo(tipo, selectId, labelVacio = 'Todos') {
  apiCall({
    url: API.catalogos(tipo),
    success(data) {
      const sel = $('#' + selectId);
      sel.empty().append(`<option value="">${labelVacio}</option>`);
      data.forEach(item => sel.append(`<option value="${item.id}">${item.nombre}</option>`));
    },
  });
}

/* ---------------------------------------------------------------
   Renderiza tarjetas de objeto en un contenedor
--------------------------------------------------------------- */
function renderObjetos(objetos, contenedorId, alClickar) {
  const cont = $('#' + contenedorId).empty();
  if (!objetos || objetos.length === 0) {
    cont.append('<p style="color:var(--muted)">No se encontraron objetos.</p>');
    return;
  }
  objetos.forEach(obj => {
    const imgHtml = obj.fotografiaUrl
      ? `<img src="${obj.fotografiaUrl}" alt="${obj.nombre}">`
      : `<div class="img-ph">Sin imagen</div>`;
    const tagsHtml = (obj.etiquetas || []).map(e => `<span class="tag">${e.nombre}</span>`).join('');
    const card = $(`
      <div class="obj-card" data-id="${obj.id}">
        ${imgHtml}
        <div class="info">
          <strong>${obj.nombre}</strong>
          <small>${obj.descripcion || ''}</small>
          ${obj.marca ? `<small>Marca: ${obj.marca}</small>` : ''}
          <div class="tags">${tagsHtml}</div>
          <small>Fecha: ${obj.fechaRegistro || '–'}<br>Lugar: ${obj.lugarPerdida || '–'}<br>Módulo: ${obj.moduloNombre || '–'}</small>
        </div>
      </div>`);
    card.on('click', () => alClickar(obj));
    cont.append(card);
  });
}
