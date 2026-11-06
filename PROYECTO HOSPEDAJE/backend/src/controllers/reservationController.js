import { pool, query } from '../config/db.js';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

import { reservationPdf } from '../utils/pdf.js';
import { rowsToXlsx } from '../utils/excel.js';
import {
  enviarCorreoConfirmacionReserva,
  enviarCorreoCancelacionReserva,
  enviarCorreoEliminacionReserva,
  enviarCorreoPagoRechazado
} from '../services/emailService.js';
import { broadcast } from '../realtime/realtime.js';

import PDFDocument from 'pdfkit';


/* =========================================================
   CONSTANTES
========================================================= */

const METODOS_PAGO_VALIDOS = [
  'efectivo',
  'tarjeta',
  'transferencia'
];

const ESTADOS_RESERVA_QUE_BLOQUEAN = [
  'cancelada',
  'check-out'
];


/* =========================================================
   UTILIDADES GENERALES
========================================================= */

function emitirCambioReserva(action, reservationId) {
  broadcast({
    type: 'data_changed',
    entity: 'reservas',
    action,
    id: Number(reservationId)
  });
}


function errorConEstado(message, status = 400) {
  return Object.assign(
    new Error(message),
    { status }
  );
}


function esFechaValida(valor) {
  if (!valor) return false;

  const fecha = new Date(valor);

  return !Number.isNaN(fecha.getTime());
}


function normalizarReferenciaIncluida(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}


function obtenerInclusionesPaquete(valor) {
  if (valor === null || valor === undefined) {
    return [];
  }

  if (Array.isArray(valor)) {
    return valor
      .flatMap(item => {

        if (
          item &&
          typeof item === 'object'
        ) {
          return [
            item.nombre_servicio ||
            item.nombre ||
            item.descripcion ||
            item.referencia ||
            ''
          ];
        }

        return [String(item)];
      })
      .map(item => String(item).trim())
      .filter(Boolean);
  }

  if (
    typeof valor === 'object'
  ) {
    return [
      valor.nombre_servicio ||
      valor.nombre ||
      valor.descripcion ||
      valor.referencia ||
      ''
    ]
      .map(item => String(item).trim())
      .filter(Boolean);
  }

  const texto = String(valor).trim();

  if (!texto) {
    return [];
  }

  /*
   * Si la columna contiene un JSON válido,
   * intentamos interpretarlo primero.
   */
  try {

    const parsed =
      JSON.parse(texto);

    if (
      Array.isArray(parsed) ||
      (
        parsed &&
        typeof parsed === 'object'
      )
    ) {
      return obtenerInclusionesPaquete(parsed);
    }

  } catch {
    /*
     * No es JSON.
     * Se procesa como texto normal.
     */
  }

  return texto
    .split(/[,;\n]+/)
    .map(item => item.trim())
    .filter(Boolean);
}


/* =========================================================
   CLIENTE
========================================================= */

async function clientForUser(req) {
  return (
    await query(
      `SELECT c.*
       FROM clientes c
       WHERE c.id_usuario = ?
       LIMIT 1`,
      [req.user.id]
    )
  )[0];
}


async function reservationForUser(req, id) {
  const r = (
    await query(
      `SELECT
         r.*,
         c.correo AS cliente_correo
       FROM reservas r
       JOIN clientes c
         ON c.id = r.id_cliente
       WHERE r.id = ?`,
      [id]
    )
  )[0];

  if (!r) {
    return null;
  }

  if (req.user.rol === 'Cliente') {
    const c = await clientForUser(req);

    if (!c || c.id !== r.id_cliente) {
      return {
        forbidden: true
      };
    }
  }

  return r;
}


/* =========================================================
   DETALLES DE RECURSOS
========================================================= */

async function habitacionesDeReserva(
  conn,
  reservationId
) {
  const [rows] = await conn.execute(
    `SELECT DISTINCT id_habitacion
     FROM reserva_detalle
     WHERE id_reserva = ?
       AND id_habitacion IS NOT NULL`,
    [reservationId]
  );

  return rows
    .map(row => Number(row.id_habitacion))
    .filter(Number.isInteger);
}


async function serviciosDeReserva(
  conn,
  reservationId
) {
  const [rows] = await conn.execute(
    `SELECT
       id_servicio,
       COALESCE(SUM(cantidad), 0) AS cantidad
     FROM reserva_detalle
     WHERE id_reserva = ?
       AND id_servicio IS NOT NULL
     GROUP BY id_servicio`,
    [reservationId]
  );

  return rows
    .map(row => ({
      id: Number(row.id_servicio),
      cantidad: Math.max(1, Number(row.cantidad || 1))
    }))
    .filter(item => Number.isInteger(item.id) && item.id > 0);
}

async function paquetesDeReserva(
  conn,
  reservationId
) {
  const [rows] = await conn.execute(
    `SELECT DISTINCT id_paquete
     FROM reserva_detalle
     WHERE id_reserva = ?
       AND id_paquete IS NOT NULL`,
    [reservationId]
  );

  return rows
    .map(row => Number(row.id_paquete))
    .filter(Number.isInteger);
}


/* =========================================================
   EXPANDIR RECURSOS INCLUIDOS EN PAQUETES
========================================================= */

