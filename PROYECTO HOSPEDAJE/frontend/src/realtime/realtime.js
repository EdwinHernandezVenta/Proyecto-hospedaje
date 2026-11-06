/* =========================================================
   PAIE ROYALE
   CONEXIÓN DE TIEMPO REAL DEL FRONTEND

   Utiliza Server-Sent Events (SSE) para recibir
   automáticamente los cambios realizados en el sistema.
========================================================= */

import { api } from '../api/http';

let eventSource = null;
let reconnectTimer = null;
let connecting = false;
let currentCallback = null;
let disconnectRequested = false;

async function obtenerTicket() {
  const respuesta = await api.get(
    '/realtime/ticket'
  );

  return respuesta.data?.ticket || null;
}

function programarReconexion() {
  if (reconnectTimer) {
    return;
  }

  if (
    disconnectRequested ||
    !localStorage.getItem('accessToken')
  ) {
    return;
  }

  reconnectTimer = setTimeout(
    () => {
      reconnectTimer = null;

      if (
        disconnectRequested
      ) {
        return;
      }

      conectarTiempoReal(
        currentCallback
      );
    },
    5000
  );
}

export function desconectarTiempoReal() {
  disconnectRequested = true;

  if (reconnectTimer) {
    clearTimeout(
      reconnectTimer
    );

    reconnectTimer = null;
  }

  if (eventSource) {
    try {
      eventSource.close();
    } catch {
      // La conexión ya puede estar cerrada.
    }

    eventSource = null;
  }

  connecting = false;
  currentCallback = null;
}

export async function conectarTiempoReal(
  onEvent
) {
  disconnectRequested = false;
  currentCallback = onEvent;

  if (eventSource) {
    return;
  }

  if (connecting) {
    return;
  }

  const token =
    localStorage.getItem(
      'accessToken'
    );

  if (!token) {
    return;
  }

  connecting = true;

  try {
    const ticket =
      await obtenerTicket();

    if (
      disconnectRequested ||
      !localStorage.getItem(
        'accessToken'
      )
    ) {
      connecting = false;
      return;
    }

    if (!ticket) {
      connecting = false;
      programarReconexion();
      return;
    }

    const url =
      `/api/v1/realtime/events?ticket=${encodeURIComponent(
        ticket
      )}`;

    const nuevaConexion =
      new EventSource(
        url,
        {
          withCredentials: true
        }
      );

    eventSource =
      nuevaConexion;

    connecting = false;

    nuevaConexion.onopen =
      () => {
        if (
          import.meta.env.DEV
        ) {
          console.log(
            '[PAIE ROYALE - TIEMPO REAL] Conectado correctamente'
          );
        }
      };

    nuevaConexion.addEventListener(
      'connected',
      (event) => {
        let data = {
          ok: true
        };

        try {
          data =
            JSON.parse(
              event.data
            );
        } catch {
          // Mantener información básica.
        }

        const evento = {
          type: 'connected',
          ...data
        };

        if (
          import.meta.env.DEV
        ) {
          console.log(
            '[PAIE ROYALE - TIEMPO REAL]',
            evento
          );
        }

        if (
          currentCallback
        ) {
          currentCallback(
            evento
          );
        }
      }
    );

    nuevaConexion.addEventListener(
      'data_changed',
      (event) => {
        let data = {};

        try {
          data =
            JSON.parse(
              event.data
            );
        } catch {
          return;
        }

        const evento = {
          type: 'data_changed',
          ...data
        };

        if (
          import.meta.env.DEV
        ) {
          console.log(
            '[PAIE ROYALE - TIEMPO REAL]',
            evento
          );
        }

        if (
          currentCallback
        ) {
          currentCallback(
            evento
          );
        }

        window.dispatchEvent(
          new CustomEvent(
            'paie-realtime-update',
            {
              detail: evento
            }
          )
        );
      }
    );

    nuevaConexion.onerror =
      () => {
        if (
          import.meta.env.DEV
        ) {
          console.warn(
            '[PAIE ROYALE - TIEMPO REAL] Conexión perdida. Reintentando...'
          );
        }

        if (
          eventSource ===
          nuevaConexion
        ) {
          try {
            nuevaConexion.close();
          } catch {
            // Ya puede estar cerrada.
          }

          eventSource = null;
        }

        connecting = false;

        programarReconexion();
      };

  } catch (error) {
    connecting = false;

    if (
      import.meta.env.DEV
    ) {
      console.error(
        '[PAIE ROYALE - TIEMPO REAL] Error al conectar:',
        error
      );
    }

    programarReconexion();
  }
}
