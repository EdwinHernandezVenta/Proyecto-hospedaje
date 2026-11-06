import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDialog } from './AppDialog';
import { api } from '../api/http';

function normalizarImagenes(valor) {
  if (Array.isArray(valor)) return valor;
  if (!valor) return [];
  if (typeof valor === 'string') {
    try {
      const parseado = JSON.parse(valor);
      return Array.isArray(parseado) ? parseado : [];
    } catch {
      return [];
    }
  }
  return [];
}

function urlImagen(archivo) {
  if (!archivo) return '';
  return `/api/v1/habitaciones/imagenes/${encodeURIComponent(archivo)}`;
}

function formatearPrecio(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return 'Consultar';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(numero);
}

function obtenerComodidades(valor) {
  if (!valor) return [];
  return String(valor)
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizarEstado(valor) {
  return String(valor ?? '').trim().toLowerCase();
}

const estilos = {
  tarjeta: {
    overflow: 'hidden',
    borderRadius: '18px',
    border: '1px solid rgba(212,175,55,.22)',
    background: 'linear-gradient(145deg,rgba(16,21,35,.98),rgba(7,10,20,.98))',
    boxShadow: '0 16px 38px rgba(0,0,0,.24)'
  },
  botonDorado: {
    minHeight: '44px',
    border: '1px solid rgba(229,193,88,.8)',
    borderRadius: '11px',
    background: '#e5c158',
    color: '#090d18',
    fontWeight: 800,
    cursor: 'pointer'
  },
  botonOscuro: {
    minHeight: '44px',
    border: '1px solid rgba(255,255,255,.16)',
    borderRadius: '11px',
    background: 'rgba(255,255,255,.05)',
    color: '#fff',
    fontWeight: 800,
    cursor: 'pointer'
  },
  etiqueta: {
    padding: '7px 11px',
    borderRadius: '999px',
    background: 'rgba(7,10,20,.78)',
    border: '1px solid rgba(255,255,255,.15)',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 700,
    backdropFilter: 'blur(8px)'
  }
};

function TarjetaHabitacion({ habitacion, onVer, onReservar }) {
  const imagenes = useMemo(() => normalizarImagenes(habitacion.imagenes), [habitacion.imagenes]);
  const [indice, setIndice] = useState(0);
  const imagenActual = imagenes[indice] || null;

  useEffect(() => setIndice(0), [habitacion.id, imagenes.length]);

  function mover(event, siguiente) {
    event.stopPropagation();
    if (imagenes.length < 2) return;
    setIndice((actual) => siguiente
      ? (actual === imagenes.length - 1 ? 0 : actual + 1)
      : (actual === 0 ? imagenes.length - 1 : actual - 1));
  }

  return (
    <article style={estilos.tarjeta}>
      <div style={{ position: 'relative', height: '270px', overflow: 'hidden', background: 'linear-gradient(135deg,rgba(229,193,88,.14),rgba(15,23,42,.95))' }}>
        {imagenActual ? (
          <img
            src={urlImagen(imagenActual.archivo)}
            alt={habitacion.tipo_habitacion || `Habitación ${habitacion.numero_habitacion || habitacion.id}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.68)', fontSize: '15px' }}>
            Sin fotografías disponibles
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.78),transparent 50%)', pointerEvents: 'none' }} />

        <div style={{ position: 'absolute', top: '14px', left: '14px', display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
          <span style={estilos.etiqueta}>N.º {habitacion.numero_habitacion || habitacion.id}</span>
          <span style={{ ...estilos.etiqueta, color: '#e5c158' }}>{habitacion.tipo_habitacion || 'No especificado'}</span>
        </div>

        {imagenes.length > 1 && <>
          <button type="button" onClick={(e) => mover(e, false)} aria-label="Fotografía anterior" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '38px', height: '38px', borderRadius: '50%', border: '1px solid rgba(255,255,255,.25)', background: 'rgba(7,10,20,.68)', color: '#fff', cursor: 'pointer', fontSize: '22px' }}>‹</button>
          <button type="button" onClick={(e) => mover(e, true)} aria-label="Siguiente fotografía" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '38px', height: '38px', borderRadius: '50%', border: '1px solid rgba(255,255,255,.25)', background: 'rgba(7,10,20,.68)', color: '#fff', cursor: 'pointer', fontSize: '22px' }}>›</button>
          <span style={{ position: 'absolute', right: '14px', bottom: '14px', padding: '5px 9px', borderRadius: '999px', background: 'rgba(7,10,20,.78)', color: '#fff', fontSize: '11px', fontWeight: 700 }}>{indice + 1} / {imagenes.length}</span>
        </>}
      </div>

      {imagenes.length > 1 && <div style={{ display: 'flex', gap: '7px', padding: '10px 12px 0', overflowX: 'auto' }}>
        {imagenes.map((imagen, i) => (
          <button key={imagen.id || imagen.archivo || i} type="button" onClick={() => setIndice(i)} aria-label={`Ver fotografía ${i + 1}`} style={{ flex: '0 0 58px', width: '58px', height: '42px', padding: 0, borderRadius: '7px', overflow: 'hidden', border: i === indice ? '2px solid #e5c158' : '1px solid rgba(255,255,255,.14)', background: 'transparent', cursor: 'pointer' }}>
            <img src={urlImagen(imagen.archivo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </button>
        ))}
      </div>}

      <div style={{ padding: '18px 18px 20px' }}>
        <div style={{ color: '#e5c158', fontSize: '11px', fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', marginBottom: '7px' }}>
          HABITACIÓN
        </div>
        <h2 style={{ margin: '0 0 8px', color: '#fff', fontSize: '21px', lineHeight: 1.25 }}>
          {habitacion.tipo_habitacion || `Habitación ${habitacion.numero_habitacion || habitacion.id}`}
        </h2>
        {habitacion.descripcion && <p style={{ margin: '0 0 14px', color: 'rgba(255,255,255,.72)', fontSize: '14px', lineHeight: 1.55, minHeight: '66px' }}>{habitacion.descripcion}</p>}
        {!habitacion.descripcion && <p style={{ margin: '0 0 14px', color: 'rgba(255,255,255,.55)', fontSize: '14px', lineHeight: 1.55, minHeight: '66px' }}>Conoce esta habitación y sus comodidades antes de reservar.</p>}

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <div style={{ color: '#e5c158', fontWeight: 800, fontSize: '15px' }}>{formatearPrecio(habitacion.tarifa)}</div>
          <div style={{ color: 'rgba(255,255,255,.58)', fontSize: '12px' }}>POR NOCHE</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button type="button" onClick={() => onVer(habitacion)} style={estilos.botonDorado}>Ver detalles</button>
          <button type="button" onClick={() => onReservar(habitacion)} style={estilos.botonOscuro}>Reservar</button>
        </div>
      </div>
    </article>
  );
}

function ModalHabitacion({ habitacion, onCerrar, onReservar }) {
  const imagenes = useMemo(() => normalizarImagenes(habitacion?.imagenes), [habitacion]);
  const comodidades = useMemo(() => obtenerComodidades(habitacion?.comodidades), [habitacion]);
  const [indice, setIndice] = useState(0);

  useEffect(() => setIndice(0), [habitacion?.id, imagenes.length]);
  useEffect(() => {
    const cerrarConEscape = (event) => { if (event.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', cerrarConEscape);
    return () => window.removeEventListener('keydown', cerrarConEscape);
  }, [onCerrar]);

  if (!habitacion) return null;
  const imagen = imagenes[indice] || null;

  function mover(siguiente) {
    if (imagenes.length < 2) return;
    setIndice((actual) => siguiente
      ? (actual === imagenes.length - 1 ? 0 : actual + 1)
      : (actual === 0 ? imagenes.length - 1 : actual - 1));
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="habitacion-modal-titulo" onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(); }} style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(0,0,0,.78)', backdropFilter: 'blur(8px)' }}>
      <div style={{ width: 'min(1040px,100%)', maxHeight: '92vh', overflow: 'auto', borderRadius: '20px', border: '1px solid rgba(229,193,88,.28)', background: 'linear-gradient(145deg,#101523,#070a14)', boxShadow: '0 30px 80px rgba(0,0,0,.55)' }}>
        <div style={{ position: 'relative', height: 'min(430px,42vh)', minHeight: '300px', overflow: 'hidden', background: '#090d18', borderRadius: '20px 20px 0 0' }}>
          {imagen ? <img src={urlImagen(imagen.archivo)} alt={habitacion.tipo_habitacion || 'Habitación'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.6)' }}>Sin fotografías disponibles</div>}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(2,5,14,.92),rgba(2,5,14,.04) 68%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '18px', left: '18px', display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
            <span style={estilos.etiqueta}>N.º {habitacion.numero_habitacion || habitacion.id}</span>
            <span style={{ ...estilos.etiqueta, color: '#e5c158' }}>{habitacion.tipo_habitacion || 'No especificado'}</span>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar información de habitación" style={{ position: 'absolute', top: '16px', right: '16px', width: '42px', height: '42px', borderRadius: '50%', border: '1px solid rgba(255,255,255,.2)', background: 'rgba(7,10,20,.72)', color: '#fff', cursor: 'pointer', fontSize: '22px' }}>×</button>
          {imagenes.length > 1 && <>
            <button type="button" onClick={() => mover(false)} aria-label="Fotografía anterior" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '42px', height: '42px', borderRadius: '50%', border: '1px solid rgba(255,255,255,.25)', background: 'rgba(7,10,20,.68)', color: '#fff', cursor: 'pointer', fontSize: '24px' }}>‹</button>
            <button type="button" onClick={() => mover(true)} aria-label="Siguiente fotografía" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', width: '42px', height: '42px', borderRadius: '50%', border: '1px solid rgba(255,255,255,.25)', background: 'rgba(7,10,20,.68)', color: '#fff', cursor: 'pointer', fontSize: '24px' }}>›</button>
            <span style={{ position: 'absolute', right: '18px', bottom: '18px', padding: '6px 10px', borderRadius: '999px', background: 'rgba(7,10,20,.78)', color: '#fff', fontSize: '12px', fontWeight: 700 }}>{indice + 1} / {imagenes.length}</span>
          </>}
        </div>

        <div style={{ padding: '28px 26px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
            <div>
              <h2 id="habitacion-modal-titulo" style={{ margin: 0, color: '#fff', fontSize: '30px', lineHeight: 1.2 }}>N.º {habitacion.numero_habitacion || habitacion.id}</h2>
            </div>
            <div style={{ padding: '10px 14px', borderRadius: '11px', background: 'rgba(229,193,88,.08)', border: '1px solid rgba(229,193,88,.18)' }}>
              <div style={{ color: 'rgba(255,255,255,.58)', fontSize: '11px', marginBottom: '3px' }}>Tarifa por noche</div>
              <strong style={{ color: '#e5c158', fontSize: '20px' }}>{formatearPrecio(habitacion.tarifa)}</strong>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: '12px', marginTop: '22px' }}>
            {[
              ['Número', habitacion.numero_habitacion || habitacion.id],
              ['Capacidad máxima', `${habitacion.capacidad_maxima || '—'} huéspedes`]
            ].map(([label, value]) => <div key={label} style={{ padding: '14px', borderRadius: '11px', background: 'rgba(255,255,255,.045)', border: '1px solid rgba(255,255,255,.08)' }}><div style={{ color: 'rgba(255,255,255,.5)', fontSize: '11px', marginBottom: '5px' }}>{label}</div><div style={{ color: '#fff', fontSize: '14px', fontWeight: 700, textTransform: label === 'Estado' ? 'capitalize' : 'none' }}>{value}</div></div>)}
          </div>

          {habitacion.descripcion && <div style={{ marginTop: '22px' }}><h3 style={{ margin: '0 0 9px', color: '#fff', fontSize: '15px' }}>Descripción</h3><p style={{ margin: 0, color: 'rgba(255,255,255,.72)', fontSize: '14px', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{habitacion.descripcion}</p></div>}

          {comodidades.length > 0 && <div style={{ marginTop: '22px' }}><h3 style={{ margin: '0 0 9px', color: '#fff', fontSize: '15px' }}>Comodidades</h3><div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>{comodidades.map((comodidad, index) => <span key={`${comodidad}-${index}`} style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid rgba(229,193,88,.18)', background: 'rgba(229,193,88,.07)', color: 'rgba(255,255,255,.8)', fontSize: '12px' }}>{comodidad}</span>)}</div></div>}

          {habitacion.notas && <div style={{ marginTop: '22px' }}><h3 style={{ margin: '0 0 9px', color: '#fff', fontSize: '15px' }}>Información adicional</h3><p style={{ margin: 0, color: 'rgba(255,255,255,.62)', fontSize: '13px', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{habitacion.notas}</p></div>}

          {imagenes.length > 1 && <div style={{ display: 'flex', gap: '7px', marginTop: '22px', overflowX: 'auto' }}>{imagenes.map((item, i) => <button key={item.id || item.archivo || i} type="button" onClick={() => setIndice(i)} style={{ flex: '0 0 60px', height: '44px', padding: 0, borderRadius: '7px', overflow: 'hidden', border: i === indice ? '2px solid #e5c158' : '1px solid rgba(255,255,255,.14)', background: 'transparent', cursor: 'pointer' }}><img src={urlImagen(item.archivo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /></button>)}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap', marginTop: '26px' }}>
            <button type="button" onClick={onCerrar} style={{ ...estilos.botonOscuro, padding: '0 20px' }}>Cerrar</button>
            <button type="button" onClick={() => { onCerrar(); onReservar(habitacion); }} style={{ ...estilos.botonDorado, padding: '0 22px' }}>Reservar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HabitacionesCliente() {
  const { notify } = useDialog();
  const navigate = useNavigate();
  const [habitaciones, setHabitaciones] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [tipoHabitacion, setTipoHabitacion] = useState('');
  const [capacidadMinima, setCapacidadMinima] = useState('');
  const [precioMinimo, setPrecioMinimo] = useState('');
  const [precioMaximo, setPrecioMaximo] = useState('');
  const [orden, setOrden] = useState('');
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setErrorState] = useState('');
  const [habitacionSeleccionada, setHabitacionSeleccionada] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
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

  async function cargarHabitaciones() {
    try {
      setLoading(true);
      const response = await api.get('/habitaciones', {
        params: {
          search: busqueda,
          tipo_habitacion: tipoHabitacion || undefined,
          capacidad_min: capacidadMinima || undefined,
          precio_min: precioMinimo || undefined,
          precio_max: precioMaximo || undefined,
          orden: orden || undefined,
          page: pagina,
          limit: elementosPorPagina
        }
      });
      const respuesta = response.data || {};
      const filas = Array.isArray(respuesta.rows) ? respuesta.rows : [];
      setHabitaciones(filas.filter((habitacion) => normalizarEstado(habitacion.estado) === 'disponible'));
      const totalActual = Number(respuesta.total || 0);
      setTotal(totalActual);
      setTipos(Array.isArray(respuesta.tipos) ? respuesta.tipos : []);
      const paginasActuales = Math.max(1, Math.ceil(totalActual / elementosPorPagina));
      if (pagina > paginasActuales) setPagina(paginasActuales);
      setErrorState('');
    } catch (err) {
      setHabitaciones([]);
      const mensaje = err.response?.data?.message || 'No se pudieron cargar las habitaciones.';
      setErrorState(mensaje);
      notify(mensaje, { type: 'error', title: 'No se pudieron cargar las habitaciones' });
    } finally {
      setLoading(false);
    }
  }

  function reservarHabitacion(habitacion) {
    navigate('/reservas', { state: { id_habitacion: habitacion.id } });
  }

  useEffect(() => {
    setPagina(1);
  }, [busqueda, tipoHabitacion, capacidadMinima, precioMinimo, precioMaximo, orden]);
  useEffect(() => {
    cargarHabitaciones();
  }, [busqueda, tipoHabitacion, capacidadMinima, precioMinimo, precioMaximo, orden, pagina, elementosPorPagina]);
  useEffect(() => {
    function actualizar(event) {
      const ruta = String(event.detail?.path || '');
      if (ruta.includes('/habitaciones') || ruta.includes('habitaciones')) cargarHabitaciones();
    }
    window.addEventListener('paie-realtime-update', actualizar);
    return () => window.removeEventListener('paie-realtime-update', actualizar);
  }, [busqueda, tipoHabitacion, capacidadMinima, precioMinimo, precioMaximo, orden, pagina, elementosPorPagina]);

  const totalPaginas = Math.max(1, Math.ceil(total / elementosPorPagina));

  function cambiarPagina(nuevaPagina) {
    setPagina(Math.min(Math.max(1, nuevaPagina), totalPaginas));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return <>
    <section className="module-page" style={{ minHeight: '100%' }}>
      <div className="module-header" style={{ marginBottom: '22px' }}>
        <div className="page-title">
          <div className="module-kicker">PAIE ROYALE · HABITACIONES</div>
          <h1>Habitaciones disponibles</h1>
          <p>Descubre nuestras habitaciones, sus fotografías, comodidades, capacidad y tarifa por noche.</p>
        </div>
        <div className="module-search" style={{ minWidth: '250px' }}>
          <span className="module-search-icon" aria-hidden="true">⌕</span>
          <input type="text" placeholder="Buscar habitación..." value={busqueda} onChange={(event) => setBusqueda(event.target.value)} aria-label="Buscar habitación" />
          {busqueda && <button type="button" className="module-search-clear" onClick={() => setBusqueda('')} aria-label="Limpiar búsqueda">×</button>}
        </div>
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '12px'
          }}
        >
          <select value={tipoHabitacion} onChange={(e) => setTipoHabitacion(e.target.value)} aria-label="Tipo de habitación">
            <option value="">Todos los tipos</option>
            {tipos.map((tipo) => (
              <option key={tipo} value={tipo}>{tipo}</option>
            ))}
          </select>

          <input
            type="number"
            min="1"
            value={capacidadMinima}
            onChange={(e) => setCapacidadMinima(e.target.value)}
            placeholder="Mín. huéspedes"
            aria-label="Capacidad mínima"
          />

          <input
            type="number"
            min="0"
            value={precioMinimo}
            onChange={(e) => setPrecioMinimo(e.target.value)}
            placeholder="Precio mínimo"
            aria-label="Precio mínimo por noche"
          />

          <input
            type="number"
            min="0"
            value={precioMaximo}
            onChange={(e) => setPrecioMaximo(e.target.value)}
            placeholder="Precio máximo"
            aria-label="Precio máximo por noche"
          />

          <select value={orden} onChange={(e) => setOrden(e.target.value)} aria-label="Ordenar habitaciones">
            <option value="">Más recientes</option>
            <option value="precio_asc">Precio: menor a mayor</option>
            <option value="precio_desc">Precio: mayor a menor</option>
            <option value="capacidad_desc">Mayor capacidad</option>
            <option value="capacidad_asc">Menor capacidad</option>
            <option value="numero_asc">Habitación: A-Z</option>
          </select>

          {(tipoHabitacion || capacidadMinima || precioMinimo || precioMaximo || orden) && (
            <button
              type="button"
              onClick={() => {
                setTipoHabitacion('');
                setCapacidadMinima('');
                setPrecioMinimo('');
                setPrecioMaximo('');
                setOrden('');
              }}
              style={{ minHeight: '42px', borderRadius: '10px', border: '1px solid rgba(255,255,255,.14)', background: 'rgba(255,255,255,.05)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {error && <div className="notice module-notice module-notice-info" style={{ marginBottom: '18px' }}>{error}</div>}
      <div ref={gridRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(290px,1fr))', gap: '20px' }}>
        {habitaciones.map((habitacion) => <TarjetaHabitacion key={habitacion.id} habitacion={habitacion} onVer={setHabitacionSeleccionada} onReservar={reservarHabitacion} />)}
      </div>
      {!loading && habitaciones.length === 0 && !error && <div className="card module-empty" style={{ marginTop: '20px', padding: '34px', textAlign: 'center' }}>No hay habitaciones disponibles para mostrar.</div>}
      {loading && <div className="card module-empty" style={{ marginTop: '20px', padding: '34px', textAlign: 'center' }}>Cargando habitaciones...</div>}
      {!loading && total > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '28px', padding: '14px', borderRadius: '14px', border: '1px solid rgba(229,193,88,.16)', background: 'rgba(8,12,22,.72)' }}>
          <button type="button" onClick={() => cambiarPagina(pagina - 1)} disabled={pagina === 1} style={{ minHeight: '42px', padding: '0 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,.14)', background: pagina === 1 ? 'rgba(255,255,255,.025)' : 'rgba(255,255,255,.05)', color: pagina === 1 ? 'rgba(255,255,255,.3)' : '#fff', fontWeight: 800, cursor: pagina === 1 ? 'not-allowed' : 'pointer' }}>Anterior</button>
          <div style={{ minWidth: '150px', textAlign: 'center', color: '#fff', fontSize: '13px', fontWeight: 700 }}>Página {pagina} de {totalPaginas}</div>
          <button type="button" onClick={() => cambiarPagina(pagina + 1)} disabled={pagina === totalPaginas} style={{ minHeight: '42px', padding: '0 16px', borderRadius: '10px', border: '1px solid rgba(229,193,88,.55)', background: pagina === totalPaginas ? 'rgba(229,193,88,.04)' : 'rgba(229,193,88,.12)', color: pagina === totalPaginas ? 'rgba(229,193,88,.35)' : '#e5c158', fontWeight: 800, cursor: pagina === totalPaginas ? 'not-allowed' : 'pointer' }}>Siguiente</button>
        </div>
      )}
    </section>
    {habitacionSeleccionada && <ModalHabitacion habitacion={habitacionSeleccionada} onCerrar={() => setHabitacionSeleccionada(null)} onReservar={reservarHabitacion} />}
  </>;
}