async function expandirRecursosDePaquetes(
  conn,
  detalles
) {
  /*
   * Esta función únicamente expande los recursos que vienen
   * incluidos en los paquetes. La lógica de habitaciones
   * existente se conserva: solo se agrega una habitación
   * incluida cuando el paquete la declara explícitamente.
   *
   * Regla de agregación:
   * - Un recurso incluido no se duplica.
   * - Si varios paquetes incluyen el mismo servicio, sus
   *   cantidades se acumulan.
   * - Si además el servicio fue seleccionado manualmente,
   *   se conserva la mayor cantidad necesaria para no duplicar
   *   el mismo recurso.
   * - Un servicio cubierto por un paquete queda con subtotal 0.
   */
  const resultado = Array.isArray(detalles)
    ? detalles.map(d => ({ ...d }))
    : [];

  const paquetes = resultado.filter(
    d =>
      d &&
      d.id_paquete !== undefined &&
      d.id_paquete !== null &&
      d.id_paquete !== ''
  );

  if (!paquetes.length) {
    return resultado;
  }

  const [habitaciones] = await conn.execute(
    `SELECT id, numero_habitacion
     FROM habitaciones
     ORDER BY id ASC`
  );

  const [servicios] = await conn.execute(
    `SELECT id, nombre_servicio
     FROM servicios
     ORDER BY id ASC`
  );

  const habitacionDetallePorId = new Map();
  const servicioDetallePorId = new Map();

  /*
   * Cantidad manual solicitada por servicio.
   * La usamos para combinarla con lo incluido por paquetes.
   */
  const cantidadManualServicio = new Map();

  resultado.forEach((detalle, index) => {
    if (
      detalle?.id_habitacion !== undefined &&
      detalle?.id_habitacion !== null &&
      detalle?.id_habitacion !== ''
    ) {
      const id = Number(detalle.id_habitacion);

      if (Number.isInteger(id) && id > 0) {
        habitacionDetallePorId.set(id, index);
      }
    }

    if (
      detalle?.id_servicio !== undefined &&
      detalle?.id_servicio !== null &&
      detalle?.id_servicio !== ''
    ) {
      const id = Number(detalle.id_servicio);

      if (Number.isInteger(id) && id > 0) {
        servicioDetallePorId.set(id, index);

        /*
         * Una línea que ya vino marcada como incluida no
         * cuenta como selección manual.
         */
        if (!detalle.incluido_en_paquete) {
          const cantidad = Math.max(
            1,
            Number(detalle.cantidad || 1)
          );

          cantidadManualServicio.set(
            id,
            Math.max(
              Number(cantidadManualServicio.get(id) || 0),
              cantidad
            )
          );
        }
      }
    }
  });

  /*
   * Cantidad incluida por servicio, acumulada por paquete.
   */
  const cantidadIncluidaServicio = new Map();
  const paqueteOrigenServicio = new Map();

  for (const detallePaquete of paquetes) {
    const idPaquete = Number(detallePaquete.id_paquete);

    if (!Number.isInteger(idPaquete) || idPaquete <= 0) {
      continue;
    }

    const cantidadPaquete = Math.max(
      1,
      Number(detallePaquete.cantidad || 1)
    );

    const [paqueteRows] = await conn.execute(
      `SELECT
         id,
         nombre,
         servicios_incluidos,
         disponibilidad,
         estado
       FROM paquetes
       WHERE id = ?
       FOR UPDATE`,
      [idPaquete]
    );

    if (!paqueteRows.length) {
      throw errorConEstado(
        'El paquete seleccionado no existe',
        404
      );
    }

    const paquete = paqueteRows[0];
    const disponible = Number(paquete.disponibilidad) === 1;
    const estadoPaquete = String(
      paquete.estado ?? ''
    ).trim().toLowerCase();

    const estadoValido = [
      '1',
      'true',
      'activo',
      'en_promocion',
      'en promoción'
    ].includes(estadoPaquete);

    if (!disponible || !estadoValido) {
      throw errorConEstado(
        `El paquete "${paquete.nombre}" no está disponible`,
        409
      );
    }

    /*
     * Paquetes nuevos: las inclusiones reales se resuelven por
     * ID desde paquete_servicios. Esto evita depender del texto
     * escrito en servicios_incluidos.
     *
     * Los paquetes antiguos que todavía no tienen relaciones
     * reales siguen usando el parser de compatibilidad de abajo.
     */
    const [componentesRelacionados] = await conn.execute(
      `SELECT
         ps.id_servicio,
         ps.id_habitacion,
         ps.cantidad,
         h.numero_habitacion,
         s.nombre_servicio
       FROM paquete_servicios ps
       LEFT JOIN habitaciones h ON h.id = ps.id_habitacion
       LEFT JOIN servicios s ON s.id = ps.id_servicio
       WHERE ps.id_paquete = ?
         AND (ps.id_servicio IS NOT NULL OR ps.id_habitacion IS NOT NULL)
       ORDER BY ps.id ASC`,
      [idPaquete]
    );

    if (componentesRelacionados.length) {
      for (const componente of componentesRelacionados) {
        if (componente.id_habitacion !== null && componente.id_habitacion !== undefined) {
          const idHabitacion = Number(componente.id_habitacion);
          const habitacion = habitaciones.find(
            item => Number(item.id) === idHabitacion
          );

          if (!habitacion) {
            throw errorConEstado(
              `La habitación incluida en el paquete "${paquete.nombre}" ya no existe`,
              409
            );
          }

          const indiceExistente = habitacionDetallePorId.get(idHabitacion);

          if (indiceExistente !== undefined) {
            resultado[indiceExistente] = {
              ...resultado[indiceExistente],
              cantidad: 1,
              subtotal: 0,
              incluido_en_paquete: true,
              id_paquete_origen:
                resultado[indiceExistente].id_paquete_origen || idPaquete
            };
          } else {
            resultado.push({
              id_habitacion: idHabitacion,
              cantidad: 1,
              subtotal: 0,
              incluido_en_paquete: true,
              id_paquete_origen: idPaquete
            });

            habitacionDetallePorId.set(
              idHabitacion,
              resultado.length - 1
            );
          }

          continue;
        }

        if (componente.id_servicio !== null && componente.id_servicio !== undefined) {
          const idServicio = Number(componente.id_servicio);

          if (!servicios.some(item => Number(item.id) === idServicio)) {
            throw errorConEstado(
              `El servicio incluido en el paquete "${paquete.nombre}" ya no existe`,
              409
            );
          }

          const cantidadComponente = Math.max(
            1,
            Number(componente.cantidad || 1)
          );

          cantidadIncluidaServicio.set(
            idServicio,
            Number(cantidadIncluidaServicio.get(idServicio) || 0) +
              (cantidadComponente * cantidadPaquete)
          );

          if (!paqueteOrigenServicio.has(idServicio)) {
            paqueteOrigenServicio.set(idServicio, idPaquete);
          }
        }
      }

      continue;
    }

    /*
     * Compatibilidad con paquetes antiguos que solo tienen
     * servicios_incluidos como texto.
     */
    const inclusiones = obtenerInclusionesPaquete(
      paquete.servicios_incluidos
    );

    for (const inclusion of inclusiones) {
      const referencia = normalizarReferenciaIncluida(inclusion);

      if (!referencia) {
        continue;
      }

      /* =====================================================
         HABITACIÓN INCLUIDA
      ===================================================== */
      const matchHabitacion = referencia.match(
        /(?:habitacion|hab|room)\s*(?:numero\s*)?(?:#\s*)?(\d+)/i
      );

      if (matchHabitacion) {
        const numeroHabitacion = String(
          matchHabitacion[1]
        ).trim();

        const habitacion = habitaciones.find(
          item =>
            String(item.numero_habitacion).trim() ===
            numeroHabitacion
        );

        if (!habitacion) {
          throw errorConEstado(
            `La habitación ${numeroHabitacion} indicada en el paquete "${paquete.nombre}" no existe`,
            409
          );
        }

        const idHabitacion = Number(habitacion.id);
        const indiceExistente =
          habitacionDetallePorId.get(idHabitacion);

        if (indiceExistente !== undefined) {
          resultado[indiceExistente] = {
            ...resultado[indiceExistente],
            /*
             * Una habitación física no puede reservarse dos
             * veces como si fueran dos habitaciones distintas.
             * Se conserva una sola línea y no se cobra.
             */
            cantidad: 1,
            subtotal: 0,
            incluido_en_paquete: true,
            id_paquete_origen:
              resultado[indiceExistente].id_paquete_origen ||
              idPaquete
          };
        } else {
          resultado.push({
            id_habitacion: idHabitacion,
            cantidad: 1,
            subtotal: 0,
            incluido_en_paquete: true,
            id_paquete_origen: idPaquete
          });

          habitacionDetallePorId.set(
            idHabitacion,
            resultado.length - 1
          );
        }

        continue;
      }

      /* =====================================================
         SERVICIO INCLUIDO
      ===================================================== */
      const servicio = servicios.find(
        item =>
          normalizarReferenciaIncluida(
            item.nombre_servicio
          ) === referencia
      );

      if (!servicio) {
        continue;
      }

      const idServicio = Number(servicio.id);

      cantidadIncluidaServicio.set(
        idServicio,
        Number(
          cantidadIncluidaServicio.get(idServicio) || 0
        ) + cantidadPaquete
      );

      if (!paqueteOrigenServicio.has(idServicio)) {
        paqueteOrigenServicio.set(idServicio, idPaquete);
      }
    }
  }

  /*
   * Materializamos cada servicio incluido una sola vez.
   */
  for (const [
    idServicio,
    cantidadIncluida
  ] of cantidadIncluidaServicio.entries()) {
    const indiceExistente =
      servicioDetallePorId.get(idServicio);

    const cantidadManual =
      Number(
        cantidadManualServicio.get(idServicio) || 0
      );

    /*
     * No duplicamos la misma unidad por aparecer tanto en
     * un paquete como en la selección manual. Se reserva la
     * cantidad necesaria para cubrir ambos casos.
     */
    const cantidadFinal = Math.max(
      1,
      cantidadIncluida,
      cantidadManual
    );

    if (indiceExistente !== undefined) {
      const detalleExistente =
        resultado[indiceExistente];

      resultado[indiceExistente] = {
        ...detalleExistente,
        cantidad: cantidadFinal,
        subtotal: 0,
        incluido_en_paquete: true,
        id_paquete_origen:
          detalleExistente.id_paquete_origen ||
          paqueteOrigenServicio.get(idServicio)
      };
    } else {
      resultado.push({
        id_servicio: idServicio,
        cantidad: cantidadFinal,
        subtotal: 0,
        incluido_en_paquete: true,
        id_paquete_origen:
          paqueteOrigenServicio.get(idServicio)
      });

      servicioDetallePorId.set(
        idServicio,
        resultado.length - 1
      );
    }
  }

  return resultado;
}

/* =========================================================
   LIBERAR HABITACIONES
========================================================= */

async function liberarHabitacionesDeReserva(
  conn,
  reservationId
) {
  const habitaciones =
    await habitacionesDeReserva(
      conn,
      reservationId
    );

  if (!habitaciones.length) {
    return;
  }

  for (const idHabitacion of habitaciones) {

    const [otrasReservas] =
      await conn.execute(
        `SELECT r.id
         FROM reservas r
         JOIN reserva_detalle rd
           ON rd.id_reserva = r.id
         WHERE rd.id_habitacion = ?
           AND r.id <> ?
           AND r.estado NOT IN (
             'cancelada',
             'check-out'
           )
         LIMIT 1`,
        [
          idHabitacion,
          reservationId
        ]
      );

    if (otrasReservas.length) {
      continue;
    }

    await conn.execute(
      `UPDATE habitaciones
       SET estado = 'disponible'
       WHERE id = ?
         AND estado = 'ocupada'`,
      [idHabitacion]
    );
  }
}


/* =========================================================
   LIBERAR SERVICIOS Y PAQUETES
========================================================= */

async function liberarServiciosYPaquetesDeReserva(
  conn,
  reservationId
) {
  const servicios =
    await serviciosDeReserva(
      conn,
      reservationId
    );

  const paquetes =
    await paquetesDeReserva(
      conn,
      reservationId
    );

  for (const servicio of servicios) {
    await conn.execute(
      `UPDATE servicios
       SET cantidad_disponible = cantidad_disponible + ?
       WHERE id = ?`,
      [servicio.cantidad, servicio.id]
    );
  }


  for (const idPaquete of paquetes) {

    const [otrasReservas] =
      await conn.execute(
        `SELECT r.id
         FROM reservas r
         JOIN reserva_detalle rd
           ON rd.id_reserva = r.id
         WHERE rd.id_paquete = ?
           AND r.id <> ?
           AND r.estado NOT IN (
             'cancelada',
             'check-out'
           )
         LIMIT 1`,
        [
          idPaquete,
          reservationId
        ]
      );

    if (otrasReservas.length) {
      continue;
    }

    await conn.execute(
      `UPDATE paquetes
       SET estado = 'activo'
       WHERE id = ?
         AND (
           disponibilidad = 1
           OR disponibilidad = TRUE
         )`,
      [idPaquete]
    );
  }
}


/* =========================================================
   OCUPAR SERVICIOS Y PAQUETES
========================================================= */

async function ocuparServiciosYPaquetesDeReserva(
  conn,
  reservationId
) {
  const servicios =
    await serviciosDeReserva(
      conn,
      reservationId
    );

  const paquetes =
    await paquetesDeReserva(
      conn,
      reservationId
    );


  for (const servicioReservado of servicios) {

    const [servicio] =
      await conn.execute(
        `SELECT
           id,
           nombre_servicio,
           disponibilidad,
           cantidad_disponible,
           estado
         FROM servicios
         WHERE id = ?
         FOR UPDATE`,
        [servicioReservado.id]
      );

    if (!servicio.length) {
      throw errorConEstado(
        'El servicio asociado a la reserva ya no existe',
        409
      );
    }

    const cantidadDisponible = Number(
      servicio[0].cantidad_disponible ?? 0
    );

    if (
      Number(servicio[0].disponibilidad) !== 1 ||
      Number(servicio[0].estado) !== 1 ||
      cantidadDisponible < servicioReservado.cantidad
    ) {
      throw errorConEstado(
        cantidadDisponible <= 0
          ? `El servicio "${servicio[0].nombre_servicio}" está agotado`
          : `El servicio "${servicio[0].nombre_servicio}" no tiene suficientes unidades disponibles`,
        409
      );
    }

    await conn.execute(
      `UPDATE servicios
       SET cantidad_disponible = cantidad_disponible - ?
       WHERE id = ?
         AND cantidad_disponible >= ?`,
      [
        servicioReservado.cantidad,
        servicioReservado.id,
        servicioReservado.cantidad
      ]
    );
  }


  for (const idPaquete of paquetes) {

    const [paquete] =
      await conn.execute(
        `SELECT
           id,
           nombre,
           disponibilidad,
           estado
         FROM paquetes
         WHERE id = ?
         FOR UPDATE`,
        [idPaquete]
      );

    if (!paquete.length) {
      throw errorConEstado(
        'El paquete asociado a la reserva ya no existe',
        409
      );
    }

    const estadoPaquete =
      String(
        paquete[0].estado ?? ''
      )
        .trim()
        .toLowerCase();

    const estadoValido = [
      '1',
      'true',
      'activo',
      'en_promocion',
      'en promoción'
    ].includes(
      estadoPaquete
    );

    if (
      Number(
        paquete[0].disponibilidad
      ) !== 1 ||
      !estadoValido
    ) {
      throw errorConEstado(
        `El paquete "${paquete[0].nombre}" no está disponible`,
        409
      );
    }

    await conn.execute(
      `UPDATE paquetes
       SET estado = 'inactivo'
       WHERE id = ?`,
      [idPaquete]
    );
  }
}


/* =========================================================
   OCUPAR HABITACIONES
   IMPORTANTE:
   La lógica existente se conserva.
   La única diferencia es que una reserva sin
   habitación simplemente no necesita ocupar ninguna.
========================================================= */

async function ocuparHabitacionesDeReserva(
  conn,
  reservationId
) {
  const habitaciones =
    await habitacionesDeReserva(
      conn,
      reservationId
    );

  /*
   * Una reserva de servicio o paquete puede no tener
   * habitación. En ese caso no hay nada que ocupar.
   */
  if (!habitaciones.length) {
    return;
  }

  for (const idHabitacion of habitaciones) {

    const [room] =
      await conn.execute(
        `SELECT
           id,
           numero_habitacion,
           estado
         FROM habitaciones
         WHERE id = ?
         FOR UPDATE`,
        [idHabitacion]
      );

    if (!room.length) {
      throw errorConEstado(
        `La habitación ${idHabitacion} no existe`,
        404
      );
    }

    if (
      room[0].estado ===
      'inhabilitada'
    ) {
      throw errorConEstado(
        `La habitación ${room[0].numero_habitacion} está inhabilitada`,
        409
      );
    }

    const [conflictos] =
      await conn.execute(
        `SELECT r.id
         FROM reservas r
         JOIN reserva_detalle rd
           ON rd.id_reserva = r.id
         WHERE rd.id_habitacion = ?
           AND r.id <> ?
           AND r.estado NOT IN (
             'cancelada',
             'check-out'
           )
           AND r.fecha_inicio < (
             SELECT fecha_fin
             FROM reservas
             WHERE id = ?
           )
           AND r.fecha_fin > (
             SELECT fecha_inicio
             FROM reservas
             WHERE id = ?
           )
         LIMIT 1`,
        [
          idHabitacion,
          reservationId,
          reservationId,
          reservationId
        ]
      );

    if (conflictos.length) {
      throw errorConEstado(
        `La habitación ${room[0].numero_habitacion} tiene otra reserva activa`,
        409
      );
    }

    await conn.execute(
      `UPDATE habitaciones
       SET estado = 'ocupada'
       WHERE id = ?`,
      [idHabitacion]
    );
  }
}


/* =========================================================
   OCUPAR TODOS LOS RECURSOS
========================================================= */

async function ocuparRecursosDeReserva(
  conn,
  reservationId
) {
  await ocuparHabitacionesDeReserva(
    conn,
    reservationId
  );

  await ocuparServiciosYPaquetesDeReserva(
    conn,
    reservationId
  );
}


/* =========================================================
   DATOS PARA NOTIFICACIONES DE RESERVA
========================================================= */

async function obtenerResumenCorreoReserva(conn, reservationId) {
  const [reservas] = await conn.execute(
    `SELECT
       r.id,
       r.numero_confirmacion,
       r.fecha_inicio,
       r.fecha_fin,
       r.numero_personas,
       r.valor_total,
       r.anticipo,
       r.estado,
       (SELECT COUNT(*) FROM pagos pr WHERE pr.id_reserva = r.id AND pr.estado = 'rechazado') AS intentos_rechazados,
       c.nombre,
       c.apellido,
       c.correo
     FROM reservas r
     JOIN clientes c ON c.id = r.id_cliente
     WHERE r.id = ?
     LIMIT 1`,
    [reservationId]
  );

  if (!reservas.length) return null;

  const [detalles] = await conn.execute(
    `SELECT
       rd.id_habitacion,
       rd.id_servicio,
       rd.id_paquete,
       rd.cantidad,
       h.numero_habitacion,
       s.nombre_servicio,
       p.nombre AS nombre_paquete
     FROM reserva_detalle rd
     LEFT JOIN habitaciones h ON h.id = rd.id_habitacion
     LEFT JOIN servicios s ON s.id = rd.id_servicio
     LEFT JOIN paquetes p ON p.id = rd.id_paquete
     WHERE rd.id_reserva = ?
     ORDER BY rd.id ASC`,
    [reservationId]
  );

  const [pagos] = await conn.execute(
    `SELECT
       id,
       valor,
       metodo_pago,
       estado,
       observaciones,
       fecha,
       fecha_confirmacion,
       referencia_externa,
       (
         SELECT COALESCE(SUM(p2.valor), 0)
         FROM pagos p2
         WHERE p2.id_reserva = ?
           AND p2.estado = 'confirmado'
       ) AS total_confirmado
     FROM pagos
     WHERE id_reserva = ?
     ORDER BY id DESC
     LIMIT 1`,
    [reservationId, reservationId]
  );

  const reserva = reservas[0];
  const habitaciones = detalles
    .filter(d => d.id_habitacion !== null && d.numero_habitacion !== null)
    .map(d => String(d.numero_habitacion));

  const paquetes = detalles
    .filter(d => d.id_paquete !== null && d.nombre_paquete)
    .map(d => ({
      nombre: String(d.nombre_paquete),
      cantidad: Math.max(1, Number(d.cantidad || 1))
    }));

  return {
    id: Number(reserva.id),
    numero_confirmacion: reserva.numero_confirmacion,
    cliente_nombre: [reserva.nombre, reserva.apellido].filter(Boolean).join(' ').trim() || 'Cliente',
    cliente_correo: reserva.correo,
    fecha_inicio: reserva.fecha_inicio,
    fecha_fin: reserva.fecha_fin,
    numero_personas: Number(reserva.numero_personas || 0),
    valor_total: Number(reserva.valor_total || 0),
    anticipo: Number(reserva.valor_total || 0),
    estado: reserva.estado,
    intentos_rechazados: Number(reserva.intentos_rechazados || 0),
    habitaciones: [...new Set(habitaciones)],
    servicios: detalles
      .filter(d => d.id_servicio !== null && d.nombre_servicio)
      .reduce((lista, d) => {
        const existente = lista.find(item => item.id === Number(d.id_servicio));
        const cantidad = Math.max(1, Number(d.cantidad || 1));
        if (existente) existente.cantidad += cantidad;
        else lista.push({ id: Number(d.id_servicio), nombre: String(d.nombre_servicio), cantidad });
        return lista;
      }, []),
    paquetes,
    pago: pagos[0]
      ? {
          id: Number(pagos[0].id),
          valor: Number(pagos[0].valor || 0),
          metodo: pagos[0].metodo_pago,
          estado: pagos[0].estado,
          observaciones: pagos[0].observaciones,
          referencia_externa: pagos[0].referencia_externa,
          fecha: pagos[0].fecha,
          fecha_confirmacion: pagos[0].fecha_confirmacion,
          total_confirmado: Number(pagos[0].total_confirmado || 0),
          porcentaje: Number(reserva.valor_total || 0) > 0
            ? Number(((Number(pagos[0].total_confirmado || 0) / Number(reserva.valor_total || 0)) * 100).toFixed(2))
            : 0,
          saldo: Math.max(0, Number(reserva.valor_total || 0) - Number(pagos[0].total_confirmado || 0))
        }
      : null
  };
}

async function enviarConfirmacionReserva(reservationId, pdfPath = null) {
  const resumen = await obtenerResumenCorreoReserva(pool, reservationId);
  if (!resumen || !resumen.cliente_correo) return;
  await enviarCorreoConfirmacionReserva(resumen, pdfPath);
}

/* =========================================================
   COMPROBANTE PDF DE RESULTADO DEL PAGO
========================================================= */

async function generarPdfComprobantePago({ resumen, pago, estado, observaciones = '' }) {
  const uploadsDir = path.resolve('uploads');
  await fs.mkdir(uploadsDir, { recursive: true });
  const filename = `comprobante-pago-${resumen.id}-${pago.id}-${Date.now()}.pdf`;
  const filePath = path.join(uploadsDir, filename);
  const doc = new PDFDocument({ size: 'A4', margin: 48 });
  const stream = (await import('fs')).createWriteStream(filePath);
  doc.pipe(stream);

  const money = (value) => `$ ${Number(value || 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fecha = (value) => value ? new Date(value).toLocaleString('es-CO') : '—';
  const total = Number(resumen.valor_total || 0);
  const pagado = Number(resumen.pago?.total_confirmado ?? 0);
  const metodo = String(pago.metodo_pago || resumen.pago?.metodo || 'No especificado').toUpperCase();
  const habitaciones = Array.isArray(resumen.habitaciones) ? resumen.habitaciones : [];
  const aprobado = estado === 'confirmado';

  doc.font('Helvetica-Bold').fontSize(20).text('PAIE ROYALE', { align: 'center' });
  doc.moveDown(1.2);
  doc.fontSize(12).text('CLIENTE');
  doc.font('Helvetica').fontSize(10).moveDown(0.4);
  doc.text(`Cliente: ${resumen.cliente_nombre || '—'}`);
  doc.moveDown(1);
  doc.font('Helvetica-Bold').fontSize(12).text('INFORMACIÓN');
  doc.font('Helvetica').fontSize(10).moveDown(0.4);
  doc.text(`Fecha de emisión: ${fecha(new Date())}`);
  doc.text(`Fecha del pago: ${fecha(pago.fecha || new Date())}`);
  doc.text(`Método de pago: ${metodo}`);
  doc.text(`Valor del pago: ${money(pago.valor)}`);
  doc.text(`Estado: ${aprobado ? 'Aprobado' : 'Rechazado'}`);
  doc.moveDown(1);
  doc.font('Helvetica-Bold').fontSize(12).text('RESERVA');
  doc.font('Helvetica').fontSize(10).moveDown(0.4);
  doc.text(`Habitación: ${habitaciones.length ? habitaciones.join(', ') : '—'}`);
  doc.text(`Código de reserva: ${resumen.numero_confirmacion || '—'}`);
  doc.text(`Entrada: ${fecha(resumen.fecha_inicio)}`);
  doc.text(`Salida: ${fecha(resumen.fecha_fin)}`);
  doc.text(`Total de la reserva: ${money(total)}`);
  doc.text(`Total pagado confirmado: ${money(pagado)}`);
  doc.end();
  await new Promise((resolve, reject) => { stream.on('finish', resolve); stream.on('error', reject); });
  return { filename, filePath, url: `/uploads/${filename}` };
}

/* =========================================================
   DISPONIBILIDAD
========================================================= */

export async function availability(
  req,
  res,
  next
) {
  try {

    const {
      fecha_inicio,
      fecha_fin
    } = req.query;

    if (
      !fecha_inicio ||
      !fecha_fin
    ) {
      return res.status(422).json({
        message:
          'Debes indicar fecha_inicio y fecha_fin'
      });
    }

    if (
      !esFechaValida(fecha_inicio) ||
      !esFechaValida(fecha_fin)
    ) {
      return res.status(422).json({
        message:
          'Las fechas indicadas no son válidas'
      });
    }

    if (
      new Date(fecha_fin) <=
      new Date(fecha_inicio)
    ) {
      return res.status(422).json({
        message:
          'La fecha de salida debe ser posterior a la fecha de entrada'
      });
    }

    const rows = await query(
      `SELECT h.*
       FROM habitaciones h
       WHERE h.estado = 'disponible'

       AND NOT EXISTS (
         SELECT 1
         FROM reserva_detalle d
         JOIN reservas r
           ON r.id = d.id_reserva

         WHERE d.id_habitacion = h.id

           AND r.estado NOT IN (
             'cancelada',
             'check-out'
           )

           AND r.fecha_inicio < ?
           AND r.fecha_fin > ?
       )

       ORDER BY h.id ASC`,
      [
        fecha_fin,
        fecha_inicio
      ]
    );

    res.json(rows);

  } catch (e) {
    next(e);
  }
}


/* =========================================================
   CREAR RESERVA
========================================================= */

export async function create(
  req,
  res,
  next
) {
  const conn =
    await pool.getConnection();

  try {

    await conn.beginTransaction();

    let id_cliente =
      req.body.id_cliente;

    if (
      req.user.rol === 'Cliente'
    ) {

      const c =
        await clientForUser(req);

      if (!c) {

        await conn.rollback();

        return res.status(400).json({
          message:
            'El usuario no tiene perfil de cliente'
        });
      }

      id_cliente =
        c.id;
    }

    if (!id_cliente) {

      await conn.rollback();

      return res.status(422).json({
        message:
          'El cliente es obligatorio'
      });
    }

    const {
      fecha_inicio,
      fecha_fin,
      numero_personas,
      detalles = [],
      notas
    } = req.body;

    /*
     * Para clientes, si la reserva contiene una habitación,
     * el número de personas se determina automáticamente por
     * la capacidad de esa habitación.
     *
     * Los administradores conservan la validación existente.
     */
    let numeroPersonasFinal =
      Number(numero_personas) > 0
        ? Number(numero_personas)
        : 1;

    let valor_total =
      Number(req.body.valor_total);

    let anticipo =
      Number(req.body.anticipo);


    /* =====================================================
       FECHAS
    ===================================================== */

    if (!fecha_inicio || !fecha_fin) {
      await conn.rollback();

      return res.status(422).json({
        message:
          'Las fechas de entrada y salida son obligatorias'
      });
    }

    if (
      !esFechaValida(fecha_inicio) ||
      !esFechaValida(fecha_fin)
    ) {
      await conn.rollback();

      return res.status(422).json({
        message:
          'Las fechas indicadas no son válidas'
      });
    }

    if (
      new Date(fecha_fin) <=
      new Date(fecha_inicio)
    ) {
      await conn.rollback();

      return res.status(422).json({
        message:
          'La fecha de salida debe ser posterior a la fecha de entrada'
      });
    }


    /* =====================================================
       DETALLES
    ===================================================== */

    if (
      !Array.isArray(detalles) ||
      !detalles.length
    ) {
      await conn.rollback();

      return res.status(422).json({
        message:
          'Debes seleccionar al menos una habitación, servicio o paquete'
      });
    }


    /*
     * Primero expandimos los recursos que vienen incluidos
     * dentro de los paquetes.
     *
     * Esto permite que el frontend solamente envíe:
     *
     * {
     *   id_paquete: 1
     * }
     *
     * y el backend agregue automáticamente:
     *
     * {
     *   id_habitacion: 5,
     *   subtotal: 0
     * }
     *
     * o:
     *
     * {
     *   id_servicio: 3,
     *   subtotal: 0
     * }
     */
    const detallesExpandidos =
      await expandirRecursosDePaquetes(
        conn,
        detalles
      );


    /*
     * Las habitaciones se calculan DESPUÉS de expandir
     * los paquetes.
     */
    const detallesHabitacion =
      detallesExpandidos.filter(
        d =>
          d &&
          d.id_habitacion !== undefined &&
          d.id_habitacion !== null &&
          d.id_habitacion !== ''
      );


    const detallesServicio =
      detallesExpandidos.filter(
        d =>
          d &&
          d.id_servicio !== undefined &&
          d.id_servicio !== null &&
          d.id_servicio !== ''
      );


    const detallesPaquete =
      detallesExpandidos.filter(
        d =>
          d &&
          d.id_paquete !== undefined &&
          d.id_paquete !== null &&
          d.id_paquete !== ''
      );


    /*
     * Una reserva debe contener al menos un recurso.
     *
     * Ya NO se exige habitación.
     */
    if (
      !detallesHabitacion.length &&
      !detallesServicio.length &&
      !detallesPaquete.length
    ) {
      await conn.rollback();

      return res.status(422).json({
        message:
          'Debes seleccionar al menos una habitación, servicio o paquete'
      });
    }


    /* =====================================================
       RESERVA DE CLIENTE
    ===================================================== */

    if (
      req.user.rol === 'Cliente'
    ) {

      const noches =
        Math.max(
          1,
          Math.ceil(
            (
              new Date(fecha_fin) -
              new Date(fecha_inicio)
            ) /
            86400000
          )
        );


      /*
       * El total siempre se recalcula desde la base de datos.
       */
      valor_total = 0;


      /* ===================================================
         HABITACIONES
      =================================================== */

      for (
        const d of detallesHabitacion
      ) {

        const [room] =
          await conn.execute(
            `SELECT
               tarifa,
               capacidad_maxima,
               estado
             FROM habitaciones
             WHERE id = ?
             LIMIT 1`,
            [d.id_habitacion]
          );

        if (!room.length) {
          throw errorConEstado(
            'La habitación seleccionada no existe',
            404
          );
        }

        /*
         * Una habitación incluida en un paquete
         * no vuelve a cobrarse.
         */
        if (
          d.incluido_en_paquete
        ) {

          d.cantidad =
            1;

          d.subtotal =
            0;

          continue;
        }

        const cantidad =
          Math.max(
            1,
            Number(
              d.cantidad || 1
            )
          );

        d.cantidad =
          cantidad;

        d.subtotal =
          Number(
            room[0].tarifa || 0
          ) *
          noches *
          cantidad;

        valor_total +=
          d.subtotal;
      }


      /* ===================================================
         SERVICIOS
      =================================================== */

      for (
        const d of detallesServicio
      ) {

        const cantidad =
          Math.max(
            1,
            Number(
              d.cantidad || 1
            )
          );

        const [servicio] =
          await conn.execute(
            `SELECT
               id,
               nombre_servicio,
               costo,
               disponibilidad,
               cantidad_disponible,
               estado
             FROM servicios
             WHERE id = ?
             LIMIT 1
             FOR UPDATE`,
            [d.id_servicio]
          );

        if (!servicio.length) {
          throw errorConEstado(
            'El servicio seleccionado no existe',
            404
          );
        }

        const cantidadDisponible = Number(
          servicio[0].cantidad_disponible ?? 0
        );

        if (
          Number(servicio[0].disponibilidad) !== 1 ||
          Number(servicio[0].estado) !== 1 ||
          cantidadDisponible < cantidad
        ) {
          throw errorConEstado(
            cantidadDisponible <= 0
              ? `El servicio "${servicio[0].nombre_servicio}" está agotado`
              : `El servicio "${servicio[0].nombre_servicio}" no tiene suficientes unidades disponibles`,
            409
          );
        }

        d.cantidad =
          cantidad;


        /*
         * Servicio incluido dentro del paquete:
         * no se cobra aparte.
         */
        if (
          d.incluido_en_paquete
        ) {

          d.subtotal =
            0;

        } else {

          d.subtotal =
            Number(
              servicio[0].costo || 0
            ) *
            cantidad;

          valor_total +=
            d.subtotal;
        }
      }


      /* ===================================================
         PAQUETES
      =================================================== */

      for (
        const d of detallesPaquete
      ) {

        const cantidad =
          Math.max(
            1,
            Number(
              d.cantidad || 1
            )
          );

        const [paquete] =
          await conn.execute(
            `SELECT
               id,
               nombre,
               precio,
               disponibilidad,
               estado
             FROM paquetes
             WHERE id = ?
             LIMIT 1
             FOR UPDATE`,
            [d.id_paquete]
          );

        if (!paquete.length) {
          throw errorConEstado(
            'El paquete seleccionado no existe',
            404
          );
        }

        const estadoPaquete =
          String(
            paquete[0].estado ?? ''
          )
            .trim()
            .toLowerCase();

        const disponible =
          Number(
            paquete[0].disponibilidad
          ) === 1;

        const estadoValido = [
          '1',
          'true',
          'activo',
          'en_promocion',
          'en promoción'
        ].includes(
          estadoPaquete
        );

        if (
          !disponible ||
          !estadoValido
        ) {
          throw errorConEstado(
            `El paquete "${paquete[0].nombre}" no está disponible`,
            409
          );
        }

        d.cantidad =
          cantidad;

        d.subtotal =
          Number(
            paquete[0].precio || 0
          ) *
          cantidad;

        valor_total +=
          d.subtotal;
      }


      // Se conserva la columna histórica por compatibilidad,
      // pero ahora representa el 100% del valor de la reserva.
      anticipo = valor_total;


      /* ===================================================
         CAPACIDAD DE HABITACIÓN
      =================================================== */

      if (
        detallesHabitacion.length
      ) {

        /*
         * Si existe una habitación incluida por paquete,
         * esa habitación determina la capacidad.
         *
         * Si hay una habitación seleccionada manualmente,
         * se mantiene el comportamiento anterior.
         */
        const habitacionParaCapacidad =
          detallesHabitacion.find(
            d =>
              !d.incluido_en_paquete
          ) ||
          detallesHabitacion.find(
            d =>
              d.incluido_en_paquete
          );


        if (
          habitacionParaCapacidad
        ) {

          const capacidadResult =
            await conn.execute(
              `SELECT
                 capacidad_maxima
               FROM habitaciones
               WHERE id = ?`,
              [
                habitacionParaCapacidad.id_habitacion
              ]
            );

          const capacidadCliente =
            Number(
              capacidadResult[0][0]
                ?.capacidad_maxima || 0
            );


          if (
            capacidadCliente < 1
          ) {
            throw errorConEstado(
              'La habitación seleccionada no tiene una capacidad válida',
              409
            );
          }


          /*
           * Para clientes no pedimos que escriban manualmente
           * la cantidad de personas. La capacidad de la habitación
           * seleccionada/incluida es la que se guarda en la reserva.
           *
           * En el flujo administrativo se conserva la validación
           * exacta que ya tenía el sistema.
           */
          if (req.user.rol === 'Cliente') {
            numeroPersonasFinal = capacidadCliente;
          } else if (
            Number(numero_personas) !==
            capacidadCliente
          ) {
            throw errorConEstado(
              `El número de personas debe ser exactamente ${capacidadCliente} para la habitación seleccionada`,
              422
            );
          }
        }
      }
    }


    /* =====================================================
       TOTAL
    ===================================================== */

    if (
      Number(valor_total) <= 0
    ) {

      await conn.rollback();

      return res.status(422).json({
        message:
          'El valor total debe ser mayor que 0'
      });
    }


    // El sistema ya no maneja anticipos: el importe requerido es el total.
    anticipo = Number(valor_total);


    /* =====================================================
       VALIDAR HABITACIONES
       ESTA PARTE CONSERVA LA LÓGICA EXISTENTE
    ===================================================== */

    for (
      const d of detallesHabitacion
    ) {

      const [room] =
        await conn.execute(
          `SELECT
             id,
             numero_habitacion,
             estado
           FROM habitaciones
           WHERE id = ?
           FOR UPDATE`,
          [d.id_habitacion]
        );

      if (!room.length) {

        throw errorConEstado(
          'La habitación seleccionada no existe',
          404
        );
      }

      if (
        room[0].estado ===
        'inhabilitada'
      ) {

        throw errorConEstado(
          `La habitación ${room[0].numero_habitacion} está inhabilitada`,
          409
        );
      }

      const [clash] =
        await conn.execute(
          `SELECT r.id
           FROM reservas r
           JOIN reserva_detalle rd
             ON rd.id_reserva = r.id
           WHERE rd.id_habitacion = ?
             AND r.estado NOT IN (
               'cancelada',
               'check-out'
             )
             AND r.fecha_inicio < ?
             AND r.fecha_fin > ?
           FOR UPDATE`,
          [
            d.id_habitacion,
            fecha_fin,
            fecha_inicio
          ]
        );

      if (clash.length) {

        throw errorConEstado(
          `La habitación ${room[0].numero_habitacion} no está disponible para esas fechas`,
          409
        );
      }
    }


    /* =====================================================
       NUMERO DE CONFIRMACIÓN
    ===================================================== */

    const numero_confirmacion =
      'RES-' +
      Date.now() +
      '-' +
      crypto
        .randomBytes(3)
        .toString('hex')
        .toUpperCase();


    /* =====================================================
       INSERTAR RESERVA
    ===================================================== */

    const [rr] =
      await conn.execute(
        `INSERT INTO reservas (
           id_cliente,
           fecha_inicio,
           fecha_fin,
           numero_personas,
           valor_total,
           anticipo,
           numero_confirmacion,
           notas,
           estado
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id_cliente,
          fecha_inicio,
          fecha_fin,
          numeroPersonasFinal,
          valor_total,
          anticipo,
          numero_confirmacion,
          notas || null,
          'pendiente'
        ]
      );


    /* =====================================================
       INSERTAR DETALLES EXPANDIDOS
    ===================================================== */

    for (
      const d of detallesExpandidos
    ) {

      await conn.execute(
        `INSERT INTO reserva_detalle (
           id_reserva,
           id_habitacion,
           id_servicio,
           id_paquete,
           cantidad,
           subtotal
         )
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          rr.insertId,

          d.id_habitacion !== undefined &&
          d.id_habitacion !== null &&
          d.id_habitacion !== ''
            ? Number(d.id_habitacion)
            : null,

          d.id_servicio !== undefined &&
          d.id_servicio !== null &&
          d.id_servicio !== ''
            ? Number(d.id_servicio)
            : null,

          d.id_paquete !== undefined &&
          d.id_paquete !== null &&
          d.id_paquete !== ''
            ? Number(d.id_paquete)
            : null,

          Math.max(
            1,
            Number(
              d.cantidad || 1
            )
          ),

          Number(
            d.subtotal || 0
          )
        ]
      );
    }


    await conn.commit();

    emitirCambioReserva(
      'created',
      rr.insertId
    );

    res.status(201).json({
      id:
        rr.insertId,

      numero_confirmacion,

      estado:
        'pendiente'
    });

  } catch (e) {

    try {
      await conn.rollback();
    } catch {}

    next(e);

  } finally {

    conn.release();

  }
}


/* =========================================================
   LISTAR RESERVAS
========================================================= */

export async function listPayments(req, res, next) {
  try {
    let clienteId = null;

    if (req.user?.rol === 'Cliente') {
      const cliente = await clientForUser(req);
      if (!cliente) {
        return res.status(403).json({ message: 'El usuario no tiene perfil de cliente.' });
      }
      clienteId = Number(cliente.id);
    }

    const params = [];
    const where = clienteId ? 'WHERE r.id_cliente = ?' : '';
    if (clienteId) params.push(clienteId);

    const rows = await query(
      `SELECT
         p.id,
         p.id_reserva,
         p.valor,
         p.metodo_pago,
         p.comprobante_url,
         p.estado,
         r.numero_confirmacion,
         r.fecha_inicio,
         r.fecha_fin,
         r.valor_total,
         r.anticipo,
         CONCAT(c.nombre, ' ', c.apellido) AS cliente,
         c.correo,
         COALESCE((
           SELECT SUM(p2.valor)
           FROM pagos p2
           WHERE p2.id_reserva = r.id
             AND p2.estado = 'confirmado'
         ), 0) AS total_pagado_confirmado
       FROM pagos p
       INNER JOIN reservas r ON r.id = p.id_reserva
       INNER JOIN clientes c ON c.id = r.id_cliente
       ${where}
       ORDER BY p.id DESC`,
      params
    );

    const reservas = await query(
      `SELECT
         r.id,
         r.numero_confirmacion,
         r.fecha_inicio,
         r.fecha_fin,
         r.valor_total,
         r.anticipo,
         r.estado,
         CONCAT(c.nombre, ' ', c.apellido) AS cliente,
         c.correo,
         (
           SELECT p.estado
           FROM pagos p
           WHERE p.id_reserva = r.id
           ORDER BY p.id DESC
           LIMIT 1
         ) AS pago_estado,
         (
           SELECT p.metodo_pago
           FROM pagos p
           WHERE p.id_reserva = r.id
           ORDER BY p.id DESC
           LIMIT 1
         ) AS metodo_pago,
         COALESCE((
           SELECT SUM(p2.valor)
           FROM pagos p2
           WHERE p2.id_reserva = r.id
             AND p2.estado = 'confirmado'
         ), 0) AS total_pagado_confirmado,
         COALESCE((
           SELECT COUNT(*)
           FROM pagos pr
           WHERE pr.id_reserva = r.id
             AND pr.estado = 'rechazado'
         ), 0) AS intentos_rechazados
       FROM reservas r
       INNER JOIN clientes c ON c.id = r.id_cliente
       ${where}
       ORDER BY r.id DESC`,
      params
    );

    const normalizados = rows.map(p => {
      const total = Number(p.valor_total || 0);
      const pagado = Number(p.total_pagado_confirmado || 0);
      const valor = Number(p.valor || 0);
      const estadoPago = String(p.estado || '').toLowerCase();
      const pagadoAntes = estadoPago === 'confirmado'
        ? Math.max(0, pagado - valor)
        : pagado;
      const concepto = pagadoAntes <= 0.01 ? 'Pago del 100 %' : 'Pago de saldo pendiente';
      return {
        ...p,
        valor: Number(valor.toFixed(2)),
        valor_total: Number(total.toFixed(2)),
        anticipo: Number(total.toFixed(2)),
        concepto,
        total_pagado_confirmado: Number(pagado.toFixed(2)),
        saldo_pendiente: Number(Math.max(0, total - pagado).toFixed(2)),
        porcentaje_pagado: total > 0 ? Number(Math.min(100, (pagado / total) * 100).toFixed(2)) : 0
      };
    });

    const pendientes = reservas
      .filter(r => !['cancelada', 'check-out'].includes(String(r.estado || '').toLowerCase()))
      .filter(r => !['pendiente'].includes(String(r.pago_estado || '').toLowerCase()))
      .map(r => {
        const total = Number(r.valor_total || 0);
        const pagado = Number(r.total_pagado_confirmado || 0);
        return {
          ...r,
          valor_total: Number(total.toFixed(2)),
          anticipo: Number(total.toFixed(2)),
          total_pagado_confirmado: Number(pagado.toFixed(2)),
          saldo_pendiente: Number(Math.max(0, total - pagado).toFixed(2))
        };
      })
      .filter(r => r.saldo_pendiente > 0.01);

    res.json({ pagos: normalizados, reservas_pendientes: pendientes });
  } catch (e) {
    next(e);
  }
}

export async function listReservations(
  req,
  res,
  next
) {
  try {

    let where = '';
    let params = [];

    if (
      req.user.rol === 'Cliente'
    ) {

      where = `
        WHERE r.id_cliente = (
          SELECT id
          FROM clientes
          WHERE id_usuario = ?
          LIMIT 1
        )
      `;

      params = [
        req.user.id
      ];
    }

    const rows = await query(
      `SELECT
         r.*,

         CONCAT(
           c.nombre,
           ' ',
           c.apellido
         ) AS cliente,

         c.correo,

         (
           SELECT rd0.id_habitacion
           FROM reserva_detalle rd0
           WHERE rd0.id_reserva = r.id
             AND rd0.id_habitacion IS NOT NULL
           ORDER BY rd0.id ASC
           LIMIT 1
         ) AS id_habitacion,

         (
           SELECT GROUP_CONCAT(
             DISTINCT h.numero_habitacion
             ORDER BY h.numero_habitacion
             SEPARATOR ', '
           )
           FROM reserva_detalle rd
           JOIN habitaciones h
             ON h.id = rd.id_habitacion
           WHERE rd.id_reserva = r.id
             AND rd.id_habitacion IS NOT NULL
         ) AS habitacion,

         (
           SELECT GROUP_CONCAT(
             DISTINCT s.nombre_servicio
             ORDER BY s.nombre_servicio
             SEPARATOR ', '
           )
           FROM reserva_detalle rd
           JOIN servicios s
             ON s.id = rd.id_servicio
           WHERE rd.id_reserva = r.id
             AND rd.id_servicio IS NOT NULL
         ) AS servicios,

         (
           SELECT GROUP_CONCAT(
             DISTINCT pqt.nombre
             ORDER BY pqt.nombre
             SEPARATOR ', '
           )
           FROM reserva_detalle rd
           JOIN paquetes pqt
             ON pqt.id = rd.id_paquete
           WHERE rd.id_reserva = r.id
             AND rd.id_paquete IS NOT NULL
         ) AS paquetes,

         (
           SELECT p.estado
           FROM pagos p
           WHERE p.id_reserva = r.id
           ORDER BY p.id DESC
           LIMIT 1
         ) AS pago_estado,

         (
           SELECT p.valor
           FROM pagos p
           WHERE p.id_reserva = r.id
           ORDER BY p.id DESC
           LIMIT 1
         ) AS pago_valor,

         (
           SELECT p.metodo_pago
           FROM pagos p
           WHERE p.id_reserva = r.id
           ORDER BY p.id DESC
           LIMIT 1
         ) AS metodo_pago,

         (
           SELECT p.comprobante_url
           FROM pagos p
           WHERE p.id_reserva = r.id
           ORDER BY p.id DESC
           LIMIT 1
         ) AS comprobante_url,

         COALESCE((
           SELECT COUNT(*)
           FROM pagos pr
           WHERE pr.id_reserva = r.id
             AND pr.estado = 'rechazado'
         ), 0) AS intentos_rechazados,

         COALESCE((
           SELECT SUM(pc.valor)
           FROM pagos pc
           WHERE pc.id_reserva = r.id
             AND pc.estado = 'confirmado'
         ), 0) AS total_pagado_confirmado

       FROM reservas r

       JOIN clientes c
         ON c.id = r.id_cliente

       ${where}

       ORDER BY r.id DESC`,
      params
    );

    res.json({
      rows,
      total:
        rows.length
    });

  } catch (e) {
    next(e);
  }
}


/* =========================================================
   REGISTRAR PAGO
========================================================= */

export async function pay(
  req,
  res,
  next
) {
  const conn =
    await pool.getConnection();

  try {

    await conn.beginTransaction();

    const r =
      await reservationForUser(
        req,
        req.params.id
      );

    if (!r) {

      await conn.rollback();

      return res.status(404).json({
        message:
          'Reserva no encontrada'
      });
    }

    if (r.forbidden) {

      await conn.rollback();

      return res.status(403).json({
        message:
          'No tienes acceso a esta reserva'
      });
    }

    await conn.execute('SELECT id FROM reservas WHERE id = ? FOR UPDATE', [r.id]);
    const [rechazosPrevios] = await conn.execute(
      `SELECT COUNT(*) AS total FROM pagos WHERE id_reserva = ? AND estado = 'rechazado'`,
      [r.id]
    );
    const intentosRechazados = Number(rechazosPrevios[0]?.total || 0);
    if (intentosRechazados >= 3) {
      await conn.rollback();
      return res.status(409).json({
        message: 'Esta reserva alcanzó el límite de 3 pagos rechazados. No se permiten más intentos.',
        intentos_rechazados: intentosRechazados,
        bloqueada: true
      });
    }

    if (
      r.estado ===
      'cancelada'
    ) {

      await conn.rollback();

      return res.status(409).json({
        message:
          'No puedes pagar una reserva cancelada'
      });
    }

    if (
      r.estado ===
      'check-out'
    ) {

      await conn.rollback();

      return res.status(409).json({
        message:
          'No puedes registrar un pago de una reserva finalizada'
      });
    }

    const [resumenPagos] = await conn.execute(
      `SELECT COALESCE(SUM(valor), 0) AS total_confirmado
       FROM pagos
       WHERE id_reserva = ?
         AND estado = 'confirmado'`,
      [r.id]
    );

    const totalReserva = Number(r.valor_total || 0);
    const totalConfirmado = Number(resumenPagos[0]?.total_confirmado || 0);
    const saldoPendiente = Math.max(0, totalReserva - totalConfirmado);
    const valor = Number(req.body.valor);

    if (!Number.isFinite(valor) || valor <= 0) {
      await conn.rollback();
      return res.status(422).json({
        message: 'El valor del pago debe ser mayor que cero.'
      });
    }

    if (saldoPendiente <= 0.01) {
      await conn.rollback();
      return res.status(409).json({
        message: 'Esta reserva ya tiene el pago total confirmado.'
      });
    }

    if (valor > saldoPendiente + 0.01 || Math.abs(valor - saldoPendiente) > 0.01) {
      await conn.rollback();
      return res.status(422).json({
        message: `Debes pagar el 100 % del valor pendiente: ${saldoPendiente.toFixed(2)}.`
      });
    }

    const metodo =
      String(
        req.body.metodo_pago ||
        ''
      )
        .trim()
        .toLowerCase();

    if (
      !METODOS_PAGO_VALIDOS.includes(
        metodo
      )
    ) {

      await conn.rollback();

      return res.status(422).json({
        message:
          'El método de pago debe ser efectivo, tarjeta o transferencia'
      });
    }

    const pagosPendientes =
      await conn.execute(
        `SELECT id
         FROM pagos
         WHERE id_reserva = ?
           AND estado = 'pendiente'
         ORDER BY id DESC
         LIMIT 1
         FOR UPDATE`,
        [r.id]
      );

    if (
      pagosPendientes[0].length
    ) {

      await conn.rollback();

      return res.status(409).json({
        message:
          'Esta reserva ya tiene un pago pendiente de revisión'
      });
    }


    /* =====================================================
       TRANSFERENCIA
    ===================================================== */

    if (
      metodo ===
      'transferencia'
    ) {

      if (!req.file) {

        await conn.rollback();

        return res.status(422).json({
          message:
            'Para transferencia debes adjuntar el comprobante'
        });
      }

      const url =
        `/uploads/${req.file.filename}`;

      const [payment] =
        await conn.execute(
          `INSERT INTO pagos (
             id_reserva,
             valor,
             metodo_pago,
             comprobante_url,
             estado
           )
           VALUES (?, ?, ?, ?, ?)`,
          [
            r.id,
            valor,
            metodo,
            url,
            'pendiente'
          ]
        );

      // Toda transferencia queda pendiente de verificación, incluso si fue
      // cargada desde una sesión administrativa. El administrador debe aprobarla.
      await conn.commit();

      return res.status(201).json({
        message:
          'Comprobante recibido y pago pendiente de verificación',

        comprobante_url:
          url,

        metodo_pago:
          metodo,

        valor
      });
    }


    /* =====================================================
       EFECTIVO
    ===================================================== */

    if (
      metodo ===
      'efectivo'
    ) {

      const [payment] =
        await conn.execute(
          `INSERT INTO pagos (
             id_reserva,
             valor,
             metodo_pago,
             comprobante_url,
             estado
           )
           VALUES (?, ?, ?, ?, ?)`,
          [
            r.id,
            valor,
            metodo,
            null,
            'pendiente'
          ]
        );

      if (req.user.rol === 'Administrador') {
        if (String(r.estado || '').toLowerCase() !== 'confirmada') {
          await ocuparRecursosDeReserva(conn, r.id);
        }
        await conn.execute(`UPDATE pagos SET estado = 'confirmado', fecha_confirmacion = NOW() WHERE id = ?`, [payment.insertId]);
        await conn.execute(`UPDATE reservas SET estado = 'confirmada', anticipo = valor_total WHERE id = ?`, [r.id]);
        const resumenPdf = await obtenerResumenCorreoReserva(conn, r.id);
        const pdf = await generarPdfComprobantePago({ resumen: resumenPdf, pago: { ...payment, id: payment.insertId, valor, metodo_pago: metodo, fecha: new Date() }, estado: 'confirmado' });
        await conn.execute(`UPDATE pagos SET comprobante_url = ? WHERE id = ?`, [pdf.url, payment.insertId]);
        await conn.commit();
        emitirCambioReserva('payment_confirmed', r.id);
        try { await enviarConfirmacionReserva(r.id, pdf.filePath); }
        catch (emailError) { console.error('Error al enviar correo de confirmación:', emailError.message); }
        return res.status(201).json({ message: 'Pago en efectivo registrado, aprobado y reserva confirmada.', comprobante_url: pdf.url, metodo_pago: metodo, valor });
      }

      await conn.commit();

      return res.status(201).json({
        message:
          'Solicitud de pago en efectivo registrada y pendiente de confirmación',

        metodo_pago:
          metodo,

        valor
      });
    }


    /* =====================================================
       TARJETA
    ===================================================== */

    if (
      metodo ===
      'tarjeta'
    ) {

      const numeroTarjeta =
        String(
          req.body.numero_tarjeta ||
          ''
        )
          .replace(/\D/g, '');

      const titular =
        String(
          req.body.titular ||
          ''
        ).trim();

      const vencimiento =
        String(
          req.body.vencimiento ||
          ''
        ).trim();

      const cvv =
        String(
          req.body.cvv ||
          ''
        )
          .replace(/\D/g, '');

      if (
        !/^\d{16}$/.test(
          numeroTarjeta
        )
      ) {

        await conn.rollback();

        return res.status(422).json({
          message:
            'El número de tarjeta debe tener 16 dígitos'
        });
      }

      if (
        titular.length < 3
      ) {

        await conn.rollback();

        return res.status(422).json({
          message:
            'El titular de la tarjeta no es válido'
        });
      }

      if (
        !/^\d{2}\/\d{2}$/.test(
          vencimiento
        )
      ) {

        await conn.rollback();

        return res.status(422).json({
          message:
            'La fecha de vencimiento debe tener formato MM/AA'
        });
      }

      if (
        !/^\d{3}$/.test(
          cvv
        )
      ) {

        await conn.rollback();

        return res.status(422).json({
          message:
            'El CVV debe tener 3 dígitos'
        });
      }

      const [payment] =
        await conn.execute(
          `INSERT INTO pagos (
             id_reserva,
             valor,
             metodo_pago,
             comprobante_url,
             estado
           )
           VALUES (?, ?, ?, ?, ?)`,
          [
            r.id,
            valor,
            metodo,
            null,
            'pendiente'
          ]
        );

      // El registro de tarjeta no acredita por sí mismo el ingreso del dinero.
      // Se mantiene pendiente hasta la verificación administrativa; el PDF oficial
      // se genera únicamente al aprobar o rechazar el pago.

      await conn.commit();

      return res.status(201).json({
        message:
          'Pago con tarjeta registrado y pendiente de confirmación.',

        metodo_pago:
          metodo,

        valor
      });
    }

  } catch (e) {

    try {
      await conn.rollback();
    } catch {}

    next(e);

  } finally {

    conn.release();

  }
}


/* =========================================================
   CONFIRMAR PAGO
========================================================= */

export async function confirmPay(
  req,
  res,
  next
) {
  const conn =
    await pool.getConnection();

  try {

    await conn.beginTransaction();

    const [reservas] =
      await conn.execute(
        `SELECT
           r.*,
           c.correo AS cliente_correo
         FROM reservas r
         JOIN clientes c
           ON c.id = r.id_cliente
         WHERE r.id = ?
         FOR UPDATE`,
        [req.params.id]
      );

    if (!reservas.length) {

      await conn.rollback();

      return res.status(404).json({
        message:
          'Reserva no encontrada'
      });
    }

    const r =
      reservas[0];

    const [rechazosPrevios] = await conn.execute(
      `SELECT COUNT(*) AS total FROM pagos WHERE id_reserva = ? AND estado = 'rechazado'`,
      [r.id]
    );
    if (Number(rechazosPrevios[0]?.total || 0) >= 3) {
      await conn.rollback();
      return res.status(409).json({ message: 'Esta reserva alcanzó el límite de 3 pagos rechazados.' });
    }

    if (
      r.estado ===
      'cancelada'
    ) {

      await conn.rollback();

      return res.status(409).json({
        message:
          'No se puede confirmar el pago porque la reserva está cancelada'
      });
    }

    if (
      r.estado ===
      'check-out'
    ) {

      await conn.rollback();

      return res.status(409).json({
        message:
          'No se puede confirmar el pago de una reserva finalizada'
      });
    }

    const [pending] =
      await conn.execute(
        `SELECT *
         FROM pagos
         WHERE id_reserva = ?
           AND estado = 'pendiente'
         ORDER BY id DESC
         LIMIT 1
         FOR UPDATE`,
        [r.id]
      );

    if (!pending.length) {

      await conn.rollback();

      return res.status(409).json({
        message:
          'No hay un pago pendiente para confirmar'
      });
    }

    const [pagosPrevios] = await conn.execute(
      `SELECT COALESCE(SUM(valor), 0) AS total_confirmado
       FROM pagos
       WHERE id_reserva = ? AND estado = 'confirmado'`,
      [r.id]
    );
    const totalConEstePago = Number(pagosPrevios[0]?.total_confirmado || 0) + Number(pending[0].valor || 0);
    if (Math.abs(totalConEstePago - Number(r.valor_total || 0)) > 0.01) {
      await conn.rollback();
      return res.status(409).json({
        message: 'No se puede aprobar: el pago no completa el 100 % del valor pendiente de la reserva.'
      });
    }

    /*
     * Ocupa todos los recursos.
     *
     * Si la reserva no tiene habitación,
     * ocuparHabitacionesDeReserva() simplemente
     * no hace nada.
     */
    if (String(r.estado || '').toLowerCase() !== 'confirmada') {
      await ocuparRecursosDeReserva(conn, r.id);
    }

    await conn.execute(
      `UPDATE pagos
       SET estado = 'confirmado'
       WHERE id = ?`,
      [pending[0].id]
    );

    await conn.execute(
      `UPDATE reservas SET estado = 'confirmada', anticipo = valor_total WHERE id = ?`,
      [r.id]
    );
    const resumenPdf = await obtenerResumenCorreoReserva(conn, r.id);
    const pdf = await generarPdfComprobantePago({
      resumen: resumenPdf,
      pago: pending[0],
      estado: 'confirmado'
    });
    await conn.execute(`UPDATE pagos SET comprobante_url = ?, fecha_confirmacion = NOW() WHERE id = ?`, [pdf.url, pending[0].id]);
    if (pending[0].comprobante_url) {
      const oldFilename = path.basename(String(pending[0].comprobante_url));
      await fs.unlink(path.resolve('uploads', oldFilename)).catch(() => {});
    }

    await conn.commit();

    try {
      await enviarConfirmacionReserva(r.id, pdf.filePath);
    } catch (emailError) {
      console.error(
        'Error al enviar el correo de confirmación:',
        emailError.message
      );
    }

    res.json({
      message:
        'Pago confirmado y reserva confirmada correctamente'
    });

  } catch (e) {

    try {
      await conn.rollback();
    } catch {}

    next(e);

  } finally {

    conn.release();

  }
}


/* =========================================================
   RECHAZAR PAGO
========================================================= */

export async function rejectPay(req, res, next) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [reservas] = await conn.execute(
      `SELECT r.*, c.correo AS cliente_correo, CONCAT(c.nombre, ' ', c.apellido) AS cliente_nombre
       FROM reservas r JOIN clientes c ON c.id = r.id_cliente WHERE r.id = ? FOR UPDATE`,
      [req.params.id]
    );
    if (!reservas.length) { await conn.rollback(); return res.status(404).json({ message: 'Reserva no encontrada' }); }
    const r = reservas[0];
    await conn.execute('SELECT id FROM reservas WHERE id = ? FOR UPDATE', [r.id]);
    const [rechazosPrevios] = await conn.execute(
      `SELECT COUNT(*) AS total FROM pagos WHERE id_reserva = ? AND estado = 'rechazado'`,
      [r.id]
    );
    const intentosRechazadosPrevios = Number(rechazosPrevios[0]?.total || 0);
    if (intentosRechazadosPrevios >= 3) {
      await conn.rollback();
      return res.status(409).json({ message: 'Esta reserva alcanzó el límite de 3 pagos rechazados. No se permiten más intentos.' });
    }
    const [pending] = await conn.execute(
      `SELECT * FROM pagos WHERE id_reserva = ? AND estado = 'pendiente' ORDER BY id DESC LIMIT 1 FOR UPDATE`,
      [r.id]
    );
    if (!pending.length) { await conn.rollback(); return res.status(409).json({ message: 'No hay un pago pendiente' }); }
    const observaciones = String(req.body?.observaciones || '').trim();
    await conn.execute(`UPDATE pagos SET estado = 'rechazado', observaciones = ?, fecha_confirmacion = NOW() WHERE id = ?`, [observaciones || null, pending[0].id]);
    const intentosRechazados = intentosRechazadosPrevios + 1;
    const resumenPdf = await obtenerResumenCorreoReserva(conn, r.id);
    const pdf = await generarPdfComprobantePago({ resumen: resumenPdf, pago: pending[0], estado: 'rechazado', observaciones });
    await conn.execute(`UPDATE pagos SET comprobante_url = ? WHERE id = ?`, [pdf.url, pending[0].id]);
    if (pending[0].comprobante_url) {
      const oldFilename = path.basename(String(pending[0].comprobante_url));
      await fs.unlink(path.resolve('uploads', oldFilename)).catch(() => {});
    }
    await conn.commit();
    try { await enviarCorreoPagoRechazado(await obtenerResumenCorreoReserva(pool, r.id), pdf.filePath); }
    catch (emailError) { console.error('Error al enviar correo de pago rechazado:', emailError.message); }
    emitirCambioReserva('payment_rejected', r.id);
    return res.json({
      message: intentosRechazados >= 3
        ? 'Pago rechazado. La reserva alcanzó 3 rechazos y quedó bloqueada para nuevos intentos.'
        : 'Pago rechazado. Se generó el comprobante y se notificó al cliente.',
      comprobante_url: pdf.url,
      intentos_rechazados: intentosRechazados,
      bloqueada: intentosRechazados >= 3
    });
  } catch (e) {
    try { await conn.rollback(); } catch {}
    next(e);
  } finally { conn.release(); }
}


/* =========================================================
   ACTUALIZAR RESERVA
   =========================================================
   Esta parte conserva el comportamiento existente:
   la edición administrativa de una reserva sigue
   trabajando con habitación.
========================================================= */

async function calcularTotalReservaEditada(conn, reservationId, fechaInicio, fechaFin) {
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  const noches = Math.ceil((fin.getTime() - inicio.getTime()) / 86400000);
  if (!Number.isFinite(noches) || noches <= 0) {
    throw errorConEstado('Las nuevas fechas no producen una cantidad válida de noches', 422);
  }

  const [detalles] = await conn.execute(
    `SELECT id_habitacion, id_servicio, id_paquete, cantidad, subtotal
     FROM reserva_detalle
     WHERE id_reserva = ?
     ORDER BY id ASC`,
    [reservationId]
  );

  let total = 0;

  for (const detalle of detalles) {
    const cantidad = Math.max(1, Number(detalle.cantidad || 1));

    if (detalle.id_habitacion !== null) {
      const [habitaciones] = await conn.execute(
        `SELECT tarifa FROM habitaciones WHERE id = ? LIMIT 1`,
        [detalle.id_habitacion]
      );
      if (!habitaciones.length) continue;
      // Un subtotal 0 representa una habitación incluida sin cobro dentro de un paquete.
      const nuevoSubtotal = Number(detalle.subtotal || 0) > 0
        ? Number(habitaciones[0].tarifa || 0) * noches * cantidad
        : 0;

      await conn.execute(
        `UPDATE reserva_detalle
         SET subtotal = ?
         WHERE id_reserva = ?
           AND id_habitacion = ?`,
        [nuevoSubtotal, reservationId, detalle.id_habitacion]
      );

      total += nuevoSubtotal;
      continue;
    }

    total += Number(detalle.subtotal || 0);
  }

  return Number(total.toFixed(2));
}

export async function update(
  req,
  res,
  next
) {
  const conn =
    await pool.getConnection();

  try {

    await conn.beginTransaction();

    const r =
      await reservationForUser(
        req,
        req.params.id
      );

    if (!r) {

      await conn.rollback();

      return res.status(404).json({
        message:
          'Reserva no encontrada'
      });
    }

    if (r.forbidden) {

      await conn.rollback();

      return res.status(403).json({
        message:
          'No tienes acceso a esta reserva'
      });
    }

    if (
      r.estado ===
      'cancelada'
    ) {

      await conn.rollback();

      return res.status(409).json({
        message:
          'No puedes modificar una reserva cancelada'
      });
    }

    const [pagosRealizados] = await conn.execute(
      `SELECT id, estado
       FROM pagos
       WHERE id_reserva = ?
         AND estado IN ('pendiente', 'confirmado')
       ORDER BY id DESC
       LIMIT 1
       FOR UPDATE`,
      [r.id]
    );

    if (pagosRealizados.length) {
      await conn.rollback();
      return res.status(409).json({
        message:
          'Esta reserva no puede editarse porque ya registra un pago o un pago pendiente de verificación.'
      });
    }

    const esAdmin =
      req.user.rol === 'Administrador';

    let id_cliente =
      r.id_cliente;

    if (
      esAdmin &&
      req.body.id_cliente !== undefined
    ) {

      id_cliente =
        Number(
          req.body.id_cliente
        );

      if (
        !Number.isInteger(id_cliente) ||
        id_cliente <= 0
      ) {

        await conn.rollback();

        return res.status(422).json({
          message:
            'El cliente seleccionado no es válido'
        });
      }

      const [cliente] =
        await conn.execute(
          `SELECT id
           FROM clientes
           WHERE id = ?
           LIMIT 1`,
          [id_cliente]
        );

      if (!cliente.length) {

        await conn.rollback();

        return res.status(404).json({
          message:
            'El cliente seleccionado no existe'
        });
      }
    }


    const habitacionesActuales =
      await habitacionesDeReserva(
        conn,
        r.id
      );

    if (
      !habitacionesActuales.length
    ) {

      /*
       * Las reservas de servicio/paquete sin habitación
       * actualmente no se editan mediante este formulario.
       *
       * Se conserva la seguridad del flujo administrativo
       * existente sin afectar la creación de este tipo
       * de reservas.
       */
      await conn.rollback();

      return res.status(409).json({
        message:
          'La edición de esta reserva no tiene una habitación asociada'
      });
    }

    const habitacionActual =
      habitacionesActuales[0];

    let id_habitacion =
      habitacionActual;

    if (
      req.body.id_habitacion !== undefined &&
      req.body.id_habitacion !== ''
    ) {

      id_habitacion =
        Number(
          req.body.id_habitacion
        );

      if (
        !Number.isInteger(id_habitacion) ||
        id_habitacion <= 0
      ) {

        await conn.rollback();

        return res.status(422).json({
          message:
            'La habitación seleccionada no es válida'
        });
      }
    }

    const fecha_inicio =
      req.body.fecha_inicio !== undefined
        ? req.body.fecha_inicio
        : r.fecha_inicio;

    const fecha_fin =
      req.body.fecha_fin !== undefined
        ? req.body.fecha_fin
        : r.fecha_fin;

    const notas =
      req.body.notas !== undefined
        ? req.body.notas
        : r.notas;

    if (
      !fecha_inicio ||
      !fecha_fin
    ) {

      await conn.rollback();

      return res.status(422).json({
        message:
          'Las fechas de entrada y salida son obligatorias'
      });
    }

    if (
      !esFechaValida(fecha_inicio) ||
      !esFechaValida(fecha_fin)
    ) {

      await conn.rollback();

      return res.status(422).json({
        message:
          'Las fechas indicadas no son válidas'
      });
    }

    if (
      new Date(fecha_fin) <=
      new Date(fecha_inicio)
    ) {

      await conn.rollback();

      return res.status(422).json({
        message:
          'La fecha de salida debe ser posterior a la fecha de entrada'
      });
    }

    const [room] =
      await conn.execute(
        `SELECT
           id,
           numero_habitacion,
           capacidad_maxima,
           tarifa,
           estado
         FROM habitaciones
         WHERE id = ?
         FOR UPDATE`,
        [id_habitacion]
      );

    if (!room.length) {

      await conn.rollback();

      return res.status(404).json({
        message:
          'La habitación seleccionada no existe'
      });
    }

    const habitacion =
      room[0];

    if (
      habitacion.estado ===
      'inhabilitada'
    ) {

      await conn.rollback();

      return res.status(409).json({
        message:
          `La habitación ${habitacion.numero_habitacion} está inhabilitada`
      });
    }

    const capacidad =
      Number(
        habitacion.capacidad_maxima
      );

    if (
      !Number.isInteger(capacidad) ||
      capacidad <= 0
    ) {

      await conn.rollback();

      return res.status(409).json({
        message:
          `La habitación ${habitacion.numero_habitacion} no tiene una capacidad válida configurada`
      });
    }

    const numero_personas =
      capacidad;

    const [clash] =
      await conn.execute(
        `SELECT
           r2.id,
           r2.numero_confirmacion
         FROM reservas r2
         JOIN reserva_detalle rd
           ON rd.id_reserva = r2.id
         WHERE rd.id_habitacion = ?
           AND r2.id <> ?
           AND r2.estado NOT IN (
             'cancelada',
             'check-out'
           )
           AND r2.fecha_inicio < ?
           AND r2.fecha_fin > ?
         LIMIT 1`,
        [
          id_habitacion,
          r.id,
          fecha_fin,
          fecha_inicio
        ]
      );

    if (clash.length) {

      await conn.rollback();

      return res.status(409).json({
        message:
          `La habitación ${habitacion.numero_habitacion} no está disponible para las nuevas fechas`
      });
    }

    if (Number(id_habitacion) !== Number(habitacionActual)) {
      const [detalleHabitacion] = await conn.execute(
        `SELECT id, subtotal FROM reserva_detalle
         WHERE id_reserva = ? AND id_habitacion = ?
         ORDER BY id ASC LIMIT 1 FOR UPDATE`,
        [r.id, habitacionActual]
      );

      if (!detalleHabitacion.length) {
        await conn.rollback();
        return res.status(409).json({ message: 'No se encontró el detalle de la habitación de la reserva' });
      }

      await conn.execute(
        `UPDATE reserva_detalle SET id_habitacion = ? WHERE id = ?`,
        [id_habitacion, detalleHabitacion[0].id]
      );
    }

    const nuevoValorTotal = await calcularTotalReservaEditada(
      conn,
      r.id,
      fecha_inicio,
      fecha_fin
    );

    if (!Number.isFinite(nuevoValorTotal) || nuevoValorTotal <= 0) {
      await conn.rollback();
      return res.status(422).json({
        message: 'No fue posible recalcular correctamente el valor de la reserva. Verifica que la reserva tenga al menos un concepto con valor.'
      });
    }

    const nuevoAnticipo = Number(nuevoValorTotal.toFixed(2));

    await conn.execute(
      `UPDATE reservas
       SET
         id_cliente = ?,
         fecha_inicio = ?,
         fecha_fin = ?,
         numero_personas = ?,
         valor_total = ?,
         anticipo = ?,
         notas = ?
       WHERE id = ?`,
      [
        id_cliente,
        fecha_inicio,
        fecha_fin,
        numero_personas,
        nuevoValorTotal,
        nuevoAnticipo,
        notas || null,
        r.id
      ]
    );

    if (
      Number(id_habitacion) !==
      Number(habitacionActual)
    ) {
      if (
        r.estado ===
        'confirmada'
      ) {

        await conn.execute(
          `UPDATE habitaciones
           SET estado = 'disponible'
           WHERE id = ?
             AND estado = 'ocupada'`,
          [habitacionActual]
        );

        await conn.execute(
          `UPDATE habitaciones
           SET estado = 'ocupada'
           WHERE id = ?`,
          [id_habitacion]
        );
      }
    }

    await conn.commit();

    broadcast({
      type: 'data_changed',
      entity: 'reservas',
      action: 'updated',
      id: r.id
    });

    res.json({
      message:
        'Reserva actualizada correctamente',

      id:
        r.id,

      id_cliente,

      id_habitacion,

      numero_personas,
      valor_total: nuevoValorTotal,
      anticipo: nuevoAnticipo
    });

  } catch (e) {

    try {
      await conn.rollback();
    } catch {}

    next(e);

  } finally {

    conn.release();

  }
}


/* =========================================================
   CANCELAR RESERVA
========================================================= */

export async function cancel(
  req,
  res,
  next
) {
  const conn =
    await pool.getConnection();

  try {

    await conn.beginTransaction();

    const [reservas] =
      await conn.execute(
        `SELECT
           r.*,
           c.correo AS cliente_correo
         FROM reservas r
         JOIN clientes c
           ON c.id = r.id_cliente
         WHERE r.id = ?
         FOR UPDATE`,
        [req.params.id]
      );

    if (!reservas.length) {

      await conn.rollback();

      return res.status(404).json({
        message:
          'Reserva no encontrada'
      });
    }

    const r =
      reservas[0];

    const resumenCancelacion =
      await obtenerResumenCorreoReserva(
        conn,
        r.id
      );

    if (
      req.user.rol ===
      'Cliente'
    ) {

      const c =
        await clientForUser(req);

      if (
        !c ||
        c.id !== r.id_cliente
      ) {

        await conn.rollback();

        return res.status(403).json({
          message:
            'No tienes acceso a esta reserva'
        });
      }
    }

    if (
      r.estado ===
      'check-in' ||
      r.estado ===
      'check-out'
    ) {

      await conn.rollback();

      return res.status(409).json({
        message:
          'No puedes cancelar una reserva en este estado'
      });
    }

    if (
      r.estado ===
      'cancelada'
    ) {

      await conn.rollback();

      return res.status(409).json({
        message:
          'La reserva ya está cancelada'
      });
    }

    await conn.execute(
      `UPDATE reservas
       SET estado = 'cancelada'
       WHERE id = ?`,
      [r.id]
    );

    await conn.execute(
      `UPDATE pagos
       SET estado = 'rechazado', comprobante_url = NULL,
           observaciones = COALESCE(observaciones, 'Reserva cancelada antes de aprobar el pago')
       WHERE id_reserva = ?
         AND estado = 'pendiente'`,
      [r.id]
    );

    await liberarHabitacionesDeReserva(
      conn,
      r.id
    );

    if (r.estado === 'confirmada' || r.estado === 'check-in') {
      await liberarServiciosYPaquetesDeReserva(
        conn,
        r.id
      );
    }

    await conn.commit();

    emitirCambioReserva(
      'cancelled',
      r.id
    );

    try {
      await enviarCorreoCancelacionReserva(resumenCancelacion);
    } catch (emailError) {
      console.error(
        'Error al enviar el correo de cancelación:',
        emailError.message
      );
    }

    res.json({
      message:
        'Reserva cancelada correctamente'
    });

  } catch (e) {

    try {
      await conn.rollback();
    } catch {}

    next(e);

  } finally {

    conn.release();

  }
}


/* =========================================================
   ELIMINAR RESERVA DEL HISTORIAL
========================================================= */

export async function remove(
  req,
  res,
  next
) {
  const conn =
    await pool.getConnection();

  const reservationId =
    Number(req.params.id);

  if (
    !Number.isInteger(
      reservationId
    ) ||
    reservationId <= 0
  ) {

    conn.release();

    return res.status(422).json({
      message:
        'ID de reserva inválido'
    });
  }

  try {

    await conn.beginTransaction();

    const [reservas] =
      await conn.execute(
        `SELECT *
         FROM reservas
         WHERE id = ?
         FOR UPDATE`,
        [reservationId]
      );

    if (!reservas.length) {

      await conn.rollback();

      return res.status(404).json({
        message:
          'La reserva no existe'
      });
    }

    const reservaOriginal = reservas[0];
    const resumenEliminacion =
      await obtenerResumenCorreoReserva(
        conn,
        reservationId
      );

    const [pagos] =
      await conn.execute(
        `SELECT
           id,
           comprobante_url
         FROM pagos
         WHERE id_reserva = ?`,
        [reservationId]
      );

    await liberarHabitacionesDeReserva(
      conn,
      reservationId
    );

    if (reservaOriginal.estado === 'confirmada' || reservaOriginal.estado === 'check-in') {
      await liberarServiciosYPaquetesDeReserva(
        conn,
        reservationId
      );
    }

    await conn.execute(
      `DELETE FROM huespedes
       WHERE id_reserva = ?`,
      [reservationId]
    );

    await conn.execute(
      `DELETE FROM pagos
       WHERE id_reserva = ?`,
      [reservationId]
    );

    await conn.execute(
      `DELETE FROM reserva_detalle
       WHERE id_reserva = ?`,
      [reservationId]
    );

    await conn.execute(
      `DELETE FROM reservas
       WHERE id = ?`,
      [reservationId]
    );

    await conn.commit();

    emitirCambioReserva(
      'deleted',
      reservationId
    );

    try {
      await enviarCorreoEliminacionReserva(resumenEliminacion);
    } catch (emailError) {
      console.error(
        'Error al enviar el correo de eliminación de reserva:',
        emailError.message
      );
    }

    for (
      const pago of pagos
    ) {

      if (
        !pago.comprobante_url
      ) {
        continue;
      }

      try {

        const filename =
          path.basename(
            String(
              pago.comprobante_url
            )
          );

        const uploadsDir =
          path.resolve(
            'uploads'
          );

        const filePath =
          path.resolve(
            uploadsDir,
            filename
          );

        if (
          filePath.startsWith(
            uploadsDir +
            path.sep
          )
        ) {

          await fs.unlink(
            filePath
          );

        }

      } catch (fileError) {

        if (
          fileError.code !==
          'ENOENT'
        ) {

          console.error(
            'No se pudo eliminar el comprobante:',
            fileError.message
          );

        }
      }
    }

    res.json({
      message:
        'Reserva eliminada correctamente del historial'
    });

  } catch (e) {

    try {
      await conn.rollback();
    } catch {}

    next(e);

  } finally {

    conn.release();

  }
}


/* =========================================================
   PDF DE RESERVA
========================================================= */

export async function pdf(
  req,
  res,
  next
) {
  try {

    const r =
      await reservationForUser(
        req,
        req.params.id
      );

    if (!r) {
      return res.status(404).end();
    }

    if (r.forbidden) {

      return res.status(403).json({
        message:
          'No tienes acceso a esta reserva'
      });
    }

    reservationPdf(
      r,
      res
    );

  } catch (e) {

    next(e);

  }
}


/* =========================================================
   REPORTES
========================================================= */

export async function report(
  req,
  res,
  next
) {
  try {

    const rows =
      await query(
        `SELECT
           r.id,
           r.numero_confirmacion,
           r.fecha_inicio,
           r.fecha_fin,
           r.valor_total,
           r.anticipo,
           r.estado,
           CONCAT(
             c.nombre,
             ' ',
             c.apellido
           ) AS cliente
         FROM reservas r
         JOIN clientes c
           ON c.id = r.id_cliente
         ORDER BY r.id DESC`
      );

    if (
      req.query.formato ===
      'excel'
    ) {

      return rowsToXlsx(
        rows,
        res,
        'reservas.xlsx'
      );
    }

    res.json(rows);

  } catch (e) {

    next(e);

  }
}