import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/http';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../components/AppDialog';

const money = (n) => `$${Number(n || 0).toLocaleString('es-CO')}`;

function estadoTexto(estado) {
  const e = String(estado || '').toLowerCase();
  if (e === 'confirmado') return 'Aprobado';
  if (e === 'pendiente') return 'Pendiente';
  if (e === 'rechazado') return 'Rechazado';
  if (e === 'cancelado' || e === 'cancelada') return 'Cancelado';
  return estado || 'Sin pago';
}

function claseEstado(estado) {
  const e = String(estado || '').toLowerCase();
  if (e === 'confirmado' || e === 'confirmada') return 'module-status-ok';
  if (e === 'pendiente') return 'module-status-warning';
  if (e === 'rechazado' || e === 'cancelado' || e === 'cancelada') return 'module-status-danger';
  return 'module-status-muted';
}

function fecha(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString('es-CO');
}

export default function Pagos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { notify, confirmDialog } = useDialog();
  const [data, setData] = useState({ reservas_pendientes: [] });
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState({});
  const [method, setMethod] = useState({});
  const [working, setWorking] = useState({});
  const esAdmin = user?.rol === 'Administrador';
  const reservaSeleccionada = Number(searchParams.get('reserva') || location.state?.reservaId || 0);

  async function cargar() {
    setLoading(true);
    try {
      const [pagosResponse, reservasResponse] = await Promise.all([
        api.get('/pagos'),
        api.get('/reservas')
      ]);
      setData({
        reservas_pendientes: Array.isArray(pagosResponse.data?.reservas_pendientes) ? pagosResponse.data.reservas_pendientes : []
      });
      setReservas(Array.isArray(reservasResponse.data?.rows) ? reservasResponse.data.rows : []);
    } catch (error) {
      notify(error.response?.data?.message || 'No se pudo cargar la información.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  const pendientes = useMemo(
    () => (data.reservas_pendientes || []).filter((r) => !reservaSeleccionada || Number(r.id) === reservaSeleccionada),
    [data.reservas_pendientes, reservaSeleccionada]
  );

  function datosPago(reserva) {
    const total = Number(reserva.valor_total || 0);
    const pagado = Number(reserva.total_pagado_confirmado || 0);
    const saldo = Math.max(0, total - pagado);
    return { total, pagado, saldo, valor: Number(saldo.toFixed(2)) };
  }

  function pagarTarjeta(reserva) {
    const pago = datosPago(reserva);
    if (pago.valor <= 0) return;
    navigate('/pago-tarjeta', {
      state: {
        reserva: {
          ...reserva,
          valor_pago: pago.valor,
          tipo_pago: 'completo',
          concepto_pago: pago.pagado > 0.009 ? 'Saldo pendiente' : 'Pago del 100 %',
          total_pagado_confirmado: pago.pagado,
          saldo_pendiente: pago.saldo
        }
      }
    });
  }

  async function registrarPago(reserva) {
    const pago = datosPago(reserva);
    const metodo = method[reserva.id] || (esAdmin ? 'efectivo' : 'tarjeta');
    const rechazados = Number(reserva.intentos_rechazados || 0);
    if (rechazados >= 3) {
      notify('Esta reserva alcanzó el límite de 3 pagos rechazados.');
      return;
    }
    if (pago.valor <= 0) { notify('Esta reserva no tiene saldo pendiente.'); return; }
    if (metodo === 'tarjeta') { pagarTarjeta(reserva); return; }
    if (metodo === 'transferencia' && !files[reserva.id]) { notify('Selecciona el soporte de la transferencia.'); return; }
    setWorking((old) => ({ ...old, [reserva.id]: true }));
    try {
      let body;
      if (metodo === 'transferencia') {
        body = new FormData();
        body.append('valor', String(pago.valor));
        body.append('metodo_pago', metodo);
        body.append('comprobante', files[reserva.id]);
      } else {
        body = { valor: pago.valor, metodo_pago: metodo };
      }
      const response = await api.post(`/reservas/${reserva.id}/pago`, body);
      notify(response.data?.message || 'Solicitud de pago registrada.');
      setFiles((old) => ({ ...old, [reserva.id]: null }));
      await cargar();
    } catch (error) {
      notify(error.response?.data?.message || 'No se pudo registrar el pago.');
    } finally {
      setWorking((old) => ({ ...old, [reserva.id]: false }));
    }
  }

  async function confirmar(id) {
    setWorking((old) => ({ ...old, [id]: true }));
    try {
      await api.patch(`/reservas/${id}/confirmar-pago`);
      notify('Pago aprobado correctamente.');
      await cargar();
    } catch (error) {
      notify(error.response?.data?.message || 'No se pudo aprobar el pago.');
    } finally {
      setWorking((old) => ({ ...old, [id]: false }));
    }
  }

  async function rechazar(id) {
    const ok = await confirmDialog('El pago pendiente será marcado como rechazado.', {
      title: 'Rechazar pago', type: 'warning', confirmText: 'Rechazar', cancelText: 'Volver'
    });
    if (!ok) return;
    setWorking((old) => ({ ...old, [id]: true }));
    try {
      const response = await api.patch(`/reservas/${id}/rechazar-pago`);
      notify(response.data?.message || 'Pago rechazado.');
      await cargar();
    } catch (error) {
      notify(error.response?.data?.message || 'No se pudo rechazar el pago.');
    } finally {
      setWorking((old) => ({ ...old, [id]: false }));
    }
  }

  async function abrirComprobante(url) {
    if (!url) return;
    const filename = String(url).replace(/\\/g, '/').split('/').pop();
    const ventana = window.open('about:blank', '_blank');
    if (!ventana) {
      notify('Permite las ventanas emergentes para ver el comprobante.');
      return;
    }
    try {
      const response = await api.get(`/uploads/${encodeURIComponent(filename)}`, { responseType: 'blob' });
      const objectUrl = window.URL.createObjectURL(new Blob([response.data], {
        type: response.headers['content-type'] || 'application/pdf'
      }));
      ventana.location.href = objectUrl;
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60000);
    } catch (error) {
      ventana.close();
      notify(error.response?.data?.message || 'No se pudo cargar el comprobante.');
    }
  }

  async function cancelar(id) {
    const ok = await confirmDialog('La reserva quedará cancelada.', {
      title: 'Cancelar reserva', type: 'warning', confirmText: 'Sí, cancelar', cancelText: 'Volver'
    });
    if (!ok) return;
    setWorking((old) => ({ ...old, [id]: true }));
    try {
      await api.patch(`/reservas/${id}/cancelar`);
      notify('Reserva cancelada correctamente.');
      await cargar();
    } catch (error) {
      notify(error.response?.data?.message || 'No se pudo cancelar la reserva.');
    } finally {
      setWorking((old) => ({ ...old, [id]: false }));
    }
  }

  async function eliminar(reserva) {
    const ok = await confirmDialog('Se eliminarán también sus pagos, comprobantes y detalles asociados. Esta acción no se puede deshacer.', {
      title: `Eliminar reserva ${reserva.numero_confirmacion || ''}`.trim(),
      type: 'error', confirmText: 'Sí, eliminar', cancelText: 'Cancelar'
    });
    if (!ok) return;
    setWorking((old) => ({ ...old, [reserva.id]: true }));
    try {
      await api.delete(`/reservas/${reserva.id}`);
      notify('Reserva eliminada correctamente.');
      await cargar();
    } catch (error) {
      notify(error.response?.data?.message || 'No se pudo eliminar la reserva.');
    } finally {
      setWorking((old) => ({ ...old, [reserva.id]: false }));
    }
  }

  return (
    <section className="module-page">
      <div className="module-header">
        <div className="page-title">
          <div className="module-kicker">PAIE ROYALE · PAGOS</div>
          <h1>Pagos</h1>
        </div>
      </div>

      {pendientes.length > 0 && <div className="card" style={{ marginBottom: 18 }}>
        <h2 style={{ marginTop: 0 }}>{esAdmin ? 'Reservas pendientes de pago' : 'Pagos pendientes de tus reservas'}</h2>
        <div style={{ display: 'grid', gap: 12, maxHeight: pendientes.length > 10 ? 620 : 'none', overflowY: pendientes.length > 10 ? 'auto' : 'visible' }}>
          {pendientes.map((reserva) => {
            const pago = datosPago(reserva);
            const metodo = method[reserva.id] || (esAdmin ? 'efectivo' : 'tarjeta');
            const bloqueada = Number(reserva.intentos_rechazados || 0) >= 3;
            return <div key={reserva.id} style={{ border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 260 }}>
                  <strong>Reserva {reserva.numero_confirmacion || `#${reserva.id}`}</strong>
                  {esAdmin && <div style={{ marginTop: 6 }}>Cliente: {reserva.cliente || reserva.correo || '—'}</div>}
                  <div style={{ marginTop: 8 }}>Total de la reserva: <strong>{money(pago.total)}</strong></div>
                  <div style={{ marginTop: 4 }}>Valor: <strong>{money(pago.valor)}</strong></div>
                  {bloqueada && <span className="module-status module-status-danger">Bloqueada</span>}
                </div>
                <div style={{ minWidth: 270, maxWidth: 360, width: '100%' }}>
                  <label style={{ display: 'block', marginBottom: 6 }}>Método de pago</label>
                  <select value={metodo} disabled={bloqueada} onChange={(e) => setMethod((old) => ({ ...old, [reserva.id]: e.target.value }))} style={{ width: '100%', marginBottom: 8 }}>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="efectivo">Efectivo</option>
                  </select>
                  {metodo === 'transferencia' && <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" disabled={bloqueada} onChange={(e) => setFiles((old) => ({ ...old, [reserva.id]: e.target.files?.[0] || null }))} style={{ width: '100%', marginBottom: 8 }} />}
                  <button className="primary" type="button" disabled={bloqueada || working[reserva.id] || pago.valor <= 0} onClick={() => registrarPago(reserva)}>
                    {working[reserva.id] ? 'Procesando…' : metodo === 'efectivo' ? (esAdmin ? 'Registrar efectivo y confirmar' : 'Solicitar pago en efectivo') : metodo === 'transferencia' ? 'Enviar soporte de transferencia' : 'Continuar con tarjeta'}
                  </button>
                </div>
              </div>
            </div>;
          })}
        </div>
      </div>}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Historial de reservas</h2>
        {loading ? <p>Cargando…</p> : reservas.length === 0 ? <p>No hay reservas registradas.</p> : <div style={{ overflowX: 'auto', maxHeight: reservas.length > 10 ? 620 : 'none', overflowY: reservas.length > 10 ? 'auto' : 'visible' }}>
          <table className="module-table" style={{ width: '100%' }}>
            <thead><tr>
              <th>Confirmación</th><th>Cliente</th><th>Habitación</th><th>Servicios / paquetes</th><th>Entrada</th><th>Salida</th><th>Valor total</th><th>Reserva</th><th>Pago</th><th>Acciones</th>
            </tr></thead>
            <tbody>
              {reservas.map((r) => {
                const estadoPago = String(r.pago_estado || '').toLowerCase();
                const estadoReserva = String(r.estado || '').toLowerCase();
                const cancelada = estadoReserva === 'cancelada';
                const finalizada = estadoReserva === 'check-out';
                const confirmado = estadoPago === 'confirmado';
                const pendiente = estadoPago === 'pendiente';
                const bloqueada = Number(r.intentos_rechazados || 0) >= 3;
                const serviciosPaquetes = [r.servicios, r.paquetes].filter(Boolean).join(' · ');
                return <tr key={r.id}>
                  <td><strong>{r.numero_confirmacion}</strong></td>
                  <td>{r.cliente || '—'}</td>
                  <td>{r.habitacion || '—'}</td>
                  <td>{serviciosPaquetes || '—'}</td>
                  <td>{fecha(r.fecha_inicio)}</td>
                  <td>{fecha(r.fecha_fin)}</td>
                  <td>{money(r.valor_total)}</td>
                  <td><span className={`module-status ${claseEstado(r.estado)}`}>{estadoTexto(r.estado)}</span></td>
                  <td>
                    <span className={`module-status ${claseEstado(r.pago_estado)}`}>{estadoTexto(r.pago_estado)}</span>
                    {r.metodo_pago && <div style={{ marginTop: 5 }}>{r.metodo_pago}</div>}
                    {Number(r.intentos_rechazados || 0) > 0 && <div style={{ marginTop: 5 }}>Rechazos: {Number(r.intentos_rechazados)}</div>}
                  </td>
                  <td><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {bloqueada && <span className="module-status module-status-danger">Bloqueada</span>}
                    {pendiente && esAdmin && !bloqueada && <>
                      {r.metodo_pago === 'transferencia' && r.comprobante_url && <button type="button" className="secondary" onClick={() => abrirComprobante(r.comprobante_url)}>Ver soporte</button>}
                      <button type="button" className="primary" disabled={working[r.id]} onClick={() => confirmar(r.id)}>Aprobar</button>
                      <button type="button" className="danger" disabled={working[r.id]} onClick={() => rechazar(r.id)}>Rechazar</button>
                    </>}
                    {r.comprobante_url && !pendiente && <button type="button" className="secondary" onClick={() => abrirComprobante(r.comprobante_url)}>Ver comprobante</button>}
                    {esAdmin && !confirmado && !pendiente && !cancelada && !finalizada && <button type="button" className="secondary" onClick={() => navigate(`/reservas?editar=${r.id}`)}>Editar</button>}
                    {!cancelada && !finalizada && <button type="button" className="secondary danger" disabled={working[r.id]} onClick={() => cancelar(r.id)}>Cancelar</button>}
                    {esAdmin && <button type="button" className="secondary danger" disabled={working[r.id]} onClick={() => eliminar(r)}>Eliminar</button>}
                  </div></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>}
      </div>
    </section>
  );
}
