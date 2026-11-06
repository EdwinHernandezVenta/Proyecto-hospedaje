import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/http';

import { useDialog } from '../components/AppDialog';
import PasswordInput from '../components/PasswordInput';

export default function ResetPassword() {
  const { notify } = useDialog();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(
    () => searchParams.get('token') || '',
    [searchParams]
  );

  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmación, setConfirmación] = useState('');
  const [mensaje] = useState('');
  const [error] = useState('');

  const setMensaje = (message) => {
    if (message) notify(message, { type: 'success', title: 'Contraseña actualizada' });
  };

  const setError = (message) => {
    if (message) notify(message, { type: 'error', title: 'No se pudo cambiar la contraseña' });
  };
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setMensaje('');
    setError('');

    if (!token) {
      setError('El enlace de recuperación no contiene un código válido.');
      return;
    }

    if (nuevaContrasena !== confirmación) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(
        '/auth/reset-password',
        {
          token,
          nuevaContrasena
        }
      );

      setMensaje(
        response?.data?.message ||
        'Contraseña actualizada correctamente.'
      );
      setNuevaContrasena('');
      setConfirmación('');

      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1800);
    } catch (errorReset) {
      setError(
        errorReset?.response?.data?.message ||
        'No fue posible restablecer la contraseña.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login">
      <div className="login-card">
        <div className="login-logo-container">
          <div className="login-logo">PR</div>
        </div>

        <h1>Restablecer contraseña</h1>

        <p className="login-description">
          Escribe tu nueva contraseña para recuperar el acceso a tu cuenta.
        </p>

        <form className="login-form" onSubmit={submit}>
          <div className="field">
            <label htmlFor="nueva-contrasena">
              NUEVA CONTRASEÑA
            </label>
            <PasswordInput
              id="nueva-contrasena"
              value={nuevaContrasena}
              onChange={(event) => {
                setNuevaContrasena(event.target.value);
                setError('');
                setMensaje('');
              }}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="confirmar-contrasena">
              CONFIRMAR CONTRASEÑA
            </label>
            <PasswordInput
              id="confirmar-contrasena"
              value={confirmación}
              onChange={(event) => {
                setConfirmación(event.target.value);
                setError('');
                setMensaje('');
              }}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <button
            className="primary"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Guardando…' : 'Cambiar contraseña →'}
          </button>

          {mensaje && (
            <div className="login-success-message">
              {mensaje}
            </div>
          )}

          {error && (
            <div className="login-error-message">
              {error}
            </div>
          )}
        </form>

        <div className="login-home-link">
          <Link to="/login">
            ← Volver al inicio de sesión
          </Link>
        </div>

        <div className="login-home-link">
          <Link to="/">
            ← Volver a PAIE ROYALE
          </Link>
        </div>
      </div>
    </div>
  );
}
