import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

import {
  validarSesionActiva,
  renovarSesionActiva
} from '../services/sessionService.js';


export async function auth(
  req,
  res,
  next
) {

  const h =
    req.headers.authorization || '';


  if (
    !h.startsWith('Bearer ')
  ) {

    return res.status(401).json({
      message: 'Token requerido'
    });

  }


  try {

    const token =
      h.slice(7);


    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );


    /* =====================================================
       COMPROBAR ESTA SESIÓN ESPECÍFICA
    ===================================================== */

    const sesionValida =
      await validarSesionActiva(
        decoded.id,
        decoded.sid
      );


    if (!sesionValida) {

      return res.status(401).json({
        message:
          'La sesión ya no está activa. Inicie sesión nuevamente.'
      });

    }


    /* =====================================================
       RENOVAR ESTA SESIÓN POR ACTIVIDAD
    ===================================================== */

    const sesionRenovada =
      await renovarSesionActiva(
        decoded.id,
        decoded.sid
      );


    if (!sesionRenovada) {

      return res.status(401).json({
        message:
          'La sesión ya no está activa. Inicie sesión nuevamente.'
      });

    }


    /*
     * Buscamos nuevamente el rol en la base de datos.
     */

    const usuarios =
      await query(
        `
        SELECT
          u.id,
          u.nombre_usuario,
          u.correo,
          u.id_rol,
          u.estado,
          r.nombre_rol,
          r.permisos,
          r.estado_rol
        FROM usuarios u
        INNER JOIN roles r
          ON r.id = u.id_rol
        WHERE u.id = ?
        LIMIT 1
        `,
        [decoded.id]
      );


    if (!usuarios[0]) {

      return res.status(401).json({
        message:
          'Usuario no encontrado'
      });

    }


    const usuario =
      usuarios[0];


    if (
      usuario.estado !== 'activo' &&
      usuario.estado !== 1 &&
      usuario.estado !== '1'
    ) {

      return res.status(403).json({
        message:
          'Usuario inactivo'
      });

    }


    if (
      usuario.estado_rol !== true &&
      usuario.estado_rol !== 1 &&
      usuario.estado_rol !== '1'
    ) {

      return res.status(403).json({
        message:
          'El rol del usuario está inactivo'
      });

    }


    let permisos = [];


    if (
      Array.isArray(
        usuario.permisos
      )
    ) {

      permisos =
        usuario.permisos;

    } else if (
      typeof usuario.permisos === 'string'
    ) {

      try {

        const parsed =
          JSON.parse(
            usuario.permisos
          );


        if (
          Array.isArray(parsed)
        ) {

          permisos =
            parsed;

        } else {

          permisos =
            usuario.permisos
              .split(',')
              .map(
                p => p.trim()
              )
              .filter(Boolean);

        }

      } catch {

        permisos =
          usuario.permisos
            .split(',')
            .map(
              p => p.trim()
            )
            .filter(Boolean);

      }

    }


    req.user = {

      id:
        usuario.id,

      nombre_usuario:
        usuario.nombre_usuario,

      correo:
        usuario.correo,

      id_rol:
        usuario.id_rol,

      rol:
        usuario.nombre_rol,

      permisos,

      sid:
        decoded.sid

    };


    next();

  } catch (error) {

    if (
      error.name ===
        'JsonWebTokenError' ||
      error.name ===
        'TokenExpiredError'
    ) {

      return res.status(401).json({
        message:
          'Token inválido o expirado'
      });

    }


    next(error);

  }

}


/* =========================================================
   ROLES
========================================================= */

export const roles =
  (...allowed) => {

    return (
      req,
      res,
      next
    ) => {

      if (
        allowed.includes(
          req.user?.rol
        )
      ) {

        return next();

      }


      return res.status(403).json({
        message:
          'Sin permisos para esta operación'
      });

    };

  };


export const requirePermission =
  (permiso) => {

    return (
      req,
      res,
      next
    ) => {

      if (
        req.user?.rol ===
        'Administrador'
      ) {

        return next();

      }


      if (
        req.user?.permisos?.includes(
          permiso
        )
      ) {

        return next();

      }


      return res.status(403).json({
        message:
          'Sin permisos para esta operación'
      });

    };

  };
