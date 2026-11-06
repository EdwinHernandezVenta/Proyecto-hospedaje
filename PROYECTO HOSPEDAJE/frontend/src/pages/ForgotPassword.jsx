import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/http';

import { useDialog } from '../components/AppDialog';

export default function ForgotPassword() {
  const { notify } = useDialog();
  const [correo, setCorreo] = useState('');
  const [mensaje, setMensajeState] = useState('');
  const [error, setErrorState] = useState('');

  const setMensaje = (message) => {
    setMensajeState(message || '');
    if (message) notify(message, { type: 'success', title: 'Solicitud enviada' });
  };

  const setError = (message) => {
    setErrorState(message || '');
    if (message) notify(message, { type: 'error', title: 'No se pudo completar la solicitud' });
  };
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();

    setMensaje('');
    setError('');
    setLoading(true);

    try {
      const response = await api.post(
        '/auth/forgot-password',
        {
          correo: correo.trim()
        }
      );

      setMensaje(
        response?.data?.message ||
        'Si el correo está registrado, recibirás un mensaje con las instrucciones para restablecer tu contraseña.'
      );

      setCorreo('');
    } catch (errorRecovery) {
      setError(
        errorRecovery?.response?.data?.message ||
        'No fue posible procesar la solicitud.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login">

      <div className="login-card">

        {/* LOGO */}

        <div className="login-logo-container">
          <div className="login-logo">
            PR
          </div>
        </div>


        {/* TITULO */}

        <h1>
          Recuperar contraseña
        </h1>

        <p className="login-description">
          Introduce el correo electrónico asociado
          a tu cuenta y te enviaremos las instrucciones
          para restablecer tu contraseña.
        </p>


        {/* FORMULARIO */}

        <form
          className="login-form"
          onSubmit={submit}
        >

          <div className="field">

            <label htmlFor="correo-recuperacion">
              CORREO ELECTRÓNICO
            </label>

            <input
              id="correo-recuperacion"
              type="email"
              value={correo}
              onChange={(event) => {
                setCorreo(event.target.value);
                setMensaje('');
                setError('');
              }}
              placeholder="correo@ejemplo.com"
              autoComplete="email"
              required
            />

          </div>


          <button
            className="primary"
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'Enviando…'
              : 'Enviar instrucciones →'}
          </button>


          {/* MENSAJE EXITOSO */}

          {mensaje && (
            <div className="login-success-message">
              {mensaje}
            </div>
          )}


          {/* MENSAJE DE ERROR */}

          {error && (
            <div className="login-error-message">
              {error}
            </div>
          )}

        </form>


        {/* VOLVER AL LOGIN */}

        <div className="login-home-link">
          <Link to="/login">
            ← Volver al inicio de sesión
          </Link>
        </div>


        {/* VOLVER AL INICIO */}

        <div className="login-home-link">
          <Link to="/">
            ← Volver a PAIE ROYALE
          </Link>
        </div>

      </div>

    </div>
  );
}