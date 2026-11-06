import {
  useState
} from 'react';

import {
  useLocation,
  useNavigate
} from 'react-router-dom';

import { api } from '../api/http';
import { useDialog } from '../components/AppDialog';
import PasswordInput from '../components/PasswordInput';


const money = (n) =>
  `$${Number(n || 0).toLocaleString('es-CO')}`;


export default function PagoTarjeta() {

  const location =
    useLocation();

  const navigate =
    useNavigate();

  const reserva =
    location.state?.reserva;


  const [númeroTarjeta, setNúmeroTarjeta] =
    useState('');

  const [titular, setTitular] =
    useState('');

  const [vencimiento, setVencimiento] =
    useState('');

  const [cvv, setCvv] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [msg] =
    useState('');

  const { notify, confirmDialog } =
    useDialog();

  const setMsg = (message) => {
    if (message) {
      notify(message);
    }
  };


  if (!reserva) {

    return (
      <section>

        <div className="card">

          <h2>
            Pago con tarjeta
          </h2>

          <p>
            No se encontró la reserva que
            deseas pagar.
          </p>

          <button
            type="button"
            className="primary"
            onClick={() =>
              navigate(
                '/reservas'
              )
            }
          >
            Volver a reservas
          </button>

        </div>

      </section>
    );
  }


  const valorPago = Number(reserva.valor_pago || reserva.saldo_pendiente || reserva.valor_total || 0);
  const totalReserva = Number(reserva.valor_total || 0);
  const pagadoAnterior = Number(reserva.total_pagado_confirmado || 0);
  const saldoAnterior = Math.max(0, totalReserva - pagadoAnterior);
  const tituloPago = 'VALOR';


  function formatearTarjeta(value) {

    const digits =
      value
        .replace(/\D/g, '')
        .slice(0, 16);

    return digits
      .replace(
        /(.{4})/g,
        '$1 '
      )
      .trim();
  }


  function formatearVencimiento(
    value
  ) {

    const digits =
      value
        .replace(/\D/g, '')
        .slice(0, 4);

    if (
      digits.length <= 2
    ) {
      return digits;
    }

    return (
      digits.slice(0, 2) +
      '/' +
      digits.slice(2)
    );
  }


  async function pagar(e) {

    e.preventDefault();

    setMsg('');

    const número =
      númeroTarjeta
        .replace(/\D/g, '');

    const cvvLimpio =
      cvv
        .replace(/\D/g, '');

    const titularLimpio =
      titular.trim();

    const vencimientoLimpio =
      vencimiento.trim();


    if (
      número.length !== 16
    ) {

      setMsg(
        'El número de tarjeta debe tener 16 dígitos.'
      );

      return;
    }


    if (
      titularLimpio.length < 3
    ) {

      setMsg(
        'Escribe el nombre del titular de la tarjeta.'
      );

      return;
    }


    if (
      !/^\d{2}\/\d{2}$/.test(
        vencimientoLimpio
      )
    ) {

      setMsg(
        'La fecha debe tener el formato MM/AA.'
      );

      return;
    }


    if (
      cvvLimpio.length !== 3
    ) {

      setMsg(
        'El CVV debe tener 3 dígitos.'
      );

      return;
    }


    if (
      valorPago <= 0
    ) {

      setMsg(
        'El valor del pago no es válido.'
      );

      return;
    }


    setLoading(true);

    try {

      const response =
        await api.post(
          `/reservas/${reserva.id}/pago`,
          {
            valor:
              valorPago,

            metodo_pago:
              'tarjeta',

            numero_tarjeta:
              número,

            titular:
              titularLimpio,

            vencimiento:
              vencimientoLimpio,

            cvv:
              cvvLimpio
          }
        );


      navigate(`/pagos?reserva=${reserva.id}`, { replace: true, state: { pagoRegistrado: true, message: response.data?.message || 'Solicitud de pago registrada. Queda pendiente de verificación.' } });

    } catch (error) {

      setMsg(
        error.response?.data?.message ||
        'No se pudo registrar el pago con tarjeta.'
      );

    } finally {

      setLoading(false);

    }
  }


  return (

    <section>

      <div className="page-title">

        <h1>
          Pago con tarjeta
        </h1>

      </div>


      <div className="card">

        <div className="title">

          <h3>
            Reserva {reserva.numero_confirmacion || reserva.número_confirmación || reserva.id}
          </h3>


        </div>


        <div
          className="card"
          style={{
            marginBottom: 20
          }}
        >

          <div
            style={{
              color:
                'var(--muted)',
              fontSize: 12
            }}
          >
            {tituloPago}
          </div>

          <div
            style={{
              fontFamily:
                'Space Grotesk',
              fontSize: 28,
              fontWeight: 700
            }}
          >
            {money(valorPago)}
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: 'var(--muted)' }}>
            Total de la reserva: {money(totalReserva)} · Pagado anteriormente: {money(pagadoAnterior)} · Saldo antes de este pago: {money(saldoAnterior)}
          </div>

        </div>


        <form
          className="form"
          onSubmit={pagar}
        >

          <div className="field">

            <label>
              NÚMERO DE TARJETA
            </label>

            <input
              type="text"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="0000 0000 0000 0000"
              value={
                formatearTarjeta(
                  númeroTarjeta
                )
              }
              onChange={e =>
                setNúmeroTarjeta(
                  formatearTarjeta(
                    e.target.value
                  )
                )
              }
              maxLength={19}
              required
            />

          </div>


          <div className="field">

            <label>
              TITULAR DE LA TARJETA
            </label>

            <input
              type="text"
              autoComplete="cc-name"
              placeholder="Nombre completo"
              value={
                titular
              }
              onChange={e =>
                setTitular(
                  e.target.value
                )
              }
              required
            />

          </div>


          <div
            style={{
              display:
                'grid',
              gridTemplateColumns:
                '1fr 1fr',
              gap: 14
            }}
          >

            <div className="field">

              <label>
                VENCIMIENTO
              </label>

              <input
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/AA"
                value={
                  vencimiento
                }
                onChange={e =>
                  setVencimiento(
                    formatearVencimiento(
                      e.target.value
                    )
                  )
                }
                maxLength={5}
                required
              />

            </div>


            <div className="field">

              <label>
                CVV
              </label>

              <PasswordInput
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="•••"
                value={cvv}
                onChange={e =>
                  setCvv(
                    e.target.value.replace(/\D/g, '').slice(0, 3)
                  )
                }
                maxLength={3}
                required
              />

            </div>

          </div>


          {msg && (

            <div className="notice">
              {msg}
            </div>

          )}


          <div className="form-actions">

            <button
              type="button"
              className="secondary"
              disabled={loading}
              onClick={() =>
                navigate(
                  '/reservas'
                )
              }
            >
              Cancelar
            </button>


            <button
              type="submit"
              className="primary"
              disabled={loading}
            >
              {loading
                ? 'Procesando…'
                : 'Enviar solicitud de pago →'}
            </button>

          </div>


        </form>

      </div>

    </section>
  );
}