import axios from 'axios';


/* =========================================================
   API
========================================================= */

export const api = axios.create({

  baseURL: '/api/v1'

});


/* =========================================================
   PETICIÓN
========================================================= */

api.interceptors.request.use(

  (config) => {

    const token =
      localStorage.getItem(
        'accessToken'
      );


    if (token) {

      config.headers =
        config.headers || {};


      config.headers.Authorization =
        `Bearer ${token}`;

    }


    return config;

  },

  (error) => {

    return Promise.reject(
      error
    );

  }

);


/* =========================================================
   CONTROL DE REDIRECCIÓN
========================================================= */

let redirecting = false;


/* =========================================================
   CONTROL DE REFRESH
========================================================= */

let refreshingPromise = null;


/* =========================================================
   RENOVAR TOKEN
========================================================= */

async function renovarAccessToken() {

  if (
    refreshingPromise
  ) {

    return refreshingPromise;

  }


  const refreshToken =
    localStorage.getItem(
      'refreshToken'
    );


  if (!refreshToken) {

    return null;

  }


  refreshingPromise =
    axios
      .post(
        '/api/v1/auth/refresh',
        {
          refreshToken
        }
      )
      .then(
        (response) => {

          const nuevoToken =
            response.data?.accessToken;


          if (!nuevoToken) {

            throw new Error(
              'No se recibió un nuevo access token'
            );

          }


          localStorage.setItem(
            'accessToken',
            nuevoToken
          );


          /*
           * El refresh puede devolver
           * información actualizada del usuario.
           */

          if (
            response.data?.user
          ) {

            localStorage.setItem(
              'user',
              JSON.stringify(
                response.data.user
              )
            );

          }


          return nuevoToken;

        }
      )
      .catch(
        () => {

          /*
           * Refresh inválido.
           *
           * Limpiar la sesión local.
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


          return null;

        }
      )
      .finally(
        () => {

          refreshingPromise =
            null;

        }
      );


  return refreshingPromise;

}


/* =========================================================
   RESPUESTA
========================================================= */

api.interceptors.response.use(

  (response) => {

    return response;

  },

  async (error) => {

    const status =
      error.response?.status;


    const requestUrl =
      error.config?.url || '';


    const originalRequest =
      error.config;


    const isLoginRequest =
      requestUrl.includes(
        '/auth/login'
      );


    const isRegisterRequest =
      requestUrl.includes(
        '/auth/register'
      );


    const isRefreshRequest =
      requestUrl.includes(
        '/auth/refresh'
      );


    /*
     * =====================================================
     * ACCESS TOKEN VENCIDO
     * =====================================================
     */

    if (
      status === 401 &&
      !isLoginRequest &&
      !isRegisterRequest &&
      !isRefreshRequest &&
      originalRequest &&
      !originalRequest._retry
    ) {

      originalRequest._retry =
        true;


      const nuevoToken =
        await renovarAccessToken();


      if (nuevoToken) {

        originalRequest.headers =
          originalRequest.headers || {};


        originalRequest.headers.Authorization =
          `Bearer ${nuevoToken}`;


        return api(
          originalRequest
        );

      }

    }


    /*
     * =====================================================
     * SESIÓN REALMENTE TERMINADA
     * =====================================================
     */

    if (
      status === 401 &&
      !isLoginRequest &&
      !isRegisterRequest &&
      !isRefreshRequest &&
      !redirecting
    ) {

      redirecting =
        true;


      localStorage.removeItem(
        'accessToken'
      );

      localStorage.removeItem(
        'refreshToken'
      );

      localStorage.removeItem(
        'user'
      );


      window.location.hash =
        '#/login';

    }


    return Promise.reject(
      error
    );

  }

);


/* =========================================================
   EXPORTACIÓN POR DEFECTO
========================================================= */

export default api;