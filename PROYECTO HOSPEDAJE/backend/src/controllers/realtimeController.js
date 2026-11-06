/* =========================================================
   PAIE ROYALE
   CONTROLADOR DE TIEMPO REAL
========================================================= */

import crypto from 'crypto';

import {
  addClient
} from '../realtime/realtime.js';


/*
  Los tickets son temporales.

  Se utilizan para que EventSource pueda conectarse
  sin tener que colocar el JWT directamente en la URL.
*/

const tickets = new Map();


/* =========================================================
   CREAR TICKET
========================================================= */

export function createRealtimeTicket(
  req,
  res
) {

  const ticket = crypto.randomBytes(32).toString('hex');

  const expiresAt =
    Date.now() + (2 * 60 * 1000);


  tickets.set(
    ticket,
    {
      user: req.user,
      expiresAt
    }
  );


  res.json({
    ticket
  });

}


/* =========================================================
   CONECTAR CLIENTE
========================================================= */

export function connectRealtime(
  req,
  res
) {

  const ticket =
    String(
      req.query.ticket || ''
    );


  if (!ticket) {

    return res
      .status(401)
      .json({
        message:
          'Ticket de tiempo real requerido.'
      });

  }


  const session =
    tickets.get(ticket);


  if (!session) {

    return res
      .status(401)
      .json({
        message:
          'Ticket de tiempo real inválido.'
      });

  }


  if (
    session.expiresAt < Date.now()
  ) {

    tickets.delete(ticket);

    return res
      .status(401)
      .json({
        message:
          'Ticket de tiempo real expirado.'
      });

  }


  /*
    Un ticket solamente puede utilizarse
    para establecer una conexión.
  */

  tickets.delete(ticket);


  addClient(
    res,
    session.user
  );

}


/* =========================================================
   LIMPIEZA AUTOMÁTICA DE TICKETS
========================================================= */

setInterval(
  () => {

    const now = Date.now();

    for (
      const [
        ticket,
        session
      ] of tickets
    ) {

      if (
        session.expiresAt < now
      ) {

        tickets.delete(ticket);

      }

    }

  },
  60 * 1000
);