import { query } from '../config/db.js';

import {
  list,
  safeTables,
  tableColumns
} from '../repositories/genericRepository.js';

import bcrypt from 'bcryptjs';
import { enviarCorreoBienvenida, enviarCorreoEliminacionCuenta } from '../services/emailService.js';
import { eliminarSesionActiva } from '../services/sessionService.js';
import { broadcast } from '../realtime/realtime.js';
import fs from 'fs/promises';
import path from 'path';


/* =========================================================
   PERMISOS VÁLIDOS
========================================================= */

const PERMISOS_VALIDOS = [
  'ver',
  'crear',
  'editar',
  'eliminar',
  'exportar',
  'confirmar_pago',
  'gestionar_roles',
  'gestionar_usuarios',
  'gestionar_reservas'
];


/* =========================================================
   TABLAS ADMINISTRATIVAS
========================================================= */

const TABLAS_ADMIN = new Set([
  'roles',
  'usuarios',
  'clientes'
]);


async function obtenerArchivosImagenesCatalogo(table, id) {
  const config = {
    habitaciones: {
      tabla: 'habitacion_imagenes',
      columna: 'id_habitacion',
      directorio: path.resolve('uploads', 'habitaciones')
    },
    servicios: {
      tabla: 'servicio_imagenes',
      columna: 'id_servicio',
      directorio: path.resolve('uploads', 'servicios')
    },
    paquetes: {
      tabla: 'paquete_imagenes',
      columna: 'id_paquete',
      directorio: path.resolve('uploads', 'paquetes')
    }
  }[table];

  if (!config) return [];

  const archivos = await query(
    `SELECT archivo FROM ${config.tabla} WHERE ${config.columna} = ?`,
    [id]
  );

  return (archivos || [])
    .map(item => item?.archivo)
    .filter(Boolean)
    .map(archivo => path.join(config.directorio, path.basename(String(archivo))));
}


/* =========================================================
   MÓDULOS QUE EL CLIENTE PUEDE CONSULTAR
========================================================= */

const MODULOS_CLIENTE = new Set([
  'habitaciones',
  'servicios',
  'paquetes',
  'huespedes',
  'feedback'
]);


/* =========================================================
   MÓDULOS EN LOS QUE EL CLIENTE PUEDE CREAR
========================================================= */

const CLIENTE_PUEDE_CREAR = new Set([
  'huespedes',
  'feedback'
]);


/* =========================================================
   MÓDULOS EN LOS QUE EL CLIENTE PUEDE EDITAR
========================================================= */

const CLIENTE_PUEDE_EDITAR = new Set([
  'huespedes',
  'feedback'
]);


/* =========================================================
   OBTENER PERMISOS DEL ROL
========================================================= */

async function obtenerPermisosUsuario(req) {

  if (!req.user) {
    return [];
  }

  const rows = await query(
    `
      SELECT permisos
      FROM roles
      WHERE nombre_rol = ?
      LIMIT 1
    `,
    [req.user.rol]
  );

  if (!rows || !rows[0]) {
    return [];
  }

  const permisos = rows[0].permisos;

  if (!permisos) {
    return [];
  }

  if (Array.isArray(permisos)) {
    return permisos.filter(
      permiso =>
        PERMISOS_VALIDOS.includes(permiso)
    );
  }

  if (typeof permisos === 'string') {

    try {

      const parsed =
        JSON.parse(permisos);

      if (Array.isArray(parsed)) {
        return parsed.filter(
          permiso =>
            PERMISOS_VALIDOS.includes(permiso)
        );
      }

    } catch {

      return permisos
        .split(',')
        .map(
          permiso =>
            permiso.trim()
        )
        .filter(
          permiso =>
            PERMISOS_VALIDOS.includes(permiso)
        );
    }
  }

  return [];
}


/* =========================================================
   COMPROBAR PERMISO
========================================================= */

async function tienePermiso(
  req,
  permiso
) {

  if (
    req.user?.rol === 'Administrador'
  ) {
    return true;
  }

  const permisos =
    await obtenerPermisosUsuario(req);

  return permisos.includes(permiso);
}


/* =========================================================
   RESPUESTA SIN PERMISO
========================================================= */

function accesoDenegado(
  res,
  permiso
) {

  return res.status(403).json({
    message:
      `No tienes permiso para realizar esta acción: ${permiso}`
  });
}


/* =========================================================
   LIMPIAR DATOS
========================================================= */


function validarContrasenaSegura(password) {
  const value = String(password || '');

  if (value.length < 8) {
    return 'La contraseña debe tener mínimo 8 caracteres';
  }
  if (!/[A-Z]/.test(value)) {
    return 'La contraseña debe contener al menos una mayúscula';
  }
  if (!/[a-z]/.test(value)) {
    return 'La contraseña debe contener al menos una minúscula';
  }
  if (!/[0-9]/.test(value)) {
    return 'La contraseña debe contener al menos un número';
  }
  return null;
}


function cleanData(
  table,
  data
) {

  const allowed =
    tableColumns[table] ||
    new Set();

  return Object.fromEntries(
    Object.entries(data).filter(
      ([key, value]) =>
        allowed.has(key) &&
        key !== 'id' &&
        key !== 'created_at' &&
        key !== 'updated_at' &&
        value !== ''
    )
  );
}

/* =========================================================
   RELACIONES REALES DE PAQUETES

   Los paquetes nuevos pueden relacionar habitaciones y
   servicios por sus IDs. La columna servicios_incluidos se
   conserva para compatibilidad con paquetes antiguos.
========================================================= */

function normalizarRelacionesPaquete(valor) {
  if (!Array.isArray(valor)) {
    return [];
  }

  const mapa = new Map();

  for (const item of valor) {
    const objeto = item && typeof item === 'object'
      ? item
      : { id: item };

    const id = Number(objeto.id ?? objeto.id_servicio ?? objeto.id_habitacion);

    if (!Number.isInteger(id) || id <= 0) {
      continue;
    }

    const cantidad = Math.max(
      1,
      Number.isInteger(Number(objeto.cantidad))
        ? Number(objeto.cantidad)
        : 1
    );

    mapa.set(id, {
      id,
      cantidad,
      precio_componente: Number.isFinite(Number(objeto.precio_componente))
        ? Math.max(0, Number(objeto.precio_componente))
        : 0,
      condicion: objeto.condicion ? String(objeto.condicion).trim() : null
    });
  }

  return [...mapa.values()];
}

