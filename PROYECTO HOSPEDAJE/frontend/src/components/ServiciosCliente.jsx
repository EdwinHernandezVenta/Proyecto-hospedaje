import { useEffect, useMemo, useRef, useState } from 'react';
import { useDialog } from './AppDialog';
import { useNavigate } from 'react-router-dom';
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
  return `/api/v1/servicios/imagenes/${encodeURIComponent(archivo)}`;
}

function formatearPrecio(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return 'Consultar';
  if (numero === 0) return 'Gratis';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(numero);
}

const CART_KEY = 'paie_cart_cliente';

function leerCarrito() {
  try {
    const valor = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(valor) ? valor : [];
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

function agregarServicioAlCarrito(servicio) {
  const items = leerCarrito();
  const disponible = Math.max(0, Number(servicio.cantidad_disponible ?? 0));

  if (disponible <= 0) {
    return {
      items,
      ok: false,
      message: 'Este servicio no tiene unidades disponibles.'
    };
  }

  const existente = items.find((item) => item.tipo === 'servicio' && Number(item.id) === Number(servicio.id));
  const cantidadActual = existente ? Math.max(1, Number(existente.cantidad || 1)) : 0;

  if (cantidadActual >= disponible) {
    return {
      items,
      ok: false,
      message: `Solo hay ${disponible} unidad${disponible === 1 ? '' : 'es'} disponible${disponible === 1 ? '' : 's'} de este servicio.`
    };
  }

  if (existente) {
    existente.cantidad = cantidadActual + 1;
  } else {
    items.push({
      tipo: 'servicio',
      id: Number(servicio.id),
      nombre: servicio.nombre_servicio,
      precio: Number(servicio.costo || 0),
      cantidad: 1,
      cantidad_disponible: disponible
    });
  }

  guardarCarrito(items);
  return { items, ok: true, message: 'Servicio agregado al carrito.' };
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

function TarjetaServicio({ servicio, onVer, onAgregar }) {
  const imagenes = useMemo(() => normalizarImagenes(servicio.imagenes), [servicio.imagenes]);
  const [indice, setIndice] = useState(0);
  const imagenActual = imagenes[indice] || null;

  useEffect(() => setIndice(0), [servicio.id, imagenes.length]);

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
        {imagenActual ? <img src={urlImagen(imagenActual.archivo)} alt={servicio.nombre_servicio || 'Servicio'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.68)', fontSize: '15px' }}>Sin fotografías disponibles</div>}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(0,0,0,.78),transparent 50%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '14px', left: '14px', display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
          <span style={estilos.etiqueta}>{servicio.categoria || 'Servicio'}</span>
        </div>
        {imagenes.length > 1 && <>
          <button type="button" onClick={(e) => mover(e, false)} aria-label="Fotografía anterior" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '38px', height: '38px', borderRadius: '50%', border: '1px solid rgba(255,255,255,.25)', background: 'rgba(7,10,20,.68)', color: '#fff', cursor: 'pointer', fontSize: '22px' }}>‹</button>
          <button type="button" onClick={(e) => mover(e, true)} aria-label="Siguiente fotografía" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '38px', height: '38px', borderRadius: '50%', border: '1px solid rgba(255,255,255,.25)', background: 'rgba(7,10,20,.68)', color: '#fff', cursor: 'pointer', fontSize: '22px' }}>›</button>
          <span style={{ position: 'absolute', right: '14px', bottom: '14px', padding: '5px 9px', borderRadius: '999px', background: 'rgba(7,10,20,.78)', color: '#fff', fontSize: '11px', fontWeight: 700 }}>{indice + 1} / {imagenes.length}</span>
        </>}
      </div>

      {imagenes.length > 1 && <div style={{ display: 'flex', gap: '7px', padding: '10px 12px 0', overflowX: 'auto' }}>{imagenes.map((imagen, i) => <button key={imagen.id || imagen.archivo || i} type="button" onClick={() => setIndice(i)} aria-label={`Ver fotografía ${i + 1}`} style={{ flex: '0 0 58px', width: '58px', height: '42px', padding: 0, borderRadius: '7px', overflow: 'hidden', border: i === indice ? '2px solid #e5c158' : '1px solid rgba(255,255,255,.14)', background: 'transparent', cursor: 'pointer' }}><img src={urlImagen(imagen.archivo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /></button>)}</div>}

      <div style={{ padding: '18px 18px 20px' }}>
        <h2 style={{ margin: '0 0 8px', color: '#fff', fontSize: '21px', lineHeight: 1.25 }}>{servicio.nombre_servicio || 'Servicio'}</h2>
        {servicio.descripcion ? <p style={{ margin: '0 0 14px', color: 'rgba(255,255,255,.72)', fontSize: '14px', lineHeight: 1.55, minHeight: '66px' }}>{servicio.descripcion}</p> : <p style={{ margin: '0 0 14px', color: 'rgba(255,255,255,.55)', fontSize: '14px', lineHeight: 1.55, minHeight: '66px' }}>Conoce los detalles de este servicio y agrégalo a tu experiencia Paie Royale.</p>}
        <div style={{ color: '#e5c158', fontWeight: 800, fontSize: '15px', marginBottom: '8px' }}>{formatearPrecio(servicio.costo)}</div>
        <div style={{ color: Number(servicio.cantidad_disponible) > 0 ? 'rgba(255,255,255,.68)' : '#d9a7a7', fontSize: '13px', marginBottom: '14px' }}>
          {Number(servicio.cantidad_disponible) > 0
            ? `Disponibles: ${Number(servicio.cantidad_disponible)}`
            : 'Agotado'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button type="button" onClick={() => onVer(servicio)} style={estilos.botonDorado}>Ver detalles</button>
          <button type="button" onClick={() => onAgregar(servicio)} disabled={Number(servicio.cantidad_disponible) <= 0} style={{ ...estilos.botonOscuro, opacity: Number(servicio.cantidad_disponible) <= 0 ? 0.45 : 1, cursor: Number(servicio.cantidad_disponible) <= 0 ? 'not-allowed' : 'pointer' }}>Agregar al carrito</button>
        </div>
      </div>
    </article>
  );
}

function ModalServicio({ servicio, onCerrar, onAgregar }) {
  const imagenes = useMemo(() => normalizarImagenes(servicio?.imagenes), [servicio]);
  const [indice, setIndice] = useState(0);

  useEffect(() => setIndice(0), [servicio?.id, imagenes.length]);
  useEffect(() => {
    const cerrar = (event) => { if (event.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', cerrar);
    return () => window.removeEventListener('keydown', cerrar);
  }, [onCerrar]);

  if (!servicio) return null;
  const imagen = imagenes[indice] || null;

  function mover(siguiente) {
    if (imagenes.length < 2) return;
    setIndice((actual) => siguiente
      ? (actual === imagenes.length - 1 ? 0 : actual + 1)
      : (actual === 0 ? imagenes.length - 1 : actual - 1));
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="servicio-modal-titulo" onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(); }} style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(0,0,0,.78)', backdropFilter: 'blur(8px)' }}>
      <div style={{ width: 'min(1040px,100%)', maxHeight: '92vh', overflow: 'auto', borderRadius: '20px', border: '1px solid rgba(229,193,88,.28)', background: 'linear-gradient(145deg,#101523,#070a14)', boxShadow: '0 30px 80px rgba(0,0,0,.55)' }}>
        <div style={{ position: 'relative', height: 'min(430px,42vh)', minHeight: '300px', overflow: 'hidden', background: '#090d18', borderRadius: '20px 20px 0 0' }}>
          {imagen ? <img src={urlImagen(imagen.archivo)} alt={servicio.nombre_servicio || 'Servicio'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.6)' }}>Sin fotografías disponibles</div>}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(2,5,14,.92),rgba(2,5,14,.04) 68%)', pointerEvents: 'none' }} />
          <span style={{ ...estilos.etiqueta, position: 'absolute', top: '18px', left: '18px', color: '#e5c158' }}>{servicio.categoria || 'Servicio'}</span>
          <button type="button" onClick={onCerrar} aria-label="Cerrar información del servicio" style={{ position: 'absolute', top: '16px', right: '16px', width: '42px', height: '42px', borderRadius: '50%', border: '1px solid rgba(255,255,255,.2)', background: 'rgba(7,10,20,.72)', color: '#fff', cursor: 'pointer', fontSize: '22px' }}>×</button>
          {imagenes.length > 1 && <>
            <button type="button" onClick={() => mover(false)} aria-label="Fotografía anterior" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '42px', height: '42px', borderRadius: '50%', border: '1px solid rgba(255,255,255,.25)', background: 'rgba(7,10,20,.68)', color: '#fff', cursor: 'pointer', fontSize: '24px' }}>‹</button>
            <button type="button" onClick={() => mover(true)} aria-label="Siguiente fotografía" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', width: '42px', height: '42px', borderRadius: '50%', border: '1px solid rgba(255,255,255,.25)', background: 'rgba(7,10,20,.68)', color: '#fff', cursor: 'pointer', fontSize: '24px' }}>›</button>
            <span style={{ position: 'absolute', right: '18px', bottom: '18px', padding: '6px 10px', borderRadius: '999px', background: 'rgba(7,10,20,.78)', color: '#fff', fontSize: '12px', fontWeight: 700 }}>{indice + 1} / {imagenes.length}</span>
          </>}
        </div>

        <div style={{ padding: '28px 26px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
            <div>
              <h2 id="servicio-modal-titulo" style={{ margin: '7px 0 0', color: '#fff', fontSize: '30px', lineHeight: 1.2 }}>{servicio.nombre_servicio || 'Servicio'}</h2>
            </div>
            <div style={{ padding: '10px 14px', borderRadius: '11px', background: 'rgba(229,193,88,.08)', border: '1px solid rgba(229,193,88,.18)' }}>
              <div style={{ color: 'rgba(255,255,255,.58)', fontSize: '11px', marginBottom: '3px' }}>Precio del servicio</div>
              <strong style={{ color: '#e5c158', fontSize: '20px' }}>{formatearPrecio(servicio.costo)}</strong>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '12px', marginTop: '22px' }}>
            <div style={{ padding: '14px', borderRadius: '11px', background: 'rgba(255,255,255,.045)', border: '1px solid rgba(255,255,255,.08)' }}>
              <div style={{ color: 'rgba(255,255,255,.5)', fontSize: '11px', marginBottom: '5px' }}>Categoría</div>
              <div style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>{servicio.categoria || 'No especificada'}</div>
            </div>
          </div>

          {servicio.descripcion && <div style={{ marginTop: '22px' }}><h3 style={{ margin: '0 0 9px', color: '#fff', fontSize: '15px' }}>Descripción</h3><p style={{ margin: 0, color: 'rgba(255,255,255,.72)', fontSize: '14px', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{servicio.descripcion}</p></div>}
          {servicio.observacion && <div style={{ marginTop: '22px' }}><h3 style={{ margin: '0 0 9px', color: '#fff', fontSize: '15px' }}>Información adicional</h3><p style={{ margin: 0, color: 'rgba(255,255,255,.62)', fontSize: '13px', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{servicio.observacion}</p></div>}

          {imagenes.length > 1 && <div style={{ display: 'flex', gap: '7px', marginTop: '22px', overflowX: 'auto' }}>{imagenes.map((item, i) => <button key={item.id || item.archivo || i} type="button" onClick={() => setIndice(i)} style={{ flex: '0 0 60px', height: '44px', padding: 0, borderRadius: '7px', overflow: 'hidden', border: i === indice ? '2px solid #e5c158' : '1px solid rgba(255,255,255,.14)', background: 'transparent', cursor: 'pointer' }}><img src={urlImagen(item.archivo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /></button>)}</div>}

          <div style={{ marginTop: '22px', color: Number(servicio.cantidad_disponible) > 0 ? 'rgba(255,255,255,.68)' : '#d9a7a7', fontSize: '13px' }}>
            {Number(servicio.cantidad_disponible) > 0
              ? `Disponibles: ${Number(servicio.cantidad_disponible)}`
              : 'Este servicio está agotado.'}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap', marginTop: '26px' }}>
            <button type="button" onClick={onCerrar} style={{ ...estilos.botonOscuro, padding: '0 20px' }}>Cerrar</button>
            <button type="button" onClick={() => onAgregar(servicio)} disabled={Number(servicio.cantidad_disponible) <= 0} style={{ ...estilos.botonDorado, padding: '0 22px', opacity: Number(servicio.cantidad_disponible) <= 0 ? 0.45 : 1, cursor: Number(servicio.cantidad_disponible) <= 0 ? 'not-allowed' : 'pointer' }}>Agregar al carrito</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ServiciosCliente() {
  const { notify } = useDialog();
  const navigate = useNavigate();
  const [servicios, setServicios] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('');
  const [precioMinimo, setPrecioMinimo] = useState('');
  const [precioMaximo, setPrecioMaximo] = useState('');
  const [orden, setOrden] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setErrorState] = useState('');
  const [seleccionado, setSeleccionado] = useState(null);
  const [cantidadCarrito, setCantidadCarrito] = useState(() => contarProductosCarrito());
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

  useEffect(() => {
    const actualizar = () => setCantidadCarrito(contarProductosCarrito());
    window.addEventListener('paie-cart-update', actualizar);
    return () => window.removeEventListener('paie-cart-update', actualizar);
  }, []);

  function agregarAlCarrito(servicio) {
    const resultado = agregarServicioAlCarrito(servicio);
    setCantidadCarrito(contarProductosCarrito());

    if (!resultado.ok) {
      notify(resultado.message, { type: 'warning', title: 'Disponibilidad del servicio' });
      return;
    }

    setSeleccionado(null);
    notify(resultado.message, { type: 'success', title: 'Carrito actualizado' });
  }

  async function cargarServicios() {
    try {
      setLoading(true);
      const response = await api.get('/servicios', {
        params: {
          search: busqueda,
          categoria: categoria || undefined,
          precio_min: precioMinimo || undefined,
          precio_max: precioMaximo || undefined,
          orden: orden || undefined,
          page: pagina,
          limit: elementosPorPagina
        }
      });
      const filas = Array.isArray(response.data?.rows) ? response.data.rows : [];
      setServicios(filas);
      const totalActual = Number(response.data?.total || 0);
      setTotal(totalActual);
      setCategorias(Array.isArray(response.data?.categorias) ? response.data.categorias : []);
      const paginasActuales = Math.max(1, Math.ceil(totalActual / elementosPorPagina));
      if (pagina > paginasActuales) setPagina(paginasActuales);
      setErrorState('');
    } catch (err) {
      setServicios([]);
      const mensaje = err.response?.data?.message || 'No se pudieron cargar los servicios.';
      setErrorState(mensaje);
      notify(mensaje, { type: 'error', title: 'No se pudieron cargar los servicios' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPagina(1);
  }, [busqueda, categoria, precioMinimo, precioMaximo, orden]);
  useEffect(() => {
    cargarServicios();
  }, [busqueda, categoria, precioMinimo, precioMaximo, orden, pagina, elementosPorPagina]);
  useEffect(() => {
    const actualizar = (event) => {
      const ruta = String(event.detail?.path || '');
      if (ruta.includes('/servicios') || ruta.includes('servicios')) cargarServicios();
    };
    window.addEventListener('paie-realtime-update', actualizar);
    return () => window.removeEventListener('paie-realtime-update', actualizar);
  }, [busqueda, categoria, precioMinimo, precioMaximo, orden, pagina, elementosPorPagina]);

  const totalPaginas = Math.max(1, Math.ceil(total / elementosPorPagina));

  function cambiarPagina(nuevaPagina) {
    setPagina(Math.min(Math.max(1, nuevaPagina), totalPaginas));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return <>
    <section className="module-page" style={{ minHeight: '100%' }}>
      <div className="module-header" style={{ marginBottom: '22px' }}>
        <div className="page-title">
          <div className="module-kicker">PAIE ROYALE · SERVICIOS</div>
          <h1>Nuestros servicios</h1>
          <p>Descubre nuestros servicios, fotografías, categorías, detalles y tarifas.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => navigate('/reservas')} style={{ minHeight: '44px', padding: '0 16px', borderRadius: '10px', border: '1px solid rgba(229,193,88,.7)', background: 'rgba(229,193,88,.12)', color: '#e5c158', fontWeight: 800, cursor: 'pointer' }}>Carrito ({cantidadCarrito})</button>
          <div className="module-search" style={{ minWidth: '250px' }}>
            <span className="module-search-icon" aria-hidden="true">⌕</span>
            <input type="text" placeholder="Buscar servicio..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar servicio" />
            {busqueda && <button type="button" className="module-search-clear" onClick={() => setBusqueda('')} aria-label="Limpiar búsqueda">×</button>}
          </div>
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
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoría del servicio">
            <option value="">Todas las categorías</option>
            {categorias.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>

          <input
            type="number"
            min="0"
            value={precioMinimo}
            onChange={(e) => setPrecioMinimo(e.target.value)}
            placeholder="Precio mínimo"
            aria-label="Precio mínimo del servicio"
          />

          <input
            type="number"
            min="0"
            value={precioMaximo}
            onChange={(e) => setPrecioMaximo(e.target.value)}
            placeholder="Precio máximo"
            aria-label="Precio máximo del servicio"
          />

          <select value={orden} onChange={(e) => setOrden(e.target.value)} aria-label="Ordenar servicios">
            <option value="">Más recientes</option>
            <option value="precio_asc">Precio: menor a mayor</option>
            <option value="precio_desc">Precio: mayor a menor</option>
            <option value="nombre_asc">Nombre: A-Z</option>
            <option value="nombre_desc">Nombre: Z-A</option>
            <option value="disponibilidad_desc">Mayor disponibilidad</option>
          </select>

          {(categoria || precioMinimo || precioMaximo || orden) && (
            <button
              type="button"
              onClick={() => {
                setCategoria('');
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
        {servicios.map((servicio) => <TarjetaServicio key={servicio.id} servicio={servicio} onVer={setSeleccionado} onAgregar={agregarAlCarrito} />)}
      </div>
      {!loading && servicios.length === 0 && !error && <div className="card module-empty" style={{ marginTop: '20px', padding: '34px', textAlign: 'center' }}>No hay servicios disponibles para mostrar.</div>}
      {loading && <div className="card module-empty" style={{ marginTop: '20px', padding: '34px', textAlign: 'center' }}>Cargando servicios...</div>}
      {!loading && total > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '28px', padding: '14px', borderRadius: '14px', border: '1px solid rgba(229,193,88,.16)', background: 'rgba(8,12,22,.72)' }}>
          <button type="button" onClick={() => cambiarPagina(pagina - 1)} disabled={pagina === 1} style={{ minHeight: '42px', padding: '0 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,.14)', background: pagina === 1 ? 'rgba(255,255,255,.025)' : 'rgba(255,255,255,.05)', color: pagina === 1 ? 'rgba(255,255,255,.3)' : '#fff', fontWeight: 800, cursor: pagina === 1 ? 'not-allowed' : 'pointer' }}>Anterior</button>
          <div style={{ minWidth: '150px', textAlign: 'center', color: '#fff', fontSize: '13px', fontWeight: 700 }}>Página {pagina} de {totalPaginas}</div>
          <button type="button" onClick={() => cambiarPagina(pagina + 1)} disabled={pagina === totalPaginas} style={{ minHeight: '42px', padding: '0 16px', borderRadius: '10px', border: '1px solid rgba(229,193,88,.55)', background: pagina === totalPaginas ? 'rgba(229,193,88,.04)' : 'rgba(229,193,88,.12)', color: pagina === totalPaginas ? 'rgba(229,193,88,.35)' : '#e5c158', fontWeight: 800, cursor: pagina === totalPaginas ? 'not-allowed' : 'pointer' }}>Siguiente</button>
        </div>
      )}
    </section>
    {seleccionado && <ModalServicio servicio={seleccionado} onCerrar={() => setSeleccionado(null)} onAgregar={agregarAlCarrito} />}
  </>;
}