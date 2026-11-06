import { query } from '../config/db.js';
import { validationResult } from 'express-validator';

/*
|--------------------------------------------------------------------------
| PERMISOS DISPONIBLES
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| UTILIDADES
|--------------------------------------------------------------------------
*/

function validar(req) {
  const errores = validationResult(req);

  if (!errores.isEmpty()) {
    const error = new Error('Datos inválidos');
    error.status = 400;
    error.details = errores.array();
    throw error;
  }
}

function normalizarBooleano(valor) {
  if (
    valor === true ||
    valor === 1 ||
    valor === '1' ||
    valor === 'true' ||
    valor === 'TRUE'
  ) {
    return true;
  }

  return false;
}

function obtenerPermisos(valor) {
  if (!valor) {
    return [];
  }

  if (Array.isArray(valor)) {
    return valor.filter((permiso) =>
      PERMISOS_VALIDOS.includes(permiso)
    );
  }

  if (typeof valor === 'string') {
    try {
      const parsed = JSON.parse(valor);

      if (Array.isArray(parsed)) {
        return parsed.filter((permiso) =>
          PERMISOS_VALIDOS.includes(permiso)
        );
      }
    } catch {
      /*
       * Compatibilidad con registros antiguos.
       * Si el campo contiene permisos separados por coma,
       * también los aceptamos.
       */
      return valor
        .split(',')
        .map((permiso) => permiso.trim())
        .filter((permiso) =>
          PERMISOS_VALIDOS.includes(permiso)
        );
    }
  }

  return [];
}

function prepararPermisos(valor) {
  const permisos = obtenerPermisos(valor);

  return JSON.stringify(permisos);
}

/*
|--------------------------------------------------------------------------
| LISTAR ROLES
|--------------------------------------------------------------------------
*/

export async function listarRoles(req, res, next) {
  try {
    const roles = await query(`
      SELECT
        r.id,
        r.nombre_rol,
        r.permisos,
        r.estado_rol,
        r.created_at,
        r.updated_at,

        COUNT(DISTINCT u.id) AS usuarios_asignados,

        COUNT(
          DISTINCT CASE
            WHEN rmp.estado_permiso = 1
            THEN rmp.id_modulo
          END
        ) AS modulos_asignados

      FROM roles r

      LEFT JOIN usuarios u
        ON u.id_rol = r.id

      LEFT JOIN rol_modulo_permiso rmp
        ON rmp.id_rol = r.id
       AND rmp.estado_permiso = 1

      GROUP BY
        r.id,
        r.nombre_rol,
        r.permisos,
        r.estado_rol,
        r.created_at,
        r.updated_at

      ORDER BY r.id ASC
    `);

    const resultado = roles.map((rol) => ({
      ...rol,

      estado_rol: normalizarBooleano(
        rol.estado_rol
      ),

      permisos_lista: obtenerPermisos(
        rol.permisos
      ),

      usuarios_asignados: Number(
        rol.usuarios_asignados || 0
      ),

      modulos_asignados: Number(
        rol.modulos_asignados || 0
      )
    }));

    res.json(resultado);
  } catch (error) {
    next(error);
  }
}

/*
|--------------------------------------------------------------------------
| OBTENER DETALLE DE UN ROL
|--------------------------------------------------------------------------
*/