async function sincronizarRelacionesPaquete(
  idPaquete,
  habitacionesIncluidas,
  serviciosIncluidos
) {
  const habitaciones = normalizarRelacionesPaquete(habitacionesIncluidas);
  const servicios = normalizarRelacionesPaquete(serviciosIncluidos);

  const habitacionesIds = habitaciones.map(item => item.id);
  const serviciosIds = servicios.map(item => item.id);

  if (habitacionesIds.length) {
    const placeholders = habitacionesIds.map(() => '?').join(',');
    const existentes = await query(
      `SELECT id FROM habitaciones WHERE id IN (${placeholders})`,
      habitacionesIds
    );
    const setExistentes = new Set((existentes || []).map(row => Number(row.id)));
    const faltantes = habitacionesIds.filter(id => !setExistentes.has(id));

    if (faltantes.length) {
      throw Object.assign(
        new Error(`Una o más habitaciones seleccionadas no existen: ${faltantes.join(', ')}`),
        { status: 422 }
      );
    }
  }

  if (serviciosIds.length) {
    const placeholders = serviciosIds.map(() => '?').join(',');
    const existentes = await query(
      `SELECT id FROM servicios WHERE id IN (${placeholders})`,
      serviciosIds
    );
    const setExistentes = new Set((existentes || []).map(row => Number(row.id)));
    const faltantes = serviciosIds.filter(id => !setExistentes.has(id));

    if (faltantes.length) {
      throw Object.assign(
        new Error(`Uno o más servicios seleccionados no existen: ${faltantes.join(', ')}`),
        { status: 422 }
      );
    }
  }

  await query(
    `DELETE FROM paquete_servicios WHERE id_paquete = ?`,
    [idPaquete]
  );

  for (const habitacion of habitaciones) {
    await query(
      `INSERT INTO paquete_servicios
        (id_paquete, id_servicio, id_habitacion, cantidad, precio_componente, condicion)
       VALUES (?, NULL, ?, ?, ?, ?)`,
      [
        idPaquete,
        habitacion.id,
        habitacion.cantidad,
        habitacion.precio_componente,
        habitacion.condicion
      ]
    );
  }

  for (const servicio of servicios) {
    await query(
      `INSERT INTO paquete_servicios
        (id_paquete, id_servicio, id_habitacion, cantidad, precio_componente, condicion)
       VALUES (?, ?, NULL, ?, ?, ?)`,
      [
        idPaquete,
        servicio.id,
        servicio.cantidad,
        servicio.precio_componente,
        servicio.condicion
      ]
    );
  }
}

function relacionesPaqueteEnBody(body) {
  return (
    Object.prototype.hasOwnProperty.call(body || {}, 'habitaciones_incluidas') ||
    Object.prototype.hasOwnProperty.call(body || {}, 'servicios_incluidos_ids')
  );
}


/* =========================================================
   OBTENER ID DEL CLIENTE ACTUAL
========================================================= */

async function obtenerIdCliente(req) {

  if (!req.user) {
    return null;
  }

  const rows =
    await query(
      `
        SELECT id
        FROM clientes
        WHERE correo = ?
        LIMIT 1
      `,
      [req.user.correo]
    );

  return rows?.[0]?.id || null;
}


/* =========================================================
   COMPROBAR PROPIEDAD
========================================================= */

async function comprobarPropiedadCliente(
  req,
  table,
  id
) {

  if (
    req.user?.rol !== 'Cliente'
  ) {
    return true;
  }

  const idCliente =
    await obtenerIdCliente(req);

  if (!idCliente) {
    return false;
  }


  /* =======================================================
     FEEDBACK
  ======================================================= */

  if (
    table === 'encuestas_feedback'
  ) {

    const rows =
      await query(
        `
          SELECT id
          FROM encuestas_feedback
          WHERE id = ?
            AND id_cliente = ?
          LIMIT 1
        `,
        [
          id,
          idCliente
        ]
      );

    return Boolean(rows?.[0]);
  }


  /* =======================================================
     HUÉSPEDES
  ======================================================= */

  if (
    table === 'huespedes'
  ) {

    const rows =
      await query(
        `
          SELECT h.id
          FROM huespedes h
          INNER JOIN reservas r
            ON r.id = h.id_reserva
          WHERE h.id = ?
            AND r.id_cliente = ?
          LIMIT 1
        `,
        [
          id,
          idCliente
        ]
      );

    return Boolean(rows?.[0]);
  }


  return false;
}


/* =========================================================
   COMPROBAR RESERVA DEL CLIENTE
========================================================= */

async function comprobarReservaCliente(
  req,
  idReserva
) {

  if (
    req.user?.rol !== 'Cliente'
  ) {
    return true;
  }

  const idCliente =
    await obtenerIdCliente(req);

  if (!idCliente) {
    return false;
  }

  const rows =
    await query(
      `
        SELECT id
        FROM reservas
        WHERE id = ?
          AND id_cliente = ?
        LIMIT 1
      `,
      [
        idReserva,
        idCliente
      ]
    );

  return Boolean(rows?.[0]);
}


/* =========================================================
   LISTAR
========================================================= */

