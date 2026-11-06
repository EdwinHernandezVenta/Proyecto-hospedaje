import {
  useEffect,
  useState
} from 'react';

import {
  Link,
  useNavigate,
  useSearchParams
} from 'react-router-dom';

import { api } from '../api/http';
import { useDialog } from '../components/AppDialog';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';


export default function Login() {
  const { notify, confirmDialog } = useDialog();

  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleCode, setGoogleCode] = useState('');
  const [googleType, setGoogleType] = useState('');
  const [googleChoiceOpen, setGoogleChoiceOpen] = useState(false);
  const [googleCreating, setGoogleCreating] = useState(false);

  const setError = (message) => {
    if (message) {
      notify(message, {
        type: 'error',
        title: 'No se pudo iniciar sesión'
      });
    }
  };

  const {
    login,
    loginGoogle,
    completarRegistroGoogle
  } = useAuth();

  const navigate = useNavigate();

  const [searchParams, setSearchParams] =
    useSearchParams();


  async function submit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const usuario = await login(
        correo.trim(),
        contrasena
      );

      navigate(
        usuario?.rol === 'Administrador'
          ? '/dashboard'
          : '/habitaciones',
        { replace: true }
      );
    } catch (errorLogin) {
      setError(
        errorLogin?.response?.data?.message ||
        'Correo o contraseña incorrectos'
      );
    } finally {
      setLoading(false);
    }
  }


  function iniciarSesionGoogle() {
    setError('');
    setGoogleLoading(true);
    window.location.href = '/api/v1/auth/google';
  }


  useEffect(() => {
    const code = searchParams.get('google_code');

    if (!code) return;

    let activo = true;

    async function cargarOpcionGoogle() {
      try {
        setGoogleLoading(true);

        const response = await api.get(
          `/auth/google/pending?codigo=${encodeURIComponent(code)}`
        );

        if (!activo) return;

        setGoogleCode(code);
        setGoogleType(response.data?.type || '');
        setGoogleChoiceOpen(true);

        setSearchParams({}, { replace: true });
      } catch (errorGoogle) {
        if (!activo) return;

        setError(
          errorGoogle?.response?.data?.message ||
          'No fue posible obtener la información de Google.'
        );

        setSearchParams({}, { replace: true });
      } finally {
        if (activo) {
          setGoogleLoading(false);
        }
      }
    }

    cargarOpcionGoogle();

    return () => {
      activo = false;
    };
  }, [searchParams, setSearchParams]);


  async function entrarConGoogle() {
    if (!googleCode) return;

    try {
      setGoogleChoiceOpen(false);
      setGoogleLoading(true);

      const usuario = await loginGoogle(googleCode);

      navigate(
        usuario?.rol === 'Administrador'
          ? '/dashboard'
          : '/habitaciones',
        { replace: true }
      );
    } catch (errorGoogle) {
      setError(
        errorGoogle?.response?.data?.message ||
        'No fue posible iniciar sesión con Google.'
      );
      setGoogleCode('');
      setGoogleType('');
    } finally {
      setGoogleLoading(false);
    }
  }


  async function crearCuentaConGoogle() {
    if (!googleCode) return;

    const confirmar = await confirmDialog(
      'Se creará una cuenta de Cliente con los datos verificados por Google. ¿Deseas continuar?',
      {
        title: 'Crear cuenta con Google',
        confirmText: 'Crear cuenta',
        cancelText: 'Cancelar'
      }
    );

    if (!confirmar) return;

    try {
      setGoogleChoiceOpen(false);
      setGoogleCreating(true);
      setGoogleLoading(true);

      const usuario = await completarRegistroGoogle(
        googleCode
      );

      navigate(
        usuario?.rol === 'Administrador'
          ? '/dashboard'
          : '/habitaciones',
        { replace: true }
      );
    } catch (errorGoogle) {
      setGoogleCreating(false);
      setGoogleLoading(false);
      setError(
        errorGoogle?.response?.data?.message ||
        'No fue posible crear tu cuenta con Google.'
      );
    }
  }


  const mostrarSelectorGoogle =
    googleChoiceOpen &&
    Boolean(googleCode) &&
    (
      googleType === 'existing_user' ||
      googleType === 'new_user'
    );

  const bloqueado =
    loading ||
    googleLoading ||
    googleCreating;


  return (
    <>
      {googleCreating && (
        <div className="google-creation-overlay">
          <div className="google-creation-panel">
            <div className="google-creation-mark">PR</div>
            <h2>Creando tu cuenta</h2>
            <p>Estamos preparando tu acceso a PAIE ROYALE.</p>
            <div className="google-creation-spinner" aria-hidden="true" />
          </div>
        </div>
      )}

      {mostrarSelectorGoogle && (
        <div className="google-choice-overlay">
          <div className="google-choice-card">
            <span className="module-section-label">
              PAIE ROYALE · GOOGLE
            </span>

            <h2>
              {googleType === 'existing_user'
                ? 'Tu cuenta ya existe'
                : 'Cuenta de Google no registrada'}
            </h2>

            <p>
              {googleType === 'existing_user'
                ? 'Puedes entrar directamente con la cuenta de Google verificada.'
                : 'No encontramos una cuenta asociada a este correo. Puedes crear una cuenta de Cliente.'}
            </p>

            <div className="google-choice-actions">
              <button
                type="button"
                className="primary"
                onClick={
                  googleType === 'existing_user'
                    ? entrarConGoogle
                    : crearCuentaConGoogle
                }
              >
                {googleType === 'existing_user'
                  ? 'Entrar al sistema'
                  : 'Crear cuenta'}
              </button>

              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setGoogleChoiceOpen(false);
                  setGoogleCode('');
                  setGoogleType('');
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="login">
        <div className="login-card">

          <h1>Bienvenido a PAIE ROYALE</h1>

          <form
            className="login-form"
            onSubmit={submit}
            autoComplete="off"
          >
            <div className="field">
              <label htmlFor="correo">
                CORREO ELECTRÓNICO
              </label>

              <input
                id="correo"
                name="paie-royale-email"
                type="email"
                value={correo}
                onChange={(event) => {
                  setCorreo(event.target.value);
                  setError('');
                }}
                placeholder="correo@ejemplo.com"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck="false"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="contrasena">
                CONTRASEÑA
              </label>

              <PasswordInput
                id="contrasena"
                name="paie-royale-password"
                value={contrasena}
                onChange={(event) => {
                  setContrasena(event.target.value);
                  setError('');
                }}
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
            </div>

            <button
              className="primary"
              type="submit"
              disabled={bloqueado}
            >
              {loading
                ? 'Entrando...'
                : 'Entrar al sistema'}
            </button>

            {error && (
              <div className="login-error-message">
                {error}
              </div>
            )}
          </form>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              margin: '20px 0'
            }}
          >
            <div
              style={{
                flex: 1,
                height: '1px',
                background: 'currentColor',
                opacity: 0.2
              }}
            />
            <span>O</span>
            <div
              style={{
                flex: 1,
                height: '1px',
                background: 'currentColor',
                opacity: 0.2
              }}
            />
          </div>

          <button
            type="button"
            onClick={iniciarSesionGoogle}
            disabled={bloqueado}
            className="google-login-button"
          >
            {googleLoading
              ? 'Conectando con Google...'
              : 'Continuar con Google'}
          </button>

          <div className="forgot-password">
            <Link to="/recuperar-contrasena">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <div className="register-login-option">
            <span>¿No tienes una cuenta?</span>
            <Link to="/registro">Crear cuenta</Link>
          </div>

          <div className="login-home-link">
            <Link to="/">
              Volver a PAIE ROYALE
            </Link>
          </div>

        </div>
      </div>
    </>
  );
}