export async function obtenerRol(req, res, next) {
  try {
    const { id } = req.params;

    const roles = await query(`
      SELECT
        id,
        nombre_rol,
        permisos,
        estado_rol,
        created_at,
        updated_at
      FROM roles
      WHERE id = ?
      LIMIT 1
    `, [id]);

    if (!roles.length) {
      return res.status(404).json({
        message: 'Rol no encontrado'
      });
    }

    const rol = {
      ...roles[0],

      estado_rol: normalizarBooleano(
        roles[0].estado_rol
      ),

      permisos_lista: obtenerPermisos(
        roles[0].permisos
      )
    };

    /*
     * Todos los módulos aparecen.
     * Si el rol no tiene relación todavía,
     * estado_permiso será false.
     */
    const modulos = await query(`
      SELECT
        m.id,
        m.nombre_modulo,
        CASE
          WHEN rmp.estado_permiso = 1
          THEN TRUE
          ELSE FALSE
        END AS estado_permiso
      FROM modulos m
      LEFT JOIN rol_modulo_permiso rmp
        ON rmp.id_modulo = m.id
       AND rmp.id_rol = ?
      ORDER BY m.id ASC
    `, [id]);

    /*
     * Los usuarios asignados se consultan con paginación y búsqueda
     * opcionales para que el detalle del rol siga siendo cómodo cuando
     * la cantidad de clientes o administradores crezca.
     *
     * Si no se envían estos parámetros, se conserva el comportamiento
     * anterior y se devuelve la lista completa.
     */
    const usaPaginacionUsuarios =
      req.query.usuarios_page !== undefined ||
      req.query.usuarios_limit !== undefined ||
      req.query.usuarios_busqueda !== undefined;

    const busquedaUsuarios = String(
      req.query.usuarios_busqueda || ''
    ).trim();

    let usuarios;
    let usuariosTotal;
    let usuariosPagina = 1;
    let usuariosLimite = 0;

    if (usaPaginacionUsuarios) {
      usuariosPagina = Math.max(
        1,
        Number.parseInt(
          req.query.usuarios_page || '1',
          10
        ) || 1
      );

      usuariosLimite = Math.min(
        50,
        Math.max(
          1,
          Number.parseInt(
            req.query.usuarios_limit || '8',
            10
          ) || 8
        )
      );

      const termino = `%${busquedaUsuarios}%`;


      const conteo = await query(`
        SELECT COUNT(*) AS total
        FROM usuarios u
        LEFT JOIN clientes c
          ON c.id_usuario = u.id
        WHERE u.id_rol = ?
          AND (
            ? = ''
            OR u.nombre_usuario LIKE ?
            OR u.correo LIKE ?
            OR c.nombre LIKE ?
            OR c.apellido LIKE ?
            OR c.correo LIKE ?
            OR CONCAT_WS(' ', c.nombre, c.apellido) LIKE ?
          )
      `, [
        id,
        busquedaUsuarios,
        termino,
        termino,
        termino,
        termino,
        termino,
        termino
      ]);

      usuariosTotal = Number(
        conteo?.[0]?.total || 0
      );

      const totalPaginas = Math.max(
        1,
        Math.ceil(usuariosTotal / usuariosLimite)
      );

      usuariosPagina = Math.min(
        usuariosPagina,
        totalPaginas
      );

      const offset =
        (usuariosPagina - 1) * usuariosLimite;

      usuarios = await query(`
        SELECT
          u.id,
          u.nombre_usuario,
          u.correo,
          u.estado AS estado_usuario,
          c.nombre AS nombre_cliente,
          c.apellido AS apellido_cliente,
          c.correo AS correo_cliente,
          CASE
            WHEN LOWER(?) = 'cliente'
            THEN COALESCE(c.estado, u.estado)
            ELSE u.estado
          END AS estado_asignado,
          CASE
            WHEN LOWER(?) = 'cliente' AND c.id IS NOT NULL
            THEN CONCAT_WS(' ', c.nombre, c.apellido)
            ELSE u.nombre_usuario
          END AS nombre_mostrar,
          CASE
            WHEN LOWER(?) = 'cliente' AND c.id IS NOT NULL
            THEN COALESCE(c.correo, u.correo)
            ELSE u.correo
          END AS correo_mostrar
        FROM usuarios u
        LEFT JOIN clientes c
          ON c.id_usuario = u.id
        WHERE u.id_rol = ?
          AND (
            ? = ''
            OR u.nombre_usuario LIKE ?
            OR u.correo LIKE ?
            OR c.nombre LIKE ?
            OR c.apellido LIKE ?
            OR c.correo LIKE ?
            OR CONCAT_WS(' ', c.nombre, c.apellido) LIKE ?
          )
        ORDER BY
          CASE
            WHEN LOWER(?) = 'cliente' AND c.id IS NOT NULL THEN c.nombre
            ELSE u.nombre_usuario
          END ASC
        LIMIT ? OFFSET ?
      `, [
        rol.nombre_rol,
        rol.nombre_rol,
        rol.nombre_rol,
        id,
        busquedaUsuarios,
        termino,
        termino,
        termino,
        termino,
        termino,
        termino,
        rol.nombre_rol,
        usuariosLimite,
        offset
      ]);
    } else {
      usuarios = await query(`
        SELECT
          u.id,
          u.nombre_usuario,
          u.correo,
          u.estado AS estado_usuario,
          c.nombre AS nombre_cliente,
          c.apellido AS apellido_cliente,
          c.correo AS correo_cliente,
          CASE
            WHEN LOWER(?) = 'cliente'
            THEN COALESCE(c.estado, u.estado)
            ELSE u.estado
          END AS estado_asignado,
          CASE
            WHEN LOWER(?) = 'cliente' AND c.id IS NOT NULL
            THEN CONCAT_WS(' ', c.nombre, c.apellido)
            ELSE u.nombre_usuario
          END AS nombre_mostrar,
          CASE
            WHEN LOWER(?) = 'cliente' AND c.id IS NOT NULL
            THEN COALESCE(c.correo, u.correo)
            ELSE u.correo
          END AS correo_mostrar
        FROM usuarios u
        LEFT JOIN clientes c
          ON c.id_usuario = u.id
        WHERE u.id_rol = ?
        ORDER BY
          CASE
            WHEN LOWER(?) = 'cliente' AND c.id IS NOT NULL THEN c.nombre
            ELSE u.nombre_usuario
          END ASC
      `, [
        rol.nombre_rol,
        rol.nombre_rol,
        rol.nombre_rol,
        id,
        rol.nombre_rol
      ]);

      usuariosTotal = usuarios.length;
      usuariosLimite = usuarios.length || 0;
    }

    res.json({
      rol,
      modulos: modulos.map((modulo) => ({
        ...modulo,
        estado_permiso: normalizarBooleano(
          modulo.estado_permiso
        )
      })),
      usuarios,
      usuarios_total: usuariosTotal,
      usuarios_pagina: usuariosPagina,
      usuarios_limite: usuariosLimite,
      usuarios_busqueda: busquedaUsuarios
    });
  } catch (error) {
    next(error);
  }
}

