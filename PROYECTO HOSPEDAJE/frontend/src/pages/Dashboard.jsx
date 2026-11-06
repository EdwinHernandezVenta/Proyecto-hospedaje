import { useEffect, useMemo, useState } from 'react';
import { useDialog } from '../components/AppDialog';
import { api } from '../api/http';

const money = (n) =>
  `$${Number(n || 0).toLocaleString('es-CO')}`;

const formatMonthYear = (fecha) => {
  if (!fecha) return '';

  const texto = String(fecha);

  const match = texto.match(/^(\d{4})-(\d{2})/);

  if (!match) {
    return texto;
  }

  const año = match[1];
  const mes = Number(match[2]);

  const meses = [
    'ENE',
    'FEB',
    'MAR',
    'ABR',
    'MAY',
    'JUN',
    'JUL',
    'AGO',
    'SEP',
    'OCT',
    'NOV',
    'DIC'
  ];

  if (mes < 1 || mes > 12) {
    return texto;
  }

  return `${meses[mes - 1]} ${año}`;
};

export default function Dashboard() {
  const { notify } = useDialog();
  const [s, setS] = useState(null);
  const [error] = useState('');

  const setError = (message) => {
    if (message) notify(message, { type: 'error', title: 'No se pudo cargar el panel' });
  };

  useEffect(() => {
    api.get('/dashboard/estadisticas')
      .then((x) => setS(x.data))
      .catch((x) => {
        setError(
          x.response?.data?.message ||
          'No se pudo cargar el panel de control.'
        );
      });
  }, []);

  const pagos = s?.ventasMensuales || [];
  const estados = s?.reservasPorEstado || [];

  const estadosPermitidos = useMemo(() => {
    return estados.filter((x) =>
      ['CONFIRMADA', 'CANCELADA'].includes(
        String(x.estado || '').toUpperCase()
      )
    );
  }, [estados]);

  const maxPago = useMemo(() => {
    return Math.max(
      ...pagos.map((x) => Number(x.valor) || 0),
      1
    );
  }, [pagos]);

  if (error) {
    return (
      <section className="dashboard-page">
        <div className="notice error">{error}</div>
      </section>
    );
  }

  if (!s) {
    return (
      <section className="dashboard-page">
        <div className="card dashboard-loading">
          <span className="dashboard-loading-icon">◌</span>

          <div>
            <strong>Cargando centro de control</strong>
            <p>
              Estamos preparando el resumen operativo.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-page">

      <div className="page-title dashboard-header">
        <div>
          <h1>Panel de control</h1>
        </div>
      </div>

      <div className="stats dashboard-stats">

        <div className="stat-card">
          <span className="stat-icon">◫</span>

          <div className="stat-content">
            <span className="stat-label">
              RESERVAS ACTIVAS
            </span>

            <strong className="stat-value">
              {s.reservas}
            </strong>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">◉</span>

          <div className="stat-content">
            <span className="stat-label">
              CLIENTES
            </span>

            <strong className="stat-value">
              {s.clientes}
            </strong>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">♧</span>

          <div className="stat-content">
            <span className="stat-label">
              HUÉSPEDES
            </span>

            <strong className="stat-value">
              {s.huespedes}
            </strong>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">★</span>

          <div className="stat-content">
            <span className="stat-label">
              CALIFICACIÓN PROMEDIO
            </span>

            <strong className="stat-value">
              {Number(
                s.calificacionPromedio || 0
              ).toFixed(1)}
            </strong>
          </div>
        </div>

      </div>

      <div className="dashboard-grid">

        <div className="card dashboard-panel dashboard-payments-panel">

          <div className="dashboard-panel-header">
            <div>
              <h3>Pagos confirmados</h3>
            </div>

            <div className="dashboard-payment-count">
              {pagos.length} {pagos.length === 1 ? 'pago' : 'pagos'}
            </div>
          </div>

          {pagos.length ? (
            <div className="payments-chart-wrapper">
              <div
                className="payments-chart"
                style={{
                  '--payments-count': Math.max(pagos.length, 1)
                }}
              >
                {pagos.map((pago, index) => {
                  const valor = Number(pago.valor) || 0;

                  const height = Math.max(
                    (valor / maxPago) * 100,
                    5
                  );

                  return (
                    <div
                      className="payment-chart-item"
                      key={`${pago.fecha}-${index}`}
                    >
                      <div className="payment-chart-value">
                        {money(valor)}
                      </div>

                      <div className="payment-chart-column">
                        <div
                          className="payment-chart-bar"
                          style={{
                            height: `${height}%`
                          }}
                          title={`${pago.fecha} — ${money(valor)}`}
                        />
                      </div>

                      <span className="payment-chart-date">
                        {formatMonthYear(pago.fecha)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="empty dashboard-empty">
              Aún no hay pagos confirmados.
            </div>
          )}

        </div>

        <div className="card dashboard-panel">

          <div className="dashboard-panel-header">
            <div>
              <h3>Estado de reservas</h3>
            </div>
          </div>

          <div className="status-list dashboard-reservation-status">

            {estadosPermitidos.map((x) => {
              const estado = String(
                x.estado || ''
              ).toUpperCase();

              const esConfirmada =
                estado === 'CONFIRMADA';

              return (
                <div
                  className={`status-row dashboard-status-row ${
                    esConfirmada
                      ? 'dashboard-status-confirmed'
                      : 'dashboard-status-cancelled'
                  }`}
                  key={x.estado}
                >
                  <div className="dashboard-status-name">
                    <span className="dashboard-status-dot" />

                    <span>
                      {estado}
                    </span>
                  </div>

                  <b>{x.total}</b>
                </div>
              );
            })}

            {!estadosPermitidos.length && (
              <div className="empty dashboard-empty">
                Sin reservas todavía.
              </div>
            )}

          </div>

        </div>

      </div>

    </section>
  );
}