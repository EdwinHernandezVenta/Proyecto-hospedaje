import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/http';
import { useDialog } from './AppDialog';

const CART_KEY = 'paie_cart_cliente';

function leerCarrito() {
  try {
    const value = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function contarProductosCarrito() {
  return leerCarrito().reduce((sum, item) => sum + Math.max(1, Number(item.cantidad || 1)), 0);
}

function guardarCarrito(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('paie-cart-update', { detail: { items } }));
}

function agregarPaqueteAlCarrito(paquete) {
  const items = leerCarrito();
  const existente = items.find(
    (item) =>
      item.tipo === 'paquete' &&
      Number(item.id) === Number(paquete.id)
  );

  if (existente) {
    existente.cantidad =
      Number(existente.cantidad || 1) + 1;
    existente.nombre = paquete.nombre;
    existente.precio = Number(paquete.precio || 0);
    existente.servicios_incluidos =
      paquete.servicios_incluidos ??
      existente.servicios_incluidos ??
      null;
  } else {
    items.push({
      tipo: 'paquete',
      id: Number(paquete.id),
      nombre: paquete.nombre,
      precio: Number(paquete.precio || 0),
      cantidad: 1,
      servicios_incluidos:
        paquete.servicios_incluidos ?? null
    });
  }

  guardarCarrito(items);
}

function normalizarImagenes(valor) {
  if (Array.isArray(valor)) return valor;
  if (!valor) return [];

  if (typeof valor === 'string') {
    try {
      const parsed = JSON.parse(valor);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function urlImagen(archivo) {
  if (!archivo) return '';
  return `/api/v1/paquetes/imagenes/${encodeURIComponent(archivo)}`;
}

function precio(valor) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) return 'Consultar';

  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(numero);
}

function listaServicios(valor) {
  if (Array.isArray(valor)) return valor;
  if (!valor) return [];

  try {
    const parsed = JSON.parse(valor);
    if (Array.isArray(parsed)) return parsed;
  } catch {}

  return String(valor)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function TarjetaPaquete({ paquete, seleccionado, onSeleccionar, onVer, onAgregar }) {
  const imagenes = useMemo(
    () => normalizarImagenes(paquete.imagenes),
    [paquete.imagenes]
  );

  const [indice, setIndice] = useState(0);
  const imagenActual = imagenes[indice] || null;

  useEffect(() => setIndice(0), [paquete.id, imagenes.length]);

  function mover(event, siguiente) {
    event.stopPropagation();

    if (imagenes.length < 2) return;

    setIndice((actual) =>
      siguiente
        ? (actual === imagenes.length - 1 ? 0 : actual + 1)
        : (actual === 0 ? imagenes.length - 1 : actual - 1)
    );
  }

  return (
    <article
      style={{
        overflow: 'hidden',
        borderRadius: '18px',
        border: seleccionado
          ? '1px solid rgba(229,193,88,.95)'
          : '1px solid rgba(212,175,55,.22)',
        background: 'linear-gradient(145deg, rgba(16,21,35,.98), rgba(7,10,20,.98))',
        boxShadow: seleccionado
          ? '0 18px 42px rgba(229,193,88,.12)'
          : '0 16px 38px rgba(0,0,0,.24)'
      }}
    >
      <div
        style={{
          position: 'relative',
          height: '270px',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(229,193,88,.14), rgba(15,23,42,.95))'
        }}
      >
        {imagenActual ? (
          <img
            src={urlImagen(imagenActual.archivo)}
            alt={paquete.nombre || 'Paquete'}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block'
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,.68)'
            }}
          >
            Sin fotografías disponibles
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,.75), transparent 48%)',
            pointerEvents: 'none'
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: '14px',
            left: '14px',
            display: 'flex',
            gap: '7px',
            flexWrap: 'wrap'
          }}
        >
          {paquete.destino && (
            <span
              style={{
                padding: '7px 11px',
                borderRadius: '999px',
                background: 'rgba(7,10,20,.78)',
                border: '1px solid rgba(255,255,255,.15)',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 700
              }}
            >
              {paquete.destino}
            </span>
          )}

          {paquete.tipo_viaje && (
            <span
              style={{
                padding: '7px 11px',
                borderRadius: '999px',
                background: 'rgba(7,10,20,.78)',
                border: '1px solid rgba(255,255,255,.15)',
                color: '#e5c158',
                fontSize: '12px',
                fontWeight: 700
              }}
            >
              {paquete.tipo_viaje}
            </span>
          )}
        </div>

        {imagenes.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => mover(e, false)}
              aria-label="Fotografía anterior"
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                border: '1px solid rgba(255,255,255,.25)',
                background: 'rgba(7,10,20,.68)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '22px'
              }}
            >
              ‹
            </button>

            <button
              type="button"
              onClick={(e) => mover(e, true)}
              aria-label="Siguiente fotografía"
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                border: '1px solid rgba(255,255,255,.25)',
                background: 'rgba(7,10,20,.68)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '22px'
              }}
            >
              ›
            </button>
          </>
        )}
      </div>

      <div style={{ padding: '18px 18px 20px' }}>
        <h2
          style={{
            margin: '0 0 8px',
            color: '#fff',
            fontSize: '20px'
          }}
        >
          {paquete.nombre || 'Paquete'}
        </h2>

        {paquete.descripcion && (
          <p
            style={{
              margin: '0 0 14px',
              color: 'rgba(255,255,255,.72)',
              fontSize: '14px',
              lineHeight: 1.55,
              minHeight: '66px'
            }}
          >
            {paquete.descripcion}
          </p>
        )}

        <div
          style={{
            color: '#e5c158',
            fontWeight: 800,
            fontSize: '15px',
            marginBottom: '14px'
          }}
        >
          {precio(paquete.precio)}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px'
          }}
        >
          <button
            type="button"
            onClick={() => onVer(paquete)}
            style={{
              minHeight: '44px',
              border: '1px solid rgba(229,193,88,.8)',
              borderRadius: '11px',
              background: '#e5c158',
              color: '#090d18',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Ver detalles
          </button>

          <button
            type="button"
            onClick={() => onAgregar(paquete)}
            style={{
              minHeight: '44px',
              border: '1px solid rgba(255,255,255,.16)',
              borderRadius: '11px',
              background: 'rgba(255,255,255,.05)',
              color: '#fff',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Agregar al carrito
          </button>
        </div>

        <button
          type="button"
          onClick={() => onSeleccionar(paquete)}
          style={{
            width: '100%',
            minHeight: '42px',
            marginTop: '8px',
            border: seleccionado
              ? '1px solid #e5c158'
              : '1px solid rgba(255,255,255,.12)',
            borderRadius: '10px',
            background: seleccionado
              ? 'rgba(229,193,88,.10)'
              : 'transparent',
            color: seleccionado
              ? '#e5c158'
              : 'rgba(255,255,255,.75)',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          {seleccionado
            ? 'Quitar de comparación'
            : 'Seleccionar para comparar'}
        </button>
      </div>
    </article>
  );
}

/* =========================================================
   MODAL DE DETALLES
   Mismo estilo visual de ServiciosCliente.jsx
   ========================================================= */

function ModalPaquete({
  paquete,
  onCerrar,
  onSeleccionar,
  seleccionado,
  onAgregar
}) {
  const imagenes = useMemo(
    () => normalizarImagenes(paquete?.imagenes),
    [paquete]
  );

  const servicios = useMemo(
    () => listaServicios(paquete?.servicios_incluidos),
    [paquete]
  );

  const [indice, setIndice] = useState(0);

  useEffect(() => {
    setIndice(0);
  }, [paquete?.id, imagenes.length]);

  useEffect(() => {
    const cerrar = (event) => {
      if (event.key === 'Escape') onCerrar();
    };

    window.addEventListener('keydown', cerrar);

    return () => window.removeEventListener('keydown', cerrar);
  }, [onCerrar]);

  if (!paquete) return null;

  const imagen = imagenes[indice] || null;

  function mover(siguiente) {
    if (imagenes.length < 2) return;

    setIndice((actual) =>
      siguiente
        ? (actual === imagenes.length - 1 ? 0 : actual + 1)
        : (actual === 0 ? imagenes.length - 1 : actual - 1)
    );
  }

  const etiqueta = {
    padding: '7px 11px',
    borderRadius: '999px',
    background: 'rgba(7,10,20,.78)',
    border: '1px solid rgba(255,255,255,.15)',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 700,
    backdropFilter: 'blur(8px)'
  };

  const botonDorado = {
    minHeight: '44px',
    border: '1px solid rgba(229,193,88,.8)',
    borderRadius: '11px',
    background: '#e5c158',
    color: '#090d18',
    fontWeight: 800,
    cursor: 'pointer'
  };

  const botonOscuro = {
    minHeight: '44px',
    border: '1px solid rgba(255,255,255,.16)',
    borderRadius: '11px',
    background: 'rgba(255,255,255,.05)',
    color: '#fff',
    fontWeight: 800,
    cursor: 'pointer'
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="paquete-modal-titulo"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'rgba(0,0,0,.78)',
        backdropFilter: 'blur(8px)'
      }}
    >
      <div
        style={{
          width: 'min(1040px,100%)',
          maxHeight: '92vh',
          overflow: 'auto',
          borderRadius: '20px',
          border: '1px solid rgba(229,193,88,.28)',
          background: 'linear-gradient(145deg,#101523,#070a14)',
          boxShadow: '0 30px 80px rgba(0,0,0,.55)'
        }}
      >
        <div
          style={{
            position: 'relative',
            height: 'min(430px,42vh)',
            minHeight: '300px',
            overflow: 'hidden',
            background: '#090d18',
            borderRadius: '20px 20px 0 0'
          }}
        >
          {imagen ? (
            <img
              src={urlImagen(imagen.archivo)}
              alt={paquete.nombre || 'Paquete'}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block'
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,.6)'
              }}
            >
              Sin fotografías disponibles
            </div>
          )}

          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(to top,rgba(2,5,14,.92),rgba(2,5,14,.04) 68%)',
              pointerEvents: 'none'
            }}
          />

          <div
            style={{
              position: 'absolute',
              top: '18px',
              left: '18px',
              display: 'flex',
              gap: '7px',
              flexWrap: 'wrap'
            }}
          >
            {paquete.destino && (
              <span style={etiqueta}>
                {paquete.destino}
              </span>
            )}

            {paquete.tipo_viaje && (
              <span
                style={{
                  ...etiqueta,
                  color: '#e5c158'
                }}
              >
                {paquete.tipo_viaje}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar información del paquete"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,.2)',
              background: 'rgba(7,10,20,.72)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '22px'
            }}
          >
            ×
          </button>

          {imagenes.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => mover(false)}
                aria-label="Fotografía anterior"
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,.25)',
                  background: 'rgba(7,10,20,.68)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '24px'
                }}
              >
                ‹
              </button>

              <button
                type="button"
                onClick={() => mover(true)}
                aria-label="Siguiente fotografía"
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,.25)',
                  background: 'rgba(7,10,20,.68)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '24px'
                }}
              >
                ›
              </button>

              <span
                style={{
                  position: 'absolute',
                  right: '18px',
                  bottom: '18px',
                  padding: '6px 10px',
                  borderRadius: '999px',
                  background: 'rgba(7,10,20,.78)',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 700
                }}
              >
                {indice + 1} / {imagenes.length}
              </span>
            </>
          )}
        </div>

        <div style={{ padding: '28px 26px 24px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '20px',
              flexWrap: 'wrap'
            }}
          >
            <div>
              <h2
                id="paquete-modal-titulo"
                style={{
                  margin: '7px 0 0',
                  color: '#fff',
                  fontSize: '30px',
                  lineHeight: 1.2
                }}
              >
                {paquete.nombre || 'Paquete'}
              </h2>
            </div>

            <div
              style={{
                padding: '10px 14px',
                borderRadius: '11px',
                background: 'rgba(229,193,88,.08)',
                border: '1px solid rgba(229,193,88,.18)'
              }}
            >
              <div
                style={{
                  color: 'rgba(255,255,255,.58)',
                  fontSize: '11px',
                  marginBottom: '3px'
                }}
              >
                Precio del paquete
              </div>

              <strong
                style={{
                  color: '#e5c158',
                  fontSize: '20px'
                }}
              >
                {precio(paquete.precio)}
              </strong>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
              gap: '12px',
              marginTop: '22px'
            }}
          >
            <div
              style={{
                padding: '14px',
                borderRadius: '11px',
                background: 'rgba(255,255,255,.045)',
                border: '1px solid rgba(255,255,255,.08)'
              }}
            >
              <div
                style={{
                  color: 'rgba(255,255,255,.5)',
                  fontSize: '11px',
                  marginBottom: '5px'
                }}
              >
                Destino
              </div>

              <div
                style={{
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 700
                }}
              >
                {paquete.destino || 'No especificado'}
              </div>
            </div>

            <div
              style={{
                padding: '14px',
                borderRadius: '11px',
                background: 'rgba(255,255,255,.045)',
                border: '1px solid rgba(255,255,255,.08)'
              }}
            >
              <div
                style={{
                  color: 'rgba(255,255,255,.5)',
                  fontSize: '11px',
                  marginBottom: '5px'
                }}
              >
                Tipo de viaje
              </div>

              <div
                style={{
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 700
                }}
              >
                {paquete.tipo_viaje || 'No especificado'}
              </div>
            </div>
          </div>

          {paquete.descripcion && (
            <div style={{ marginTop: '22px' }}>
              <h3
                style={{
                  margin: '0 0 9px',
                  color: '#fff',
                  fontSize: '15px'
                }}
              >
                Descripción
              </h3>

              <p
                style={{
                  margin: 0,
                  color: 'rgba(255,255,255,.72)',
                  fontSize: '14px',
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap'
                }}
              >
                {paquete.descripcion}
              </p>
            </div>
          )}

          {paquete.itinerario && (
            <div style={{ marginTop: '22px' }}>
              <h3
                style={{
                  margin: '0 0 9px',
                  color: '#fff',
                  fontSize: '15px'
                }}
              >
                Itinerario
              </h3>

              <p
                style={{
                  margin: 0,
                  color: 'rgba(255,255,255,.72)',
                  fontSize: '14px',
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap'
                }}
              >
                {paquete.itinerario}
              </p>
            </div>
          )}

          {servicios.length > 0 && (
            <div style={{ marginTop: '22px' }}>
              <h3
                style={{
                  margin: '0 0 9px',
                  color: '#fff',
                  fontSize: '15px'
                }}
              >
                Servicios incluidos
              </h3>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '7px'
                }}
              >
                {servicios.map((item, index) => (
                  <span
                    key={`${item}-${index}`}
                    style={{
                      padding: '7px 10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(229,193,88,.18)',
                      background: 'rgba(229,193,88,.07)',
                      color: 'rgba(255,255,255,.8)',
                      fontSize: '12px'
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {paquete.condiciones && (
            <div style={{ marginTop: '22px' }}>
              <h3
                style={{
                  margin: '0 0 9px',
                  color: '#fff',
                  fontSize: '15px'
                }}
              >
                Condiciones
              </h3>

              <p
                style={{
                  margin: 0,
                  color: 'rgba(255,255,255,.62)',
                  fontSize: '13px',
                  lineHeight: 1.65,
                  whiteSpace: 'pre-wrap'
                }}
              >
                {paquete.condiciones}
              </p>
            </div>
          )}

          {imagenes.length > 1 && (
            <div
              style={{
                display: 'flex',
                gap: '7px',
                marginTop: '22px',
                overflowX: 'auto'
              }}
            >
              {imagenes.map((item, i) => (
                <button
                  key={item.id || item.archivo || i}
                  type="button"
                  onClick={() => setIndice(i)}
                  aria-label={`Ver fotografía ${i + 1}`}
                  style={{
                    flex: '0 0 60px',
                    height: '44px',
                    padding: 0,
                    borderRadius: '7px',
                    overflow: 'hidden',
                    border:
                      i === indice
                        ? '2px solid #e5c158'
                        : '1px solid rgba(255,255,255,.14)',
                    background: 'transparent',
                    cursor: 'pointer'
                  }}
                >
                  <img
                    src={urlImagen(item.archivo)}
                    alt=""
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                  />
                </button>
              ))}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              flexWrap: 'wrap',
              marginTop: '26px'
            }}
          >
            <button
              type="button"
              onClick={onCerrar}
              style={{
                ...botonOscuro,
                padding: '0 20px'
              }}
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={() => onSeleccionar(paquete)}
              style={{
                ...botonOscuro,
                padding: '0 20px',
                border: seleccionado
                  ? '1px solid #e5c158'
                  : '1px solid rgba(255,255,255,.16)',
                background: seleccionado
                  ? 'rgba(229,193,88,.12)'
                  : 'rgba(255,255,255,.05)',
                color: seleccionado ? '#e5c158' : '#fff'
              }}
            >
              {seleccionado
                ? 'Quitar de comparación'
                : 'Comparar'}
            </button>

            <button
              type="button"
              onClick={() => onAgregar(paquete)}
              style={{
                ...botonDorado,
                padding: '0 22px'
              }}
            >
              Agregar al carrito
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaquetesCliente() {
  const { notify } = useDialog();
  const navigate = useNavigate();

  const [paquetes, setPaquetes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [destino, setDestino] = useState('');
  const [tipoViaje, setTipoViaje] = useState('');
  const [precioMinimo, setPrecioMinimo] = useState('');
  const [precioMaximo, setPrecioMaximo] = useState('');
  const [incluye, setIncluye] = useState('');
  const [ordenar, setOrdenar] = useState('recientes');
  const [loading, setLoading] = useState(true);
  const [seleccionados, setSeleccionados] = useState([]);
  const [detalle, setDetalle] = useState(null);
  const [cantidadCarrito, setCantidadCarrito] = useState(() => contarProductosCarrito());
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [destinos, setDestinos] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [elementosPorPagina, setElementosPorPagina] = useState(6);
  const gridRef = useRef(null);
  const FILAS_POR_PAGINA = 2;
  const ANCHO_MINIMO_TARJETA = 290;
  const ESPACIO_ENTRE_TARJETAS = 20;

  useEffect(() => {
    function calcularElementosPorPagina() {
      const grid = gridRef.current;
      if (!grid) return;

      const anchoDisponible = grid.clientWidth;
      if (!anchoDisponible) return;

      const columnas = Math.max(
        1,
        Math.floor(
          (anchoDisponible + ESPACIO_ENTRE_TARJETAS) /
            (ANCHO_MINIMO_TARJETA + ESPACIO_ENTRE_TARJETAS)
        )
      );

      const nuevoLimite = columnas * FILAS_POR_PAGINA;
      setElementosPorPagina((actual) =>
        actual === nuevoLimite ? actual : nuevoLimite
      );
    }

    calcularElementosPorPagina();

    const grid = gridRef.current;
    if (!grid) return undefined;

    const observer = new ResizeObserver(calcularElementosPorPagina);
    observer.observe(grid);
    window.addEventListener('resize', calcularElementosPorPagina);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', calcularElementosPorPagina);
    };
  }, []);

  useEffect(() => {
    setPagina(1);
  }, [elementosPorPagina]);

  useEffect(() => {
    const actualizar = () => setCantidadCarrito(contarProductosCarrito());

    window.addEventListener('paie-cart-update', actualizar);

    return () => window.removeEventListener('paie-cart-update', actualizar);
  }, []);

  const totalPaginas = Math.max(1, Math.ceil(total / elementosPorPagina));

  function cambiarPagina(nuevaPagina) {
    setPagina(Math.min(Math.max(1, nuevaPagina), totalPaginas));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function agregarAlCarrito(paquete) {
    agregarPaqueteAlCarrito(paquete);
    setCantidadCarrito(contarProductosCarrito());

    notify('Paquete agregado al carrito.', {
      type: 'success',
      title: 'Carrito actualizado'
    });
  }

  async function cargarPaquetes() {
    try {
      setLoading(true);

      const response = await api.get('/paquetes', {
        params: {
          search: busqueda,
          destino,
          tipo_viaje: tipoViaje,
          precio_min: precioMinimo || undefined,
          precio_max: precioMaximo || undefined,
          incluye: incluye || undefined,
          ordenar,
          page: pagina,
          limit: elementosPorPagina
        }
      });

      const filas = Array.isArray(response.data?.rows)
        ? response.data.rows
        : [];

      const totalActual = Number(response.data?.total || 0);
      setTotal(totalActual);
      const paginasActuales = Math.max(1, Math.ceil(totalActual / elementosPorPagina));
      if (pagina > paginasActuales) setPagina(paginasActuales);
      setDestinos(Array.isArray(response.data?.destinos) ? response.data.destinos : []);
      setTipos(Array.isArray(response.data?.tipos) ? response.data.tipos : []);

      const paquetesConImagenes = await Promise.all(
        filas.map(async (paquete) => {
          try {
            const imagenesResponse = await api.get(
              `/paquetes/${paquete.id}/imagenes`
            );

            return {
              ...paquete,
              imagenes: Array.isArray(imagenesResponse.data?.imagenes)
                ? imagenesResponse.data.imagenes
                : []
            };
          } catch {
            return {
              ...paquete,
              imagenes: []
            };
          }
        })
      );

      setPaquetes(paquetesConImagenes);
    } catch (error) {
      setPaquetes([]);

      notify(
        error.response?.data?.message ||
          'No se pudieron cargar los paquetes.',
        {
          type: 'error',
          title: 'No se pudieron cargar los paquetes'
        }
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { setPagina(1); }, [busqueda, destino, tipoViaje, precioMinimo, precioMaximo, incluye, ordenar]);

  useEffect(() => {
    cargarPaquetes();
  }, [busqueda, destino, tipoViaje, precioMinimo, precioMaximo, incluye, ordenar, pagina, elementosPorPagina]);

  useEffect(() => {
    const actualizar = (event) => {
      if (event.detail?.type === 'data_changed') {
        cargarPaquetes();
      }
    };

    window.addEventListener('paie-realtime-update', actualizar);

    return () =>
      window.removeEventListener('paie-realtime-update', actualizar);
  }, [busqueda, destino, tipoViaje, precioMinimo, precioMaximo, incluye, ordenar, pagina, elementosPorPagina]);

  function limpiarFiltros() {
    setBusqueda('');
    setDestino('');
    setTipoViaje('');
    setPrecioMinimo('');
    setPrecioMaximo('');
    setIncluye('');
    setOrdenar('recientes');
    setPagina(1);
  }

  function alternarSeleccion(paquete) {
    setSeleccionados((actuales) =>
      actuales.some(
        (item) => Number(item.id) === Number(paquete.id)
      )
        ? actuales.filter(
            (item) => Number(item.id) !== Number(paquete.id)
          )
        : [...actuales, paquete]
    );
  }


  return (
    <section className="module-page">
      <div className="module-header">
        <div className="page-title">
          <div className="module-kicker">
            PAIE ROYALE · PAQUETES
          </div>

          <h1>Paquetes turísticos</h1>

          <p>
            Explora nuestros paquetes, consulta sus detalles,
            compáralos y agrégalos a tu carrito.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/reservas')}
          style={{
            minHeight: '44px',
            padding: '0 16px',
            borderRadius: '10px',
            border: '1px solid rgba(229,193,88,.7)',
            background: 'rgba(229,193,88,.12)',
            color: '#e5c158',
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          Carrito ({cantidadCarrito})
        </button>
      </div>

      <div
        className="card"
        style={{
          padding: '18px',
          marginBottom: '20px'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px'
          }}
        >
          <div className="module-search" style={{ width: '100%', minWidth: 0 }}>
            <span className="module-search-icon" aria-hidden="true">⌕</span>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o información..."
              aria-label="Buscar paquetes"
            />
            {busqueda && <button type="button" className="module-search-clear" onClick={() => setBusqueda('')} aria-label="Limpiar búsqueda">×</button>}
          </div>

          <select
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
          >
            <option value="">Todos los destinos</option>

            {destinos.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={tipoViaje}
            onChange={(e) => setTipoViaje(e.target.value)}
          >
            <option value="">Todos los tipos</option>

            {tipos.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <input
            type="number"
            min="0"
            value={precioMinimo}
            onChange={(e) => setPrecioMinimo(e.target.value)}
            placeholder="Precio mínimo"
          />

          <input
            type="number"
            min="0"
            value={precioMaximo}
            onChange={(e) => setPrecioMaximo(e.target.value)}
            placeholder="Precio máximo"
          />

          <select
            value={incluye}
            onChange={(e) => setIncluye(e.target.value)}
          >
            <option value="">¿Qué incluye?</option>
            <option value="servicios">Con servicios</option>
            <option value="habitacion">Con habitación</option>
          </select>

          <select
            value={ordenar}
            onChange={(e) => setOrdenar(e.target.value)}
          >
            <option value="recientes">Más recientes</option>
            <option value="precio_asc">Precio: menor a mayor</option>
            <option value="precio_desc">Precio: mayor a menor</option>
            <option value="nombre">Nombre: A-Z</option>
          </select>

          <button
            type="button"
            className="secondary"
            onClick={limpiarFiltros}
            style={{ minHeight: '42px' }}
          >
            Limpiar filtros
          </button>
        </div>

        <div
          style={{
            marginTop: '10px',
            color: 'var(--muted)',
            fontSize: '12px'
          }}
        >
          Los paquetes mostrados ya cumplen con disponibilidad y estado activo.
        </div>
      </div>

      {seleccionados.length > 0 && (
        <div
          className="card"
          style={{
            padding: '18px',
            marginBottom: '20px',
            border: '1px solid rgba(229,193,88,.3)'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap'
            }}
          >
            <div>
              <strong style={{ color: '#fff' }}>
                {seleccionados.length} paquete(s)
                seleccionado(s)
              </strong>

              <div
                style={{
                  color: 'var(--muted)',
                  marginTop: '4px',
                  fontSize: '13px'
                }}
              >
                Puedes comparar hasta 3 paquetes.
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap'
              }}
            >
              <button
                type="button"
                className="secondary"
                onClick={() => setSeleccionados([])}
              >
                Limpiar selección
              </button>

              {seleccionados.length >= 2 && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    setDetalle({
                      __comparar: seleccionados
                    })
                  }
                >
                  Comparar seleccionados
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div
          className="card"
          style={{
            padding: '34px',
            textAlign: 'center'
          }}
        >
          Cargando paquetes...
        </div>
      ) : paquetes.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '34px',
            textAlign: 'center'
          }}
        >
          No hay paquetes disponibles para mostrar.
        </div>
      ) : (
        <div
          ref={gridRef}
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(290px, 1fr))',
            gap: '20px'
          }}
        >
          {paquetes.map((paquete) => (
            <TarjetaPaquete
              key={paquete.id}
              paquete={paquete}
              seleccionado={seleccionados.some(
                (item) =>
                  Number(item.id) === Number(paquete.id)
              )}
              onSeleccionar={alternarSeleccion}
              onVer={setDetalle}
              onAgregar={agregarAlCarrito}
            />
          ))}
        </div>
      )}

      {detalle && detalle.__comparar ? (
        <div
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setDetalle(null);
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: 'rgba(0,0,0,.78)',
            backdropFilter: 'blur(7px)'
          }}
        >
          <div
            style={{
              width: 'min(1100px,100%)',
              maxHeight: '90vh',
              overflow: 'auto',
              borderRadius: '20px',
              border: '1px solid rgba(229,193,88,.28)',
              background:
                'linear-gradient(145deg,#101523,#070a14)',
              padding: '28px'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <div>
                <div
                  style={{
                    color: '#e5c158',
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '.16em'
                  }}
                >
                  COMPARACIÓN
                </div>

                <h2
                  style={{
                    color: '#fff',
                    margin: '6px 0'
                  }}
                >
                  Paquetes seleccionados
                </h2>
              </div>

              <button
                type="button"
                className="secondary"
                onClick={() => setDetalle(null)}
              >
                Cerrar
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(
                  detalle.__comparar.length,
                  3
                )}, minmax(0,1fr))`,
                gap: '14px',
                marginTop: '20px'
              }}
            >
              {detalle.__comparar
                .slice(0, 3)
                .map((p) => (
                  <div
                    key={p.id}
                    style={{
                      border:
                        '1px solid rgba(255,255,255,.1)',
                      borderRadius: '14px',
                      padding: '18px',
                      background:
                        'rgba(255,255,255,.035)'
                    }}
                  >
                    <h3
                      style={{
                        color: '#fff',
                        marginTop: 0
                      }}
                    >
                      {p.nombre}
                    </h3>

                    <div
                      style={{
                        color: '#e5c158',
                        fontWeight: 800
                      }}
                    >
                      {precio(p.precio)}
                    </div>

                    <p
                      style={{
                        color: 'rgba(255,255,255,.68)',
                        lineHeight: 1.6
                      }}
                    >
                      {p.descripcion ||
                        'Sin descripción.'}
                    </p>

                    <p
                      style={{
                        color: 'rgba(255,255,255,.68)'
                      }}
                    >
                      <strong>Destino:</strong>{' '}
                      {p.destino || '—'}
                    </p>

                    <p
                      style={{
                        color: 'rgba(255,255,255,.68)'
                      }}
                    >
                      <strong>Tipo:</strong>{' '}
                      {p.tipo_viaje || '—'}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        agregarAlCarrito(p)
                      }
                      style={{
                        width: '100%',
                        minHeight: '44px',
                        borderRadius: '10px',
                        border:
                          '1px solid rgba(229,193,88,.8)',
                        background: '#e5c158',
                        color: '#090d18',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      Agregar al carrito
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : (
        detalle && (
          <ModalPaquete
            paquete={detalle}
            onCerrar={() => setDetalle(null)}
            onSeleccionar={alternarSeleccion}
            seleccionado={seleccionados.some(
              (item) =>
                Number(item.id) === Number(detalle.id)
            )}
            onAgregar={agregarAlCarrito}
          />
        )
      )}

      {!loading && total > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '28px', padding: '14px', borderRadius: '14px', border: '1px solid rgba(229,193,88,.16)', background: 'rgba(8,12,22,.72)' }}>
          <button type="button" onClick={() => cambiarPagina(pagina - 1)} disabled={pagina === 1} style={{ minHeight: '42px', padding: '0 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,.14)', background: pagina === 1 ? 'rgba(255,255,255,.025)' : 'rgba(255,255,255,.05)', color: pagina === 1 ? 'rgba(255,255,255,.3)' : '#fff', fontWeight: 800, cursor: pagina === 1 ? 'not-allowed' : 'pointer' }}>Anterior</button>
          <div style={{ minWidth: '150px', textAlign: 'center', color: '#fff', fontSize: '13px', fontWeight: 700 }}>Página {pagina} de {totalPaginas}</div>
          <button type="button" onClick={() => cambiarPagina(pagina + 1)} disabled={pagina === totalPaginas} style={{ minHeight: '42px', padding: '0 16px', borderRadius: '10px', border: '1px solid rgba(229,193,88,.55)', background: pagina === totalPaginas ? 'rgba(229,193,88,.04)' : 'rgba(229,193,88,.12)', color: pagina === totalPaginas ? 'rgba(229,193,88,.35)' : '#e5c158', fontWeight: 800, cursor: pagina === totalPaginas ? 'not-allowed' : 'pointer' }}>Siguiente</button>
        </div>
      )}    </section>
  );
}