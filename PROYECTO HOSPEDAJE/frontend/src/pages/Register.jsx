import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/http';
import { useDialog } from '../components/AppDialog';
import PasswordInput from '../components/PasswordInput';
import './Register.css';

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const googleCode = searchParams.get('google_code');
  const esRegistroGoogle = Boolean(googleCode);

  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [msg] = useState('');

  const { notify } = useDialog();

  const setMsg = (message) => {
    if (message) {
      notify(message);
    }
  };

  const [f, setF] = useState({
    nombre_usuario: '',
    correo: '',
    contrasena: '',
    confirmarContrasena: '',
    identificacion: '',
    nombre: '',
    apellido: '',
    telefono: '',
    direccion: '',
    rolSolicitado: 'Cliente',
    codigoAdministrador: ''
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!esRegistroGoogle) return;

    setLoadingGoogle(true);
    navigate(
      `/login?google_code=${encodeURIComponent(googleCode)}`,
      { replace: true }
    );
  }, [esRegistroGoogle, googleCode, navigate]);


  /* =========================================================
     CAMBIOS DEL FORMULARIO MANUAL
  ========================================================= */

  function cambiarCampo(event) {

    const {
      name,
      value
    } = event.target;


    setF(
      anterior => ({
        ...anterior,
        [name]: value
      })
    );

  }


  /* =========================================================
     REGISTRO MANUAL
  ========================================================= */

  async function registrar(event) {

    event.preventDefault();




    setMsg('');
    setLoading(true);


    try {

      if (
        !f.nombre_usuario.trim() ||
        !f.correo.trim() ||
        !f.contrasena ||
        !f.confirmarContrasena ||
        !f.identificacion.trim() ||
        !f.nombre.trim() ||
        !f.apellido.trim()
      ) {

        throw new Error(
          'Completa todos los campos obligatorios.'
        );

      }


      if (
        f.contrasena !==
        f.confirmarContrasena
      ) {

        throw new Error(
          'Las contraseñas no coinciden.'
        );

      }


      if (
        !/^\d+$/.test(
          f.identificacion.trim()
        )
      ) {

        throw new Error(
          'La identificación debe contener únicamente números.'
        );

      }


      if (
        f.contrasena.length < 8
      ) {

        throw new Error(
          'La contraseña debe tener al menos 8 caracteres.'
        );

      }


      const passwordTieneMayuscula =
        /[A-Z]/.test(
          f.contrasena
        );

      const passwordTieneMinuscula =
        /[a-z]/.test(
          f.contrasena
        );

      const passwordTieneNumero =
        /\d/.test(
          f.contrasena
        );


      if (
        !passwordTieneMayuscula ||
        !passwordTieneMinuscula ||
        !passwordTieneNumero
      ) {

        throw new Error(
          'La contraseña debe contener mayúsculas, minúsculas y números.'
        );

      }


      if (
        f.rolSolicitado ===
        'Administrador'
      ) {

        if (
          !f.codigoAdministrador.trim()
        ) {

          throw new Error(
            'Debes ingresar el código de administrador.'
          );

        }

      }


      const response =
        await api.post(
          '/auth/register',
          {
            nombre_usuario:
              f.nombre_usuario.trim(),

            correo:
              f.correo.trim(),

            contrasena:
              f.contrasena,

            identificacion:
              f.identificacion.trim(),

            nombre:
              f.nombre.trim(),

            apellido:
              f.apellido.trim(),

            telefono:
              f.telefono.trim() ||
              null,

            direccion:
              f.direccion.trim() ||
              null,

            rolSolicitado:
              f.rolSolicitado,

            codigoAdministrador:
              f.codigoAdministrador.trim()
          }
        );


      setMsg(
        response.data?.message ||
        'Cuenta creada correctamente.'
      );


      /*
       * Después del registro manual seguimos enviando
       * al usuario al login, igual que antes.
       */

      setTimeout(() => {

        navigate(
          '/login',
          {
            replace: true
          }
        );

      }, 1200);

    } catch (error) {

      console.error(
        'Error registrando usuario:',
        error
      );


      setMsg(
        error?.response?.data?.message ||
        error?.message ||
        'No fue posible crear la cuenta.'
      );

    } finally {

      setLoading(false);

    }

  }


  /* =========================================================
     IMPORTANTE:
     SI ES GOOGLE, NO RENDERIZAR EL FORMULARIO.
  ========================================================= */

  if (esRegistroGoogle) {

    return (
      <div className="register-page">

        <div className="register-container">

          <div className="register-card">

            <div className="register-header">

              <h1>
                PAIE ROYALE
              </h1>

              <p>
                Creando tu cuenta
              </p>

            </div>


            <div
              style={{
                padding: '30px 20px',
                textAlign: 'center'
              }}
            >

              <div
                style={{
                  fontSize: '18px',
                  marginBottom: '12px'
                }}
              >
                {loadingGoogle
                  ? 'Creando tu cuenta con Google...'
                  : 'Procesando...'}
              </div>


              <div
                style={{
                  fontSize: '14px',
                  opacity: 0.75
                }}
              >
                {msg ||
                  'Espera un momento, no necesitas completar ningún dato.'}
              </div>

            </div>

          </div>

        </div>

      </div>
    );

  }


  /* =========================================================
     REGISTRO NORMAL
  ========================================================= */

  return (
    <div className="register-page">

      <div className="register-container">

        <div className="register-card">

          <div className="register-header">

            <h1>
              PAIE ROYALE
            </h1>

            <p>
              Crear una cuenta
            </p>

          </div>


          {msg && (
            <div
              className="register-message"
              role="alert"
            >
              {msg}
            </div>
          )}


          <form
            onSubmit={registrar}
            className="register-form"
          >

            {/* =================================================
                CUENTA
            ================================================= */}

            <div className="register-section">

              <h2>
                Datos de la cuenta
              </h2>


              <div className="form-group">

                <label htmlFor="nombre_usuario">
                  Nombre de usuario
                </label>

                <input
                  id="nombre_usuario"
                  name="nombre_usuario"
                  type="text"
                  value={
                    f.nombre_usuario
                  }
                  onChange={
                    cambiarCampo
                  }
                  autoComplete="username"
                  required
                />

              </div>


              <div className="form-group">

                <label htmlFor="correo">
                  Correo electrónico
                </label>

                <input
                  id="correo"
                  name="correo"
                  type="email"
                  value={
                    f.correo
                  }
                  onChange={
                    cambiarCampo
                  }
                  autoComplete="email"
                  required
                />

              </div>

            </div>


            {/* =================================================
                ROL
            ================================================= */}

            <div className="register-section">

              <h2>
                Tipo de cuenta
              </h2>


              <div className="form-group">

                <label htmlFor="rolSolicitado">
                  Rol
                </label>

                <select
                  className="pr-role-select"
                  id="rolSolicitado"
                  name="rolSolicitado"
                  value={
                    f.rolSolicitado
                  }
                  onChange={
                    cambiarCampo
                  }
                >

                  <option value="Cliente">
                    Cliente
                  </option>

                  <option value="Administrador">
                    Administrador
                  </option>

                </select>

              </div>


              {f.rolSolicitado ===
                'Administrador' && (

                <div className="form-group">

                  <label htmlFor="codigoAdministrador">
                    Código de administrador
                  </label>

                  <PasswordInput
                    id="codigoAdministrador"
                    name="codigoAdministrador"
                    value={f.codigoAdministrador}
                    onChange={cambiarCampo}
                    autoComplete="off"
                  />

                </div>

              )}

            </div>


            {/* =================================================
                DATOS PERSONALES
            ================================================= */}

            <div className="register-section">

              <h2>
                Datos personales
              </h2>


              <div className="form-group">

                <label htmlFor="identificacion">
                  Identificación
                </label>

                <input
                  id="identificacion"
                  name="identificacion"
                  type="text"
                  inputMode="numeric"
                  value={
                    f.identificacion
                  }
                  onChange={
                    cambiarCampo
                  }
                  required
                />

              </div>


              <div className="form-group">

                <label htmlFor="nombre">
                  Nombre
                </label>

                <input
                  id="nombre"
                  name="nombre"
                  type="text"
                  value={
                    f.nombre
                  }
                  onChange={
                    cambiarCampo
                  }
                  required
                />

              </div>


              <div className="form-group">

                <label htmlFor="apellido">
                  Apellido
                </label>

                <input
                  id="apellido"
                  name="apellido"
                  type="text"
                  value={
                    f.apellido
                  }
                  onChange={
                    cambiarCampo
                  }
                  required
                />

              </div>


              <div className="form-group">

                <label htmlFor="telefono">
                  Teléfono <span className="register-optional">(opcional)</span>
                </label>

                <input
                  id="telefono"
                  name="telefono"
                  type="tel"
                  value={
                    f.telefono
                  }
                  onChange={
                    cambiarCampo
                  }
                  autoComplete="tel"
                />

              </div>


              <div className="form-group">

                <label htmlFor="direccion">
                  Dirección <span className="register-optional">(opcional)</span>
                </label>

                <input
                  id="direccion"
                  name="direccion"
                  type="text"
                  value={
                    f.direccion
                  }
                  onChange={
                    cambiarCampo
                  }
                  autoComplete="street-address"
                />

              </div>

            </div>


            {/* =================================================
                CONTRASEÑA
            ================================================= */}

            <div className="register-section">

              <h2>
                Contraseña
              </h2>


              <div className="form-group">

                <label htmlFor="contrasena">
                  Contraseña
                </label>

                <PasswordInput
                  id="contrasena"
                  name="contrasena"
                  value={f.contrasena}
                  onChange={cambiarCampo}
                  autoComplete="new-password"
                  required
                />

              </div>


              <div className="form-group">

                <label htmlFor="confirmarContrasena">
                  Confirmar contraseña
                </label>

                <PasswordInput
                  id="confirmarContrasena"
                  name="confirmarContrasena"
                  value={f.confirmarContrasena}
                  onChange={cambiarCampo}
                  autoComplete="new-password"
                  required
                />

              </div>


              <p className="password-info">
                La contraseña debe tener al menos 8
                caracteres, incluyendo mayúsculas,
                minúsculas y números.
              </p>

            </div>


            <button
              type="submit"
              disabled={loading}
              className="register-button"
            >
              {loading
                ? 'Creando cuenta...'
                : 'Crear cuenta'}
            </button>

          </form>


          <div className="register-footer">

            <p>
              ¿Ya tienes una cuenta?{' '}

              <Link to="/login">
                Iniciar sesión
              </Link>

            </p>

          </div>

        </div>

      </div>

    </div>
  );
}