export const genericList =
  table => async (
    req,
    res,
    next
  ) => {

    try {

      if (
        !safeTables.has(table)
      ) {
        return res.status(400).json({
          message:
            'Tabla no permitida'
        });
      }


      const puedeVer =
        await tienePermiso(
          req,
          'ver'
        );

      if (!puedeVer) {
        return accesoDenegado(
          res,
          'ver'
        );
      }


      /*
         El módulo clientes es administrativo en general, pero el
         cliente autenticado puede consultar únicamente su propio
         perfil. La relación actual del sistema se mantiene por correo.
      */
      if (
        req.user?.rol === 'Cliente' &&
        table === 'clientes'
      ) {
        const search = String(req.query.search || '').trim();
        const limit = Math.min(Number(req.query.limit) || 50, 100);
        const idCliente = await obtenerIdCliente(req);

        if (!idCliente) {
          return res.json({ rows: [], total: 0 });
        }

        const rows = await query(
          `SELECT * FROM clientes
           WHERE id = ?
             AND (? = '' OR nombre LIKE ? OR apellido LIKE ? OR correo LIKE ?)
           LIMIT ${limit}`,
          [
            idCliente,
            search,
            `%${search}%`,
            `%${search}%`,
            `%${search}%`
          ]
        );

        return res.json({
          rows: rows || [],
          total: rows?.length || 0
        });
      }

      if (
        req.user?.rol === 'Cliente' &&
        TABLAS_ADMIN.has(table)
      ) {

        return res.status(403).json({
          message:
            'Los clientes no pueden acceder a este módulo'
        });
      }


      if (
        req.user?.rol === 'Cliente' &&
        !MODULOS_CLIENTE.has(table)
      ) {

        return res.status(403).json({
          message:
            'No tienes acceso a este módulo'
        });
      }


      /* =====================================================
         HABITACIONES PARA CLIENTE
      ===================================================== */

      if (
        req.user?.rol === 'Cliente' &&
        table === 'habitaciones'
      ) {

        const search = String(req.query.search || '').trim();
        const tipoHabitacion = String(req.query.tipo_habitacion || '').trim();
        const capacidadMin = req.query.capacidad_min === undefined || req.query.capacidad_min === ''
          ? null
          : Number(req.query.capacidad_min);
        const capacidadMax = req.query.capacidad_max === undefined || req.query.capacidad_max === ''
          ? null
          : Number(req.query.capacidad_max);
        const precioMin = req.query.precio_min === undefined || req.query.precio_min === ''
          ? null
          : Number(req.query.precio_min);
        const precioMax = req.query.precio_max === undefined || req.query.precio_max === ''
          ? null
          : Number(req.query.precio_max);

        const limitSolicitado = Number(req.query.limit);
        const limit = Math.min(
          Math.max(
            Number.isFinite(limitSolicitado) && limitSolicitado > 0
              ? Math.floor(limitSolicitado)
              : 6,
            1
          ),
          100
        );

        const page = Math.max(1, Number(req.query.page) || 1);
        const offset = (page - 1) * limit;

        const condiciones = [
          `h.estado = 'disponible'`,
          `(h.numero_habitacion LIKE ? OR h.tipo_habitacion LIKE ? OR h.descripcion LIKE ? OR h.comodidades LIKE ?)`
        ];
        const parametros = [
          `%${search}%`,
          `%${search}%`,
          `%${search}%`,
          `%${search}%`
        ];

        if (tipoHabitacion) {
          condiciones.push(`h.tipo_habitacion = ?`);
          parametros.push(tipoHabitacion);
        }

        if (Number.isFinite(capacidadMin)) {
          condiciones.push(`h.capacidad_maxima >= ?`);
          parametros.push(capacidadMin);
        }

        if (Number.isFinite(capacidadMax)) {
          condiciones.push(`h.capacidad_maxima <= ?`);
          parametros.push(capacidadMax);
        }

        if (Number.isFinite(precioMin)) {
          condiciones.push(`h.tarifa >= ?`);
          parametros.push(precioMin);
        }

        if (Number.isFinite(precioMax)) {
          condiciones.push(`h.tarifa <= ?`);
          parametros.push(precioMax);
        }

        const ordenesPermitidos = {
          precio_asc: 'h.tarifa ASC, h.id DESC',
          precio_desc: 'h.tarifa DESC, h.id DESC',
          capacidad_asc: 'h.capacidad_maxima ASC, h.id DESC',
          capacidad_desc: 'h.capacidad_maxima DESC, h.id DESC',
          numero_asc: 'h.numero_habitacion ASC, h.id DESC',
          numero_desc: 'h.numero_habitacion DESC, h.id DESC'
        };
        const orden = ordenesPermitidos[String(req.query.orden || '')] || 'h.id DESC';
        const where = condiciones.join(' AND ');

        const countRows = await query(
          `SELECT COUNT(*) AS total
           FROM habitaciones h
           WHERE ${where}`,
          parametros
        );

        const rows = await query(
          `SELECT h.*,
             COALESCE((SELECT JSON_ARRAYAGG(JSON_OBJECT(
               'id', hi.id, 'archivo', hi.archivo, 'nombre_original', hi.nombre_original, 'orden', hi.orden
             )) FROM habitacion_imagenes hi WHERE hi.id_habitacion = h.id), JSON_ARRAY()) AS imagenes
           FROM habitaciones h
           WHERE ${where}
           ORDER BY ${orden}
           LIMIT ${limit} OFFSET ${offset}`,
          parametros
        );

        const tiposRows = await query(
          `SELECT DISTINCT h.tipo_habitacion
           FROM habitaciones h
           WHERE h.estado = 'disponible'
             AND h.tipo_habitacion IS NOT NULL
             AND TRIM(h.tipo_habitacion) <> ''
           ORDER BY h.tipo_habitacion ASC`
        );

        const tipos = (tiposRows || [])
          .map((item) => item.tipo_habitacion)
          .filter(Boolean);

        const total = Number(countRows?.[0]?.total || 0);
        return res.json({ rows: rows || [], total, page, limit, totalPages: Math.ceil(total / limit), tipos });
      }


      /* =====================================================
         SERVICIOS PARA CLIENTE
         
         IMPORTANTE:
         
         disponibilidad = 1
         estado = 1
         
         El cliente solamente recibe servicios que
         estén disponibles Y activos.
         
         Si cualquiera de los dos valores es 0,
         el servicio NO se envía al cliente.
         ===================================================== */

      if (
        req.user?.rol === 'Cliente' &&
        table === 'servicios'
      ) {

        const search = String(req.query.search || '').trim();
        const categoria = String(req.query.categoria || '').trim();
        const precioMin = req.query.precio_min === undefined || req.query.precio_min === ''
          ? null
          : Number(req.query.precio_min);
        const precioMax = req.query.precio_max === undefined || req.query.precio_max === ''
          ? null
          : Number(req.query.precio_max);

        const limitSolicitado = Number(req.query.limit);
        const limit = Math.min(
          Math.max(
            Number.isFinite(limitSolicitado) && limitSolicitado > 0
              ? Math.floor(limitSolicitado)
              : 6,
            1
          ),
          100
        );
        const page = Math.max(1, Number(req.query.page) || 1);
        const offset = (page - 1) * limit;

        const condiciones = [
          `s.disponibilidad = 1`,
          `s.estado = 1`,
          `s.cantidad_disponible > 0`,
          `(s.nombre_servicio LIKE ? OR s.descripcion LIKE ? OR s.categoria LIKE ? OR s.observacion LIKE ?)`
        ];
        const parametros = [
          `%${search}%`,
          `%${search}%`,
          `%${search}%`,
          `%${search}%`
        ];

        if (categoria) {
          condiciones.push(`s.categoria = ?`);
          parametros.push(categoria);
        }

        if (Number.isFinite(precioMin)) {
          condiciones.push(`s.costo >= ?`);
          parametros.push(precioMin);
        }

        if (Number.isFinite(precioMax)) {
          condiciones.push(`s.costo <= ?`);
          parametros.push(precioMax);
        }

        const ordenesPermitidos = {
          precio_asc: 's.costo ASC, s.id DESC',
          precio_desc: 's.costo DESC, s.id DESC',
          nombre_asc: 's.nombre_servicio ASC, s.id DESC',
          nombre_desc: 's.nombre_servicio DESC, s.id DESC',
          disponibilidad_desc: 's.cantidad_disponible DESC, s.id DESC'
        };
        const orden = ordenesPermitidos[String(req.query.orden || '')] || 's.id DESC';
        const where = condiciones.join(' AND ');

        const countRows = await query(
          `SELECT COUNT(*) AS total
           FROM servicios s
           WHERE ${where}`,
          parametros
        );

        const rows = await query(
          `SELECT s.id, s.nombre_servicio, s.descripcion, s.categoria, s.costo, s.disponibilidad, s.cantidad_disponible, s.observacion, s.estado,
             COALESCE((SELECT JSON_ARRAYAGG(JSON_OBJECT(
               'id', si.id, 'archivo', si.archivo, 'nombre_original', si.nombre_original, 'orden', si.orden
             )) FROM servicio_imagenes si WHERE si.id_servicio = s.id), JSON_ARRAY()) AS imagenes
           FROM servicios s
           WHERE ${where}
           ORDER BY ${orden}
           LIMIT ${limit} OFFSET ${offset}`,
          parametros
        );

        const categoriasRows = await query(
          `SELECT DISTINCT s.categoria
           FROM servicios s
           WHERE s.disponibilidad = 1
             AND s.estado = 1
             AND s.cantidad_disponible > 0
             AND s.categoria IS NOT NULL
             AND TRIM(s.categoria) <> ''
           ORDER BY s.categoria ASC`
        );
        const categorias = (categoriasRows || [])
          .map((item) => item.categoria)
          .filter(Boolean);

        const total = Number(countRows?.[0]?.total || 0);
        return res.json({ rows: rows || [], total, page, limit, totalPages: Math.ceil(total / limit), categorias });
      }


      /* =====================================================
         PAQUETES PARA CLIENTE

         Solo se publican paquetes disponibles y activos.
         ===================================================== */

      if (
        req.user?.rol === 'Cliente' &&
        table === 'paquetes'
      ) {
        const search = String(req.query.search || '').trim();
        const destino = String(req.query.destino || '').trim();
        const tipoViaje = String(req.query.tipo_viaje || '').trim();
        const precioMax = req.query.precio_max === undefined || req.query.precio_max === ''
          ? null
          : Number(req.query.precio_max);
        const precioMin = req.query.precio_min === undefined || req.query.precio_min === ''
          ? null
          : Number(req.query.precio_min);
        const incluye = String(req.query.incluye || '').trim().toLowerCase();
        const ordenarSolicitado = String(req.query.ordenar || 'recientes').trim().toLowerCase();
        const ordenesPermitidos = {
          recientes: 'p.id DESC',
          precio_asc: 'p.precio ASC, p.id DESC',
          precio_desc: 'p.precio DESC, p.id DESC',
          nombre: 'p.nombre ASC, p.id DESC'
        };
        const ordenSql = ordenesPermitidos[ordenarSolicitado] || ordenesPermitidos.recientes;
        const limit = 6;
        const page = Math.max(1, Number(req.query.page) || 1);
        const offset = (page - 1) * limit;
        const precioFiltro = Number.isFinite(precioMax) ? precioMax : null;
        const precioMinFiltro = Number.isFinite(precioMin) ? precioMin : null;
        const incluyeServicios = incluye === 'servicios';
        const incluyeHabitacion = incluye === 'habitacion';
        const filtros = [
          search, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`,
          destino, `%${destino}%`, tipoViaje, `%${tipoViaje}%`,
          precioMinFiltro, precioMinFiltro, precioFiltro, precioFiltro,
          incluyeServicios, incluyeHabitacion
        ];

        const countRows = await query(
          `SELECT COUNT(*) AS total FROM paquetes p
           WHERE (p.disponibilidad = 1 OR p.disponibilidad = TRUE)
             AND LOWER(CAST(p.estado AS CHAR)) IN ('activo', 'en_promocion', 'en promoción', '1', 'true')
             AND NOT EXISTS (
               SELECT 1
               FROM paquete_servicios ps
               LEFT JOIN habitaciones h ON h.id = ps.id_habitacion
               LEFT JOIN servicios s ON s.id = ps.id_servicio
               WHERE ps.id_paquete = p.id
                 AND (
                   (ps.id_habitacion IS NOT NULL AND (h.id IS NULL OR h.estado <> 'disponible'))
                   OR (ps.id_servicio IS NOT NULL AND (s.id IS NULL OR s.estado <> 1 OR s.disponibilidad <> 1 OR s.cantidad_disponible < ps.cantidad))
                 )
             )
             AND (? = '' OR p.nombre LIKE ? OR p.descripcion LIKE ? OR p.destino LIKE ? OR p.condiciones LIKE ? OR p.tipo_viaje LIKE ?)
             AND (? = '' OR p.destino LIKE ?) AND (? = '' OR p.tipo_viaje LIKE ?)
             AND (? IS NULL OR p.precio >= ?) AND (? IS NULL OR p.precio <= ?)
             AND (
               ? = FALSE OR EXISTS (
                 SELECT 1
                 FROM paquete_servicios ps
                 WHERE ps.id_paquete = p.id
                   AND ps.id_servicio IS NOT NULL
               ) OR (
                 NOT EXISTS (
                   SELECT 1
                   FROM paquete_servicios ps
                   WHERE ps.id_paquete = p.id
                     AND (ps.id_servicio IS NOT NULL OR ps.id_habitacion IS NOT NULL)
                 )
                 AND COALESCE(TRIM(CAST(p.servicios_incluidos AS CHAR)), '') <> ''
               )
             )
             AND (
               ? = FALSE OR EXISTS (
                 SELECT 1
                 FROM paquete_servicios ps
                 WHERE ps.id_paquete = p.id
                   AND ps.id_habitacion IS NOT NULL
               ) OR (
                 NOT EXISTS (
                   SELECT 1
                   FROM paquete_servicios ps
                   WHERE ps.id_paquete = p.id
                     AND (ps.id_servicio IS NOT NULL OR ps.id_habitacion IS NOT NULL)
                 )
                 AND (
                   LOWER(CAST(p.servicios_incluidos AS CHAR)) LIKE '%habitacion%'
                   OR LOWER(CAST(p.servicios_incluidos AS CHAR)) LIKE '%habitación%'
                 )
               )
             )`,
          filtros
        );

        const rows = await query(
          `SELECT p.*,
             COALESCE((SELECT JSON_ARRAYAGG(JSON_OBJECT(
               'id', pi.id, 'archivo', pi.archivo, 'nombre_original', pi.nombre_original, 'orden', pi.orden
             )) FROM paquete_imagenes pi WHERE pi.id_paquete = p.id), JSON_ARRAY()) AS imagenes
           FROM paquetes p
           WHERE (p.disponibilidad = 1 OR p.disponibilidad = TRUE)
             AND LOWER(CAST(p.estado AS CHAR)) IN ('activo', 'en_promocion', 'en promoción', '1', 'true')
             AND NOT EXISTS (
               SELECT 1
               FROM paquete_servicios ps
               LEFT JOIN habitaciones h ON h.id = ps.id_habitacion
               LEFT JOIN servicios s ON s.id = ps.id_servicio
               WHERE ps.id_paquete = p.id
                 AND (
                   (ps.id_habitacion IS NOT NULL AND (h.id IS NULL OR h.estado <> 'disponible'))
                   OR (ps.id_servicio IS NOT NULL AND (s.id IS NULL OR s.estado <> 1 OR s.disponibilidad <> 1 OR s.cantidad_disponible < ps.cantidad))
                 )
             )
             AND (? = '' OR p.nombre LIKE ? OR p.descripcion LIKE ? OR p.destino LIKE ? OR p.condiciones LIKE ? OR p.tipo_viaje LIKE ?)
             AND (? = '' OR p.destino LIKE ?) AND (? = '' OR p.tipo_viaje LIKE ?)
             AND (? IS NULL OR p.precio >= ?) AND (? IS NULL OR p.precio <= ?)
             AND (
               ? = FALSE OR EXISTS (
                 SELECT 1
                 FROM paquete_servicios ps
                 WHERE ps.id_paquete = p.id
                   AND ps.id_servicio IS NOT NULL
               ) OR (
                 NOT EXISTS (
                   SELECT 1
                   FROM paquete_servicios ps
                   WHERE ps.id_paquete = p.id
                     AND (ps.id_servicio IS NOT NULL OR ps.id_habitacion IS NOT NULL)
                 )
                 AND COALESCE(TRIM(CAST(p.servicios_incluidos AS CHAR)), '') <> ''
               )
             )
             AND (
               ? = FALSE OR EXISTS (
                 SELECT 1
                 FROM paquete_servicios ps
                 WHERE ps.id_paquete = p.id
                   AND ps.id_habitacion IS NOT NULL
               ) OR (
                 NOT EXISTS (
                   SELECT 1
                   FROM paquete_servicios ps
                   WHERE ps.id_paquete = p.id
                     AND (ps.id_servicio IS NOT NULL OR ps.id_habitacion IS NOT NULL)
                 )
                 AND (
                   LOWER(CAST(p.servicios_incluidos AS CHAR)) LIKE '%habitacion%'
                   OR LOWER(CAST(p.servicios_incluidos AS CHAR)) LIKE '%habitación%'
                 )
               )
             )
           ORDER BY ${ordenSql} LIMIT ${limit} OFFSET ${offset}`,
          filtros
        );

        const opciones = await query(
          `SELECT DISTINCT destino, tipo_viaje FROM paquetes
           WHERE (disponibilidad = 1 OR disponibilidad = TRUE)
             AND LOWER(CAST(estado AS CHAR)) IN ('activo', 'en_promocion', 'en promoción', '1', 'true')
           ORDER BY destino ASC, tipo_viaje ASC`
        );
        const destinos = [...new Set((opciones || []).map((item) => item.destino).filter(Boolean))].sort();
        const tipos = [...new Set((opciones || []).map((item) => item.tipo_viaje).filter(Boolean))].sort();
        const total = Number(countRows?.[0]?.total || 0);
        return res.json({ rows: rows || [], total, page, limit, totalPages: Math.ceil(total / limit), destinos, tipos });
      }


      /* =====================================================
         HUÉSPEDES DEL CLIENTE
      ===================================================== */

      if (
        req.user?.rol === 'Cliente' &&
        table === 'huespedes'
      ) {

        const idCliente =
          await obtenerIdCliente(req);

        if (!idCliente) {

          return res.status(403).json({
            message:
              'No se encontró el cliente asociado a tu usuario'
          });
        }

        const search =
          req.query.search || '';

        const limit =
          Math.min(
            Number(req.query.limit) || 50,
            100
          );

        const rows =
          await query(
            `
              SELECT h.*
              FROM huespedes h
              INNER JOIN reservas r
                ON r.id = h.id_reserva
              WHERE r.id_cliente = ?
                AND (
                  h.documento LIKE ?
                  OR h.nombres LIKE ?
                  OR h.apellidos LIKE ?
                  OR h.correo LIKE ?
                )
              ORDER BY h.id DESC
              LIMIT ${limit}
            `,
            [
              idCliente,
              `%${search}%`,
              `%${search}%`,
              `%${search}%`,
              `%${search}%`
            ]
          );

        return res.json({
          rows: rows || [],
          total: rows ? rows.length : 0
        });
      }


      /* =====================================================
         FEEDBACK DEL CLIENTE
      ===================================================== */

      if (
        req.user?.rol === 'Cliente' &&
        table === 'encuestas_feedback'
      ) {

        const idCliente =
          await obtenerIdCliente(req);

        if (!idCliente) {

          return res.status(403).json({
            message:
              'No se encontró el cliente asociado a tu usuario'
          });
        }

        const search =
          req.query.search || '';

        const limit =
          Math.min(
            Number(req.query.limit) || 50,
            100
          );

        const rows =
          await query(
            `
              SELECT f.*
              FROM encuestas_feedback f
              WHERE f.id_cliente = ?
                AND (
                  f.comentario LIKE ?
                  OR CAST(f.calificacion AS CHAR) LIKE ?
                )
              ORDER BY f.id DESC
              LIMIT ${limit}
            `,
            [
              idCliente,
              `%${search}%`,
              `%${search}%`
            ]
          );

        return res.json({
          rows: rows || [],
          total: rows ? rows.length : 0
        });
      }


      return res.json(
        await list(
          table,
          req.query
        )
      );

    } catch (e) {

      next(e);
    }
  };


/* =========================================================
   OBTENER UNO
========================================================= */

export const genericGet =
  table => async (
    req,
    res,
    next
  ) => {

    try {

      if (
        !safeTables.has(table)
      ) {

        return res.status(400).json({
          message:
            'Tabla no permitida'
        });
      }


      const puedeVer =
        await tienePermiso(
          req,
          'ver'
        );

      if (!puedeVer) {

        return accesoDenegado(
          res,
          'ver'
        );
      }


      if (
        req.user?.rol === 'Cliente' &&
        TABLAS_ADMIN.has(table)
      ) {

        return res.status(403).json({
          message:
            'Los clientes no pueden acceder a este módulo'
        });
      }


      if (
        req.user?.rol === 'Cliente' &&
        !MODULOS_CLIENTE.has(table)
      ) {

        return res.status(403).json({
          message:
            'No tienes acceso a este módulo'
        });
      }


      let rows;

      if (table === 'servicios') {
        rows = await query(
          `
            SELECT
              s.*,
              COALESCE(
                (
                  SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                      'id', si.id,
                      'archivo', si.archivo,
                      'nombre_original', si.nombre_original,
                      'orden', si.orden
                    )
                  )
                  FROM servicio_imagenes si
                  WHERE si.id_servicio = s.id
                ),
                JSON_ARRAY()
              ) AS imagenes
            FROM servicios s
            WHERE s.id = ?
          `,
          [req.params.id]
        );
      } else if (table === 'paquetes') {
        rows = await query(
          `
            SELECT
              p.*,
              COALESCE(
                (
                  SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                      'id', ps.id,
                      'id_servicio', ps.id_servicio,
                      'id_habitacion', ps.id_habitacion,
                      'cantidad', ps.cantidad,
                      'precio_componente', ps.precio_componente,
                      'condicion', ps.condicion
                    )
                  )
                  FROM paquete_servicios ps
                  WHERE ps.id_paquete = p.id
                    AND (ps.id_servicio IS NOT NULL OR ps.id_habitacion IS NOT NULL)
                ),
                JSON_ARRAY()
              ) AS componentes_relacionados
            FROM paquetes p
            WHERE p.id = ?
          `,
          [req.params.id]
        );
      } else {
        rows = await query(
          `SELECT * FROM ${table} WHERE id = ?`,
          [req.params.id]
        );
      }


      if (!rows || !rows[0]) {

        return res.status(404).json({
          message:
            'Registro no encontrado'
        });
      }


      /* =====================================================
         SEGURIDAD HABITACIONES
      ===================================================== */

      if (
        req.user?.rol === 'Cliente' &&
        table === 'habitaciones'
      ) {

        if (
          rows[0].estado !== 'disponible'
        ) {

          return res.status(403).json({
            message:
              'Esta habitación no está disponible para consulta'
          });
        }
      }


      /* =====================================================
         SEGURIDAD SERVICIOS
         
         El cliente tampoco puede consultar directamente
         un servicio que no esté disponible o activo.
         ===================================================== */

      if (
        req.user?.rol === 'Cliente' &&
        table === 'servicios'
      ) {

        const disponibilidad =
          Number(rows[0].disponibilidad);

        const estado =
          Number(rows[0].estado);

        if (
          disponibilidad !== 1 ||
          estado !== 1
        ) {

          return res.status(403).json({
            message:
              'Este servicio no está disponible'
          });
        }
      }


      /* =====================================================
         SEGURIDAD PAQUETES

         Un cliente tampoco puede consultar directamente un
         paquete que ya esté inactivo o no disponible.
         ===================================================== */

      if (
        req.user?.rol === 'Cliente' &&
        table === 'paquetes'
      ) {

        const disponibilidad =
          Number(rows[0].disponibilidad);

        const estadoPaquete =
          String(rows[0].estado ?? '')
            .trim()
            .toLowerCase();

        const estadoValido = [
          '1',
          'true',
          'activo',
          'en_promocion',
          'en promoción'
        ].includes(estadoPaquete);

        if (
          disponibilidad !== 1 ||
          !estadoValido
        ) {

          return res.status(403).json({
            message:
              'Este paquete no está disponible'
          });
        }
      }


      if (
        req.user?.rol === 'Cliente' &&
        (
          table === 'huespedes' ||
          table === 'encuestas_feedback'
        )
      ) {

        const propietario =
          await comprobarPropiedadCliente(
            req,
            table,
            req.params.id
          );

        if (!propietario) {

          return res.status(403).json({
            message:
              'No puedes acceder a este registro'
          });
        }
      }


      return res.json(
        rows[0]
      );

    } catch (e) {

      next(e);
    }
  };


async function obtenerNombreRolPorId(idRol) {
  if (!idRol) return 'Cliente';

  const rows = await query(
    `SELECT nombre_rol FROM roles WHERE id = ? LIMIT 1`,
    [idRol]
  );

  return rows?.[0]?.nombre_rol || 'Cliente';
}


/* =========================================================
   CREAR
========================================================= */

export const genericCreate =
  table => async (
    req,
    res,
    next
  ) => {

    try {

      if (
        !safeTables.has(table)
      ) {

        return res.status(400).json({
          message:
            'Tabla no permitida'
        });
      }


      const puedeCrear =
        await tienePermiso(
          req,
          'crear'
        );

      if (!puedeCrear) {

        return accesoDenegado(
          res,
          'crear'
        );
      }


      if (
        req.user?.rol === 'Cliente'
      ) {

        if (
          TABLAS_ADMIN.has(table)
        ) {

          return res.status(403).json({
            message:
              'No puedes crear registros en este módulo'
          });
        }


        if (
          !CLIENTE_PUEDE_CREAR.has(table)
        ) {

          return res.status(403).json({
            message:
              'No tienes permiso para crear registros en este módulo'
          });
        }
      }


      const data =
        cleanData(
          table,
          req.body
        );


      /* =====================================================
         INVENTARIO DE SERVICIOS
         cantidad_disponible representa cuántas unidades
         reales del servicio pueden reservarse.
      ===================================================== */

      if (table === 'servicios') {
        const cantidad = Number(
          data.cantidad_disponible ?? 1
        );

        if (
          !Number.isInteger(cantidad) ||
          cantidad < 0
        ) {
          return res.status(422).json({
            message: 'La cantidad disponible del servicio debe ser un número entero mayor o igual a 0'
          });
        }

        data.cantidad_disponible = cantidad;
      }


      if (
        req.user?.rol === 'Cliente' &&
        table === 'encuestas_feedback'
      ) {

        const idCliente =
          await obtenerIdCliente(req);

        if (!idCliente) {

          return res.status(403).json({
            message:
              'No se encontró el cliente asociado a tu usuario'
          });
        }

        data.id_cliente =
          idCliente;


        if (
          data.id_huesped
        ) {

          const idClienteActual =
            await query(
              `
                SELECT r.id_cliente
                FROM huespedes h
                INNER JOIN reservas r
                  ON r.id = h.id_reserva
                WHERE h.id = ?
                LIMIT 1
              `,
              [data.id_huesped]
            );


          if (
            !idClienteActual ||
            !idClienteActual[0] ||
            Number(
              idClienteActual[0].id_cliente
            ) !== Number(idCliente)
          ) {

            return res.status(403).json({
              message:
                'El huésped no pertenece al cliente actual'
            });
          }
        }
      }


      if (
        req.user?.rol === 'Cliente' &&
        table === 'huespedes'
      ) {

        if (
          !data.id_reserva
        ) {

          return res.status(422).json({
            message:
              'La reserva es obligatoria para crear un huésped'
          });
        }


        const reservaValida =
          await comprobarReservaCliente(
            req,
            data.id_reserva
          );


        if (!reservaValida) {

          return res.status(403).json({
            message:
              'No puedes agregar huéspedes a una reserva que no te pertenece'
          });
        }
      }


      const contrasenaOriginal =
        table === 'usuarios'
          ? String(data.contrasena || '')
          : '';

      if (table === 'usuarios') {
        const errorContrasena =
          validarContrasenaSegura(contrasenaOriginal);

        if (errorContrasena) {
          return res.status(422).json({
            message: errorContrasena
          });
        }
      }

      if (
        table === 'usuarios' &&
        data.contrasena
      ) {

        data.contrasena =
          await bcrypt.hash(
            data.contrasena,
            10
          );
      }


      const keys =
        Object.keys(data);


      if (!keys.length) {

        return res.status(422).json({
          message:
            'Sin datos'
        });
      }


      const placeholders =
        keys
          .map(() => '?')
          .join(',');


      const values =
        keys.map(
          key => data[key]
        );


      const result =
        await query(
          `
            INSERT INTO ${table}
            (${keys.join(',')})
            VALUES (${placeholders})
          `,
          values
        );

      const nuevoId =
        result?.insertId ||
        result?.[0]?.insertId;

      if (table === 'paquetes' && nuevoId && relacionesPaqueteEnBody(req.body)) {
        try {
          await sincronizarRelacionesPaquete(
            nuevoId,
            req.body.habitaciones_incluidas,
            req.body.servicios_incluidos_ids
          );
        } catch (relationError) {
          try {
            await query(`DELETE FROM paquetes WHERE id = ?`, [nuevoId]);
          } catch {
            /* Conservamos el error original de validación/relación. */
          }
          throw relationError;
        }
      }

      if (table === 'usuarios') {
        try {
          await enviarCorreoBienvenida({
            destinatario: String(req.body.correo || '').trim().toLowerCase(),
            nombre: String(req.body.nombre_usuario || 'Usuario').trim(),
            nombreUsuario: String(req.body.nombre_usuario || '').trim(),
            rol: await obtenerNombreRolPorId(req.body.id_rol)
          });
        } catch (emailError) {
          console.error(
            `La cuenta ${nuevoId} fue creada, pero no fue posible enviar el correo de bienvenida:`,
            emailError
          );
        }
      }

      return res.status(201).json({
        id:
          result?.insertId ||
          result?.[0]?.insertId,

        message:
          'Creado correctamente'
      });

    } catch (e) {

      if (
        e.code === 'ER_DUP_ENTRY'
      ) {

        return res.status(409).json({
          message:
            'Registro duplicado'
        });
      }

      next(e);
    }
  };


/* =========================================================
   EDITAR
========================================================= */

export const genericUpdate =
  table => async (
    req,
    res,
    next
  ) => {

    try {

      if (
        !safeTables.has(table)
      ) {

        return res.status(400).json({
          message:
            'Tabla no permitida'
        });
      }


      const puedeEditar =
        await tienePermiso(
          req,
          'editar'
        );

      if (!puedeEditar) {

        return accesoDenegado(
          res,
          'editar'
        );
      }


      if (
        req.user?.rol === 'Cliente' &&
        table === 'clientes'
      ) {
        const idCliente = await obtenerIdCliente(req);

        if (!idCliente || Number(idCliente) !== Number(req.params.id)) {
          return res.status(403).json({
            message: 'Solo puedes editar tu propio perfil'
          });
        }

        const data = cleanData(table, req.body);
        const camposPermitidos = [
          'nombre',
          'apellido',
          'telefono',
          'direccion'
        ];

        for (const key of Object.keys(data)) {
          if (!camposPermitidos.includes(key)) {
            delete data[key];
          }
        }

        const keys = Object.keys(data);

        if (!keys.length) {
          return res.status(422).json({
            message: 'No hay cambios permitidos para guardar'
          });
        }

        const assignments = keys.map(key => `${key} = ?`).join(',');
        const values = keys.map(key => data[key]);
        values.push(idCliente);

        const result = await query(
          `UPDATE clientes SET ${assignments} WHERE id = ?`,
          values
        );

        const affectedRows = result?.affectedRows ?? result?.[0]?.affectedRows ?? 0;

        if (!affectedRows) {
          return res.status(404).json({ message: 'Perfil no encontrado' });
        }

        return res.json({
          message: 'Perfil actualizado correctamente'
        });
      }

      if (
        req.user?.rol === 'Cliente' &&
        TABLAS_ADMIN.has(table)
      ) {

        return res.status(403).json({
          message:
            'No puedes editar registros de este módulo'
        });
      }


      if (
        req.user?.rol === 'Cliente' &&
        !CLIENTE_PUEDE_EDITAR.has(table)
      ) {

        return res.status(403).json({
          message:
            'No tienes permiso para editar este módulo'
        });
      }


      if (
        req.user?.rol === 'Cliente'
      ) {

        const propietario =
          await comprobarPropiedadCliente(
            req,
            table,
            req.params.id
          );


        if (!propietario) {

          return res.status(403).json({
            message:
              'No puedes editar un registro que no te pertenece'
          });
        }
      }


      const data =
        cleanData(
          table,
          req.body
        );


      /* =====================================================
         INVENTARIO DE SERVICIOS
      ===================================================== */

      if (table === 'servicios' && Object.prototype.hasOwnProperty.call(data, 'cantidad_disponible')) {
        const cantidad = Number(data.cantidad_disponible);

        if (
          !Number.isInteger(cantidad) ||
          cantidad < 0
        ) {
          return res.status(422).json({
            message: 'La cantidad disponible del servicio debe ser un número entero mayor o igual a 0'
          });
        }

        data.cantidad_disponible = cantidad;
      }


      if (
        req.user?.rol === 'Cliente' &&
        table === 'encuestas_feedback'
      ) {

        delete data.id_cliente;


        if (
          data.id_huesped
        ) {

          const idCliente =
            await obtenerIdCliente(req);


          const rows =
            await query(
              `
                SELECT r.id_cliente
                FROM huespedes h
                INNER JOIN reservas r
                  ON r.id = h.id_reserva
                WHERE h.id = ?
                LIMIT 1
              `,
              [data.id_huesped]
            );


          if (
            !rows ||
            !rows[0] ||
            Number(rows[0].id_cliente) !==
              Number(idCliente)
          ) {

            return res.status(403).json({
              message:
                'El huésped no pertenece al cliente actual'
            });
          }
        }
      }


      const contrasenaOriginal =
        table === 'usuarios'
          ? String(data.contrasena || '')
          : '';

      if (table === 'usuarios' && data.contrasena) {
        const errorContrasena =
          validarContrasenaSegura(contrasenaOriginal);

        if (errorContrasena) {
          return res.status(422).json({
            message: errorContrasena
          });
        }
      }

      if (
        table === 'usuarios' &&
        data.contrasena
      ) {

        data.contrasena =
          await bcrypt.hash(
            data.contrasena,
            10
          );
      }


      const keys =
        Object.keys(data);


      const soloRelacionesPaquete =
        table === 'paquetes' &&
        relacionesPaqueteEnBody(req.body) &&
        !keys.length;

      if (!keys.length && !soloRelacionesPaquete) {

        return res.status(422).json({
          message:
            'Sin cambios'
        });
      }

      let affectedRows = 1;

      if (keys.length) {
        const assignments =
          keys
            .map(
              key => `${key} = ?`
            )
            .join(',');

        const values =
          keys.map(
            key => data[key]
          );

        values.push(
          req.params.id
        );

        const result =
          await query(
            `
              UPDATE ${table}
              SET ${assignments}
              WHERE id = ?
            `,
            values
          );

        affectedRows =
          result?.affectedRows ??
          result?.[0]?.affectedRows ??
          0;
      }


      if (
        affectedRows === 0
      ) {

        return res.status(404).json({
          message:
            'Registro no encontrado'
        });
      }

      if (table === 'paquetes' && relacionesPaqueteEnBody(req.body)) {
        await sincronizarRelacionesPaquete(
          req.params.id,
          req.body.habitaciones_incluidas,
          req.body.servicios_incluidos_ids
        );
      }

      return res.json({
        message:
          'Actualizado correctamente'
      });

    } catch (e) {

      if (
        e.code === 'ER_DUP_ENTRY'
      ) {

        return res.status(409).json({
          message:
            'Registro duplicado'
        });
      }

      next(e);
    }
  };


/* =========================================================
   ELIMINAR
========================================================= */

export const genericDelete =
  table => async (
    req,
    res,
    next
  ) => {

    try {

      if (
        !safeTables.has(table)
      ) {

        return res.status(400).json({
          message:
            'Tabla no permitida'
        });
      }


      const puedeEliminar =
        await tienePermiso(
          req,
          'eliminar'
        );


      if (!puedeEliminar) {

        return accesoDenegado(
          res,
          'eliminar'
        );
      }


      if (
        req.user?.rol === 'Cliente'
      ) {

        return res.status(403).json({
          message:
            'Los clientes no tienen permiso para eliminar registros'
        });
      }


      /* =====================================================
         HABITACIONES CON RESERVAS
      ===================================================== */

      if (
        table === 'habitaciones'
      ) {

        const referencias =
          await query(
            `
              SELECT COUNT(*) AS total
              FROM reserva_detalle
              WHERE id_habitacion = ?
            `,
            [req.params.id]
          );


        const totalReferencias =
          Number(
            referencias?.[0]?.total || 0
          );


        if (
          totalReferencias > 0
        ) {

          const result =
            await query(
              `
                UPDATE habitaciones
                SET estado = 'inhabilitada'
                WHERE id = ?
              `,
              [req.params.id]
            );


          const affectedRows =
            result?.affectedRows ??
            result?.[0]?.affectedRows ??
            0;


          if (
            affectedRows === 0
          ) {

            return res.status(404).json({
              message:
                'Habitación no encontrada'
            });
          }


          return res.json({
            message:
              'La habitación tenía reservas asociadas, por lo que fue inhabilitada para conservar el historial de las reservas.'
          });
        }
      }


      /* =====================================================
         CUENTAS DE USUARIO: ELIMINACIÓN SEGURA

         Conservamos el registro como inactivo para impedir que
         Google o el registro manual puedan recrear una cuenta
         con el mismo correo posteriormente.
      ===================================================== */

      if (table === 'usuarios') {
        const usuarios = await query(
          `
            SELECT id, nombre_usuario, correo
            FROM usuarios
            WHERE id = ?
            LIMIT 1
          `,
          [req.params.id]
        );

        if (!usuarios[0]) {
          return res.status(404).json({
            message: 'Usuario no encontrado'
          });
        }

        const usuario = usuarios[0];

        /*
         * Si la cuenta corresponde a un cliente, revisamos si existen
         * reservas antes de eliminar el cliente.
         *
         * - Sin reservas: eliminamos usuario + cliente.
         * - Con reservas: eliminamos solo la cuenta y dejamos el cliente
         *   sin id_usuario para conservar todo el historial.
         */
        const clientes = await query(
          `
            SELECT id
            FROM clientes
            WHERE id_usuario = ?
            LIMIT 1
          `,
          [usuario.id]
        );

        if (clientes[0]) {
          const reservas = await query(
            `
              SELECT COUNT(*) AS total
              FROM reservas
              WHERE id_cliente = ?
            `,
            [clientes[0].id]
          );

          const tieneReservas =
            Number(reservas?.[0]?.total || 0) > 0;

          if (tieneReservas) {
            await query(
              `
                UPDATE clientes
                SET id_usuario = NULL
                WHERE id = ?
              `,
              [clientes[0].id]
            );
          } else {
            await query(
              `
                DELETE FROM clientes
                WHERE id = ?
              `,
              [clientes[0].id]
            );
          }
        }

        await query(
          `
            DELETE FROM usuarios
            WHERE id = ?
          `,
          [usuario.id]
        );

        await eliminarSesionActiva(usuario.id);

        broadcast(
          'data_changed',
          {
            entity: 'usuarios',
            action: 'account_deleted',
            id: Number(usuario.id)
          }
        );

        try {
          await enviarCorreoEliminacionCuenta({
            destinatario: usuario.correo,
            nombre: usuario.nombre_usuario
          });
        } catch (emailError) {
          console.error(
            `No fue posible enviar el correo de eliminación a ${usuario.correo}:`,
            emailError
          );
        }

        return res.json({
          message: 'Cuenta eliminada correctamente',
          accountDeleted: true,
          id: Number(usuario.id)
        });
      }

      /* =====================================================
         ELIMINACIÓN NORMAL
      ===================================================== */

      const esCatalogoConImagenes =
        ['habitaciones', 'servicios', 'paquetes'].includes(table);

      const archivosCatalogo = esCatalogoConImagenes
        ? await obtenerArchivosImagenesCatalogo(table, req.params.id)
        : [];

      const result =
        await query(
          `
            DELETE FROM ${table}
            WHERE id = ?
          `,
          [req.params.id]
        );


      const affectedRows =
        result?.affectedRows ??
        result?.[0]?.affectedRows ??
        0;


      if (
        affectedRows === 0
      ) {

        return res.status(404).json({
          message:
            'Registro no encontrado'
        });
      }

      if (esCatalogoConImagenes) {
        const config = {
          habitaciones: ['habitacion_imagenes', 'id_habitacion'],
          servicios: ['servicio_imagenes', 'id_servicio'],
          paquetes: ['paquete_imagenes', 'id_paquete']
        }[table];
        if (config) {
          await query(
            `DELETE FROM ${config[0]} WHERE ${config[1]} = ?`,
            [req.params.id]
          );
        }

        await Promise.all(
          archivosCatalogo.map(archivo => fs.unlink(archivo).catch(() => {}))
        );
      }

      return res.json({
        message:
          'Eliminado correctamente'
      });

    } catch (e) {

      if (
        e.code === 'ER_ROW_IS_REFERENCED_2' ||
        e.code === 'ER_ROW_IS_REFERENCED'
      ) {

        return res.status(409).json({
          message:
            'No se puede eliminar este registro porque está siendo utilizado por otros datos.'
        });
      }


      next(e);
    }
  };