/*
|--------------------------------------------------------------------------
| LISTAR ASIGNADOS A UN ROL
|--------------------------------------------------------------------------
|
| Este endpoint separa claramente el estado del USUARIO y el estado del
| CLIENTE. Para un rol Cliente se muestra clientes.estado; para un rol
| Administrador se muestra usuarios.estado.
|
| La búsqueda y paginación se hacen en el servidor para que la ventana
| siga funcionando correctamente aunque existan muchos registros.
|--------------------------------------------------------------------------
*/

export async function listarAsignadosRol(req, res, next) {
  try {
    const { id } = req.params;

    const roles = await query(`
      SELECT
        id,
        nombre_rol
      FROM roles
      WHERE id = ?
      LIMIT 1
    `, [id]);

    if (!roles.length) {
      return res.status(404).json({
        message: 'Rol no encontrado'
      });
    }

    const nombreRol = String(
      roles[0].nombre_rol || ''
    ).trim().toLowerCase();

    const pagina = Math.max(
      1,
      Number.parseInt(req.query.page || '1', 10) || 1
    );

    const limite = Math.min(
      50,
      Math.max(
        1,
        Number.parseInt(req.query.limit || '8', 10) || 8
      )
    );

    const busqueda = String(
      req.query.search || ''
    ).trim();

    const termino = `%${busqueda}%`;

    let total = 0;
    let asignados = [];

    if (nombreRol === 'cliente') {
      const conteo = await query(`
        SELECT COUNT(*) AS total
        FROM clientes c
        INNER JOIN usuarios u
          ON u.id = c.id_usuario
        WHERE u.id_rol = ?
          AND (
            ? = ''
            OR LOWER(COALESCE(c.nombre, '')) LIKE LOWER(?)
            OR LOWER(COALESCE(c.apellido, '')) LIKE LOWER(?)
            OR LOWER(COALESCE(c.correo, '')) LIKE LOWER(?)
            OR LOWER(COALESCE(u.nombre_usuario, '')) LIKE LOWER(?)
            OR LOWER(COALESCE(u.correo, '')) LIKE LOWER(?)
            OR LOWER(CONCAT_WS(' ', c.nombre, c.apellido)) LIKE LOWER(?)
          )
      `, [
        id,
        busqueda,
        termino,
        termino,
        termino,
        termino,
        termino,
        termino
      ]);

      total = Number(
        conteo?.[0]?.total || 0
      );

      const offset = (pagina - 1) * limite;

      asignados = await query(`
        SELECT
          c.id AS id,
          c.nombre,
          c.apellido,
          c.correo,
          c.estado AS estado_cliente,
          u.id AS id_usuario,
          u.nombre_usuario,
          u.correo AS correo_usuario,
          u.estado AS estado_usuario,
          'cliente' AS tipo_asignado
        FROM clientes c
        INNER JOIN usuarios u
          ON u.id = c.id_usuario
        WHERE u.id_rol = ?
          AND (
            ? = ''
            OR LOWER(COALESCE(c.nombre, '')) LIKE LOWER(?)
            OR LOWER(COALESCE(c.apellido, '')) LIKE LOWER(?)
            OR LOWER(COALESCE(c.correo, '')) LIKE LOWER(?)
            OR LOWER(COALESCE(u.nombre_usuario, '')) LIKE LOWER(?)
            OR LOWER(COALESCE(u.correo, '')) LIKE LOWER(?)
            OR LOWER(CONCAT_WS(' ', c.nombre, c.apellido)) LIKE LOWER(?)
          )
        ORDER BY c.nombre ASC, c.apellido ASC, c.id ASC
        LIMIT ? OFFSET ?
      `, [
        id,
        busqueda,
        termino,
        termino,
        termino,
        termino,
        termino,
        termino,
        limite,
        offset
      ]);

      asignados = asignados.map((cliente) => ({
        id: cliente.id,
        id_usuario: cliente.id_usuario,
        nombre_mostrar: `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim() || cliente.nombre_usuario,
        nombre_usuario: cliente.nombre_usuario,
        correo_mostrar: cliente.correo || cliente.correo_usuario,
        correo: cliente.correo || cliente.correo_usuario,
        estado: normalizarBooleano(cliente.estado_cliente),
        estado_cliente: normalizarBooleano(cliente.estado_cliente),
        estado_usuario: normalizarEstadoUsuario(cliente.estado_usuario),
        tipo_asignado: 'cliente'
      }));
    } else {
      const conteo = await query(`
        SELECT COUNT(*) AS total
        FROM usuarios u
        WHERE u.id_rol = ?
          AND (
            ? = ''
            OR LOWER(COALESCE(u.nombre_usuario, '')) LIKE LOWER(?)
            OR LOWER(COALESCE(u.correo, '')) LIKE LOWER(?)
          )
      `, [
        id,
        busqueda,
        termino,
        termino
      ]);

      total = Number(
        conteo?.[0]?.total || 0
      );

      const offset = (pagina - 1) * limite;

      asignados = await query(`
        SELECT
          u.id,
          u.nombre_usuario,
          u.correo,
          u.estado,
          'administrador' AS tipo_asignado
        FROM usuarios u
        WHERE u.id_rol = ?
          AND (
            ? = ''
            OR LOWER(COALESCE(u.nombre_usuario, '')) LIKE LOWER(?)
            OR LOWER(COALESCE(u.correo, '')) LIKE LOWER(?)
          )
        ORDER BY u.nombre_usuario ASC, u.id ASC
        LIMIT ? OFFSET ?
      `, [
        id,
        busqueda,
        termino,
        termino,
        limite,
        offset
      ]);

      asignados = asignados.map((usuario) => ({
        id: usuario.id,
        id_usuario: usuario.id,
        nombre_mostrar: usuario.nombre_usuario,
        nombre_usuario: usuario.nombre_usuario,
        correo_mostrar: usuario.correo,
        correo: usuario.correo,
        estado: normalizarEstadoUsuario(usuario.estado),
        estado_usuario: normalizarEstadoUsuario(usuario.estado),
        tipo_asignado: 'administrador'
      }));
    }

    const totalPaginas = Math.max(
      1,
      Math.ceil(total / limite)
    );

    const paginaReal = Math.min(
      pagina,
      totalPaginas
    );

    /* Si la página solicitada quedó fuera del rango después de una
       búsqueda, devolvemos la primera página válida en lugar de dejar
       la interfaz vacía. */
    if (pagina !== paginaReal) {
      return res.json({
        rows: [],
        total,
        pagina: paginaReal,
        limite,
        total_paginas: totalPaginas,
        busqueda,
        tipo: nombreRol === 'cliente' ? 'cliente' : 'administrador'
      });
    }

    res.json({
      rows: asignados,
      total,
      pagina: paginaReal,
      limite,
      total_paginas: totalPaginas,
      busqueda,
      tipo: nombreRol === 'cliente' ? 'cliente' : 'administrador'
    });
  } catch (error) {
    next(error);
  }
}

function normalizarEstadoUsuario(valor) {
  if (
    valor === true ||
    valor === 1 ||
    valor === '1' ||
    valor === 'true' ||
    valor === 'TRUE' ||
    valor === 'activo' ||
    valor === 'ACTIVO'
  ) {
    return true;
  }

  return false;
}

/*
|--------------------------------------------------------------------------
| CREAR ROL
|--------------------------------------------------------------------------
*/

export async function crearRol(req, res, next) {
  try {
    validar(req);

    const {
      nombre_rol,
      permisos,
      estado_rol = true
    } = req.body;

    const nombreLimpio = String(
      nombre_rol || ''
    ).trim();

    if (!nombreLimpio) {
      return res.status(400).json({
        message: 'El nombre del rol es obligatorio'
      });
    }

    const permisosPreparados =
      prepararPermisos(permisos);

    const existente = await query(`
      SELECT id
      FROM roles
      WHERE LOWER(TRIM(nombre_rol)) = LOWER(TRIM(?))
      LIMIT 1
    `, [nombreLimpio]);

    if (existente.length) {
      return res.status(409).json({
        message: 'Ya existe un rol con ese nombre'
      });
    }

    const resultado = await query(`
      INSERT INTO roles
      (
        nombre_rol,
        permisos,
        estado_rol
      )
      VALUES (?, ?, ?)
    `, [
      nombreLimpio,
      permisosPreparados,
      normalizarBooleano(estado_rol)
    ]);

    res.status(201).json({
      message: 'Rol creado correctamente',
      id: resultado.insertId
    });
  } catch (error) {
    next(error);
  }
}

/*
|--------------------------------------------------------------------------
| ACTUALIZAR ROL
|--------------------------------------------------------------------------
*/

export async function actualizarRol(req, res, next) {
  try {
    validar(req);

    const { id } = req.params;

    const {
      nombre_rol,
      permisos,
      estado_rol
    } = req.body;

    const rolActual = await query(`
      SELECT
        id,
        nombre_rol,
        permisos,
        estado_rol
      FROM roles
      WHERE id = ?
      LIMIT 1
    `, [id]);

    if (!rolActual.length) {
      return res.status(404).json({
        message: 'Rol no encontrado'
      });
    }

    const datosActuales = rolActual[0];

    let nuevoNombre =
      datosActuales.nombre_rol;

    if (nombre_rol !== undefined) {
      nuevoNombre = String(
        nombre_rol
      ).trim();

      if (!nuevoNombre) {
        return res.status(400).json({
          message: 'El nombre del rol es obligatorio'
        });
      }

      const duplicado = await query(`
        SELECT id
        FROM roles
        WHERE LOWER(TRIM(nombre_rol)) = LOWER(TRIM(?))
          AND id <> ?
        LIMIT 1
      `, [
        nuevoNombre,
        id
      ]);

      if (duplicado.length) {
        return res.status(409).json({
          message: 'Ya existe otro rol con ese nombre'
        });
      }
    }

    let nuevosPermisos =
      datosActuales.permisos;

    if (permisos !== undefined) {
      nuevosPermisos =
        prepararPermisos(permisos);
    }

    let nuevoEstado =
      normalizarBooleano(
        datosActuales.estado_rol
      );

    if (estado_rol !== undefined) {
      nuevoEstado =
        normalizarBooleano(estado_rol);
    }

    await query(`
      UPDATE roles
      SET
        nombre_rol = ?,
        permisos = ?,
        estado_rol = ?
      WHERE id = ?
    `, [
      nuevoNombre,
      nuevosPermisos,
      nuevoEstado,
      id
    ]);

    res.json({
      message: 'Rol actualizado correctamente'
    });
  } catch (error) {
    next(error);
  }
}

/*
|--------------------------------------------------------------------------
| CAMBIAR ESTADO
|--------------------------------------------------------------------------
*/

export async function cambiarEstadoRol(req, res, next) {
  try {
    const { id } = req.params;
    const { estado_rol } = req.body;

    if (
      typeof estado_rol !== 'boolean' &&
      estado_rol !== 0 &&
      estado_rol !== 1 &&
      estado_rol !== '0' &&
      estado_rol !== '1'
    ) {
      return res.status(400).json({
        message:
          'estado_rol debe ser verdadero o falso'
      });
    }

    const nuevoEstado =
      normalizarBooleano(estado_rol);

    const resultado = await query(`
      UPDATE roles
      SET estado_rol = ?
      WHERE id = ?
    `, [
      nuevoEstado,
      id
    ]);

    if (!resultado.affectedRows) {
      return res.status(404).json({
        message: 'Rol no encontrado'
      });
    }

    res.json({
      message: nuevoEstado
        ? 'Rol activado correctamente'
        : 'Rol desactivado correctamente'
    });
  } catch (error) {
    next(error);
  }
}

/*
|--------------------------------------------------------------------------
| LISTAR MÓDULOS
|--------------------------------------------------------------------------
*/

export async function listarModulos(req, res, next) {
  try {
    const modulos = await query(`
      SELECT
        id,
        nombre_modulo,
        created_at
      FROM modulos
      ORDER BY id ASC
    `);

    res.json(modulos);
  } catch (error) {
    next(error);
  }
}

/*
|--------------------------------------------------------------------------
| ACTIVAR / DESACTIVAR MÓDULO DEL ROL
|--------------------------------------------------------------------------
*/

export async function actualizarModuloRol(req, res, next) {
  try {
    const {
      id,
      moduloId
    } = req.params;

    const {
      estado_permiso
    } = req.body;

    if (
      typeof estado_permiso !== 'boolean' &&
      estado_permiso !== 0 &&
      estado_permiso !== 1 &&
      estado_permiso !== '0' &&
      estado_permiso !== '1'
    ) {
      return res.status(400).json({
        message:
          'estado_permiso debe ser verdadero o falso'
      });
    }

    const estado =
      normalizarBooleano(
        estado_permiso
      );

    const rol = await query(`
      SELECT id
      FROM roles
      WHERE id = ?
      LIMIT 1
    `, [id]);

    if (!rol.length) {
      return res.status(404).json({
        message: 'Rol no encontrado'
      });
    }

    const modulo = await query(`
      SELECT id
      FROM modulos
      WHERE id = ?
      LIMIT 1
    `, [moduloId]);

    if (!modulo.length) {
      return res.status(404).json({
        message: 'Módulo no encontrado'
      });
    }

    /*
     * La tabla tiene id como PRIMARY KEY,
     * por lo que buscamos primero si ya existe
     * la relación antes de insertar.
     */
    const existente = await query(`
      SELECT id
      FROM rol_modulo_permiso
      WHERE id_rol = ?
        AND id_modulo = ?
      LIMIT 1
    `, [
      id,
      moduloId
    ]);

    if (existente.length) {
      await query(`
        UPDATE rol_modulo_permiso
        SET estado_permiso = ?
        WHERE id = ?
      `, [
        estado,
        existente[0].id
      ]);
    } else {
      await query(`
        INSERT INTO rol_modulo_permiso
        (
          id_rol,
          id_modulo,
          estado_permiso
        )
        VALUES (?, ?, ?)
      `, [
        id,
        moduloId,
        estado
      ]);
    }

    res.json({
      message: estado
        ? 'Módulo asignado correctamente'
        : 'Módulo desactivado correctamente'
    });
  } catch (error) {
    next(error);
  }
}