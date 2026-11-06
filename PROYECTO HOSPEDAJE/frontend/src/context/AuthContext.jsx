import {
  createContext,
  useContext,
  useEffect,
  useState
} from 'react';

import { api } from '../api/http';

import {
  conectarTiempoReal,
  desconectarTiempoReal
} from '../realtime/realtime';


const C =
  createContext(null);



/* =========================================================
   OBTENER USUARIO GUARDADO
========================================================= */

function obtenerUsuarioGuardado() {

  try {

    const usuario =
      localStorage.getItem(
        'user'
      );


    if (!usuario) {

      return null;

    }


    return JSON.parse(
      usuario
    );

  } catch {

    localStorage.removeItem(
      'user'
    );

    return null;

  }

}


/* =========================================================
   AUTH PROVIDER
========================================================= */

export function AuthProvider({
  children
}) {

  const [
    user,
    setUser
  ] = useState(
    obtenerUsuarioGuardado
  );


  /* =======================================================
     GUARDAR USUARIO
  ======================================================= */

  function guardarUsuario(
    usuario
  ) {

    if (!usuario) {

      localStorage.removeItem(
        'user'
      );

      setUser(
        null
      );

      return;

    }


    localStorage.setItem(
      'user',
      JSON.stringify(
        usuario
      )
    );


    setUser(
      usuario
    );

  }


  /* =======================================================
     LOGIN NORMAL
  ======================================================= */

  async function login(
    correo,
    contrasena
  ) {

    const {
      data
    } = await api.post(
      '/auth/login',
      {
        correo,
        contrasena
      }
    );


    localStorage.setItem(
      'accessToken',
      data.accessToken
    );


    localStorage.setItem(
      'refreshToken',
      data.refreshToken || ''
    );


    guardarUsuario(
      data.user
    );


    return data.user;

  }


  /* =======================================================
     LOGIN CON GOOGLE
  ======================================================= */

  async function loginGoogle(
    googleCode
  ) {

    if (!googleCode) {

      throw new Error(
        'No se recibió el código de Google.'
      );

    }


    const {
      data
    } = await api.post(
      '/auth/google/exchange',
      {
        code: googleCode
      }
    );


    localStorage.setItem(
      'accessToken',
      data.accessToken
    );


    localStorage.setItem(
      'refreshToken',
      data.refreshToken || ''
    );


    guardarUsuario(
      data.user
    );


    return data.user;

  }


  async function completarRegistroGoogle(
    googleCode
  ) {
    if (!googleCode) {
      throw new Error(
        'No se recibió el código de Google.'
      );
    }

    const { data } = await api.post(
      '/auth/google/complete',
      {
        codigo: googleCode
      }
    );

    localStorage.setItem(
      'accessToken',
      data.accessToken
    );

    localStorage.setItem(
      'refreshToken',
      data.refreshToken || ''
    );

    guardarUsuario(
      data.user
    );

    return data.user;
  }


  /* =======================================================
     ACTUALIZAR USUARIO
  ======================================================= */

  function updateUser(
    usuarioActualizado
  ) {

    if (
      !usuarioActualizado
    ) {

      return;

    }


    const usuarioAnterior =
      user || {};


    const usuarioFinal = {

      ...usuarioAnterior,

      ...usuarioActualizado

    };


    if (
      usuarioFinal.nombre_rol &&
      !usuarioFinal.rol
    ) {

      usuarioFinal.rol =
        usuarioFinal.nombre_rol;

    }


    if (
      usuarioFinal.rol &&
      !usuarioFinal.nombre_rol
    ) {

      usuarioFinal.nombre_rol =
        usuarioFinal.rol;

    }


    guardarUsuario(
      usuarioFinal
    );

  }


  /* =======================================================
     ACTUALIZAR DESDE BACKEND
  ======================================================= */

  async function refreshUser() {

    try {

      const {
        data
      } = await api.get(
        '/auth/me'
      );


      const usuario =
        data?.user ||
        data;


      if (usuario) {

        guardarUsuario(
          usuario
        );


        return usuario;

      }

    } catch {

      /*
       * El interceptor de Axios intentará
       * renovar el access token automáticamente
       * cuando sea necesario.
       */

    }


    return user;

  }


  /* =======================================================
     CERRAR SESIÓN
  ======================================================= */

  async function logout() {

    /*
     * Primero detener tiempo real.
     */

    desconectarTiempoReal();


    /*
     * Avisar al backend.
     */

    try {

      if (
        localStorage.getItem(
          'accessToken'
        )
      ) {

        await api.post(
          '/auth/logout'
        );

      }

    } catch {

      /*
       * La sesión local se limpiará
       * igualmente.
       */

    }


    /*
     * Limpiar almacenamiento local.
     */

    localStorage.removeItem(
      'accessToken'
    );

    localStorage.removeItem(
      'refreshToken'
    );

    localStorage.removeItem(
      'user'
    );


    setUser(
      null
    );

  }


  /* =======================================================
     VALIDAR SESIÓN AL ABRIR / RECARGAR
  ======================================================= */

  useEffect(
    () => {

      let activo = true;

      async function validarSesionAlIniciar() {

        const accessToken =
          localStorage.getItem(
            'accessToken'
          );

        const refreshToken =
          localStorage.getItem(
            'refreshToken'
          );

        if (
          !accessToken &&
          !refreshToken
        ) {

          return;

        }

        try {

          const {
            data
          } = await api.get(
            '/auth/me'
          );


          const usuario =
            data?.user ||
            data;


          if (
            activo &&
            usuario
          ) {

            guardarUsuario(
              usuario
            );

          }

        } catch (error) {

          if (
            !activo
          ) {

            return;

          }


          if (
            error.response?.status === 401
          ) {

            localStorage.removeItem(
              'accessToken'
            );

            localStorage.removeItem(
              'refreshToken'
            );

            localStorage.removeItem(
              'user'
            );

            setUser(
              null
            );

          }

        }

      }


      validarSesionAlIniciar();


      return () => {

        activo = false;

      };

    },
    []
  );


  /* =======================================================
     TIEMPO REAL
  ======================================================= */

  useEffect(
    () => {

      if (!user) {

        desconectarTiempoReal();

        return undefined;

      }


      const manejarEvento =
        (evento) => {

          if (
            evento?.type === 'data_changed' &&
            evento?.entity === 'usuarios' &&
            evento?.action === 'account_deleted' &&
            Number(evento?.id) === Number(user?.id)
          ) {
            desconectarTiempoReal();
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            setUser(null);
            window.location.hash = '#/';
            return;
          }

          if (
            import.meta.env.DEV
          ) {

            console.log(
              '[PAIE ROYALE - TIEMPO REAL]',
              evento
            );

          }

        };


      conectarTiempoReal(
        manejarEvento
      );


      return () => {

        desconectarTiempoReal();

      };

    },

    [user]

  );


  /* =======================================================
     CONTEXTO
  ======================================================= */

  return (

    <C.Provider
      value={{

        user,

        login,

        loginGoogle,

        completarRegistroGoogle,

        logout,

        updateUser,

        refreshUser,

        setUser:
          updateUser

      }}
    >

      {children}

    </C.Provider>

  );

}


/* =========================================================
   HOOK
========================================================= */

export const useAuth =
  () => useContext(C);