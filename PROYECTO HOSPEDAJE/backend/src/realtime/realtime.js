/* =========================================================
   PAIE ROYALE
   SISTEMA DE ACTUALIZACIONES EN TIEMPO REAL

   La conexión SSE también funciona como señal de presencia.
========================================================= */

import {
  marcarCierrePendiente,
  cancelarCierrePendiente
} from '../services/sessionService.js';

const clients = new Map();
let nextClientId = 1;

function existeOtraConexion(sessionId, excludedClientId) {
  if (!sessionId) {
    return false;
  }

  for (const [clientId, client] of clients) {
    if (
      clientId !== excludedClientId &&
      client.user?.sid === sessionId
    ) {
      return true;
    }
  }

  return false;
}

export function addClient(res, user = null) {
  const clientId = nextClientId++;

  clients.set(clientId, {
    res,
    user
  });

  if (user?.id && user?.sid) {
    cancelarCierrePendiente(
      user.id,
      user.sid
    ).catch(() => {});
  }

  res.setHeader(
    'Content-Type',
    'text/event-stream; charset=utf-8'
  );

  res.setHeader(
    'Cache-Control',
    'no-cache, no-transform'
  );

  res.setHeader(
    'Connection',
    'keep-alive'
  );

  res.setHeader(
    'X-Accel-Buffering',
    'no'
  );

  try {
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }
  } catch {
    // La respuesta puede haberse cerrado.
  }

  sendToClient(
    res,
    'connected',
    {
      ok: true,
      clientId
    }
  );

  const heartbeat = setInterval(() => {
    try {
      res.write(
        `: heartbeat ${Date.now()}\n\n`
      );
    } catch {
      clearInterval(heartbeat);
    }
  }, 25000);

  let conexionCerrada = false;

  const manejarCierre = () => {
    if (conexionCerrada) {
      return;
    }

    conexionCerrada = true;

    clearInterval(heartbeat);
    clients.delete(clientId);

    if (
      user?.id &&
      user?.sid &&
      !existeOtraConexion(
        user.sid,
        clientId
      )
    ) {
      marcarCierrePendiente(
        user.id,
        user.sid
      ).catch(() => {});
    }
  };

  res.on('close', manejarCierre);

  res.on('finish', manejarCierre);

  return clientId;
}

function sendToClient(res, event, data) {
  try {
    res.write(
      `event: ${event}\n`
    );

    res.write(
      `data: ${JSON.stringify(data)}\n\n`
    );
  } catch {
    // La conexión puede haberse cerrado.
  }
}

export function broadcast(event, data = {}) {
  const payload = {
    event,
    ...data,
    timestamp: new Date().toISOString()
  };

  for (const [clientId, client] of clients) {
    try {
      sendToClient(
        client.res,
        event,
        payload
      );
    } catch {
      clients.delete(clientId);
    }
  }
}

export function getConnectedClients() {
  return clients.size;
}
