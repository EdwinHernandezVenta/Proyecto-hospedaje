import { Router } from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import { auth, roles } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { loginRateLimit, recoveryRateLimit, resetRateLimit } from '../middlewares/security.js';

import {
  login,
  me,
  refresh,
  logout,
  deleteAccount,
  forgot,
  reset,
  googleLogin,
  googleCallback,
  googleExchange,
  googlePendingData,
  googleComplete
} from '../controllers/authController.js';

import {
  registrarUsuario
} from '../controllers/registerController.js';

import {
  genericList,
  genericGet,
  genericCreate,
  genericUpdate,
  genericDelete
} from '../controllers/genericController.js';

import * as R from '../controllers/reservationController.js';

import {
  stats
} from '../controllers/dashboardController.js';

import {
  listarRoles,
  obtenerRol,
  crearRol,
  actualizarRol,
  cambiarEstadoRol,
  listarModulos,
  actualizarModuloRol,
  listarAsignadosRol
} from '../controllers/rolesController.js';

import {
  query
} from '../config/db.js';

import {
  createRealtimeTicket,
  connectRealtime
} from '../controllers/realtimeController.js';

import {
  uploadHabitacionImagenes,
  validarImagenesHabitacion,
  listarImagenesHabitacion,
  subirImagenesHabitacion,
  cambiarImagenHabitacion,
  eliminarImagenHabitacion,
  servirImagenHabitacion
} from '../controllers/habitacionImagenController.js';

import {
  uploadServicioImagenes,
  validarImagenesServicio,
  listarImagenesServicio,
  subirImagenesServicio,
  cambiarImagenServicio,
  eliminarImagenServicio,
  servirImagenServicio
} from '../controllers/servicioImagenController.js';

import {
  uploadPaqueteImagenes,
  validarImagenesPaquete,
  listarImagenesPaquete,
  subirImagenesPaquete,
  cambiarImagenPaquete,
  eliminarImagenPaquete,
  servirImagenPaquete
} from '../controllers/paqueteImagenController.js';


const r = Router();


/* =========================================================
   DIRECTORIO DE COMPROBANTES
========================================================= */

const uploadsDir =
  path.resolve('uploads');

fs.mkdirSync(
  uploadsDir,
  {
    recursive: true
  }
);


/* =========================================================
   CONFIGURACIÓN DE MULTER
========================================================= */

const storage =
  multer.diskStorage({

    destination: (
      req,
      file,
      cb
    ) => {

      cb(
        null,
        uploadsDir
      );

    },

    filename: (
      req,
      file,
      cb
    ) => {

      const extension =
        path.extname(
          file.originalname
        ).toLowerCase();

      const nombreSeguro =
        `comprobante-${Date.now()}-${Math.round(
          Math.random() * 1000000000
        )}${extension}`;

      cb(
        null,
        nombreSeguro
      );

    }

  });


const upload =
  multer({

    storage,

    limits: {
      fileSize: 5 * 1024 * 1024,
      files: 1,
      fields: 10,
      fieldSize: 100 * 1024
    },

    fileFilter: (
      req,
      file,
      cb
    ) => {

      const permitidos = [
        'application/pdf',
        'image/jpeg',
        'image/png'
      ];

      const permitido =
        permitidos.includes(
          file.mimetype
        );

      if (!permitido) {

        return cb(
          new Error(
            'Solo se permiten comprobantes PDF, JPG o PNG'
          )
        );

      }

      cb(
        null,
        true
      );

    }

  });


async function validarContenidoComprobante(req, res, next) {
  try {
    if (!req.file) {
      return next();
    }

    const handle = await import('fs/promises');
    const buffer = Buffer.alloc(16);
    const file = await handle.open(req.file.path, 'r');

    try {
      await file.read(buffer, 0, buffer.length, 0);
    } finally {
      await file.close();
    }

    const esPdf = buffer.subarray(0, 5).toString('ascii') === '%PDF-';
    const esPng = buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
    const esJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

    const extension = path.extname(req.file.originalname).toLowerCase();
    const valido =
      (extension === '.pdf' && esPdf) ||
      (extension === '.png' && esPng) ||
      ((extension === '.jpg' || extension === '.jpeg') && esJpeg);

    if (!valido) {
      await handle.unlink(req.file.path).catch(() => {});
      return res.status(400).json({
        message: 'El contenido del comprobante no coincide con el tipo de archivo permitido.'
      });
    }

    next();
  } catch (error) {
    if (req.file?.path) {
      const handle = await import('fs/promises');
      await handle.unlink(req.file.path).catch(() => {});
    }
    next(error);
  }
}

/* =========================================================
   VER COMPROBANTE
========================================================= */

r.get(
  '/uploads/:filename',
  auth,
  async (
    req,
    res,
    next
  ) => {

    try {

      const filename =
        path.basename(
          req.params.filename
        );

      const filePath =
        path.join(
          uploadsDir,
          filename
        );


      if (
        !fs.existsSync(filePath)
      ) {

        return res
          .status(404)
          .send(
            'Comprobante no encontrado.'
          );

      }


      /*
        Verificar que el archivo pertenece
        realmente a un pago.
      */

      const pagos =
        await query(
          `
            SELECT
              p.id,
              p.id_reserva,
              p.comprobante_url,
              r.id_cliente,
              c.correo AS cliente_correo
            FROM pagos p
            INNER JOIN reservas r
              ON r.id = p.id_reserva
            INNER JOIN clientes c
              ON c.id = r.id_cliente
            WHERE p.comprobante_url = ?
            LIMIT 1
          `,
          [
            `/uploads/${filename}`
          ]
        );


      if (
        !pagos ||
        !pagos.length
      ) {

        return res
          .status(404)
          .send(
            'El comprobante no está asociado a ningún pago.'
          );

      }


      const pago =
        pagos[0];


      /*
        ADMINISTRADOR:
        puede ver cualquier comprobante.
      */

      if (
        req.user?.rol !==
        'Administrador'
      ) {

        /*
          CLIENTE:
          solamente puede ver comprobantes
          de sus propias reservas.
        */

        if (
          !req.user?.correo ||
          req.user.correo !==
            pago.cliente_correo
        ) {

          return res
            .status(403)
            .json({
              message:
                'No tienes permiso para ver este comprobante.'
            });

        }

      }


      const extension =
        path.extname(
          filename
        ).toLowerCase();


      let contentType =
        'application/octet-stream';


      if (
        extension === '.pdf'
      ) {

        contentType =
          'application/pdf';

      }


      if (
        extension === '.jpg' ||
        extension === '.jpeg'
      ) {

        contentType =
          'image/jpeg';

      }


      if (
        extension === '.png'
      ) {

        contentType =
          'image/png';

      }


      res.setHeader(
        'Content-Type',
        contentType
      );

      res.setHeader(
        'Content-Disposition',
        `inline; filename="${filename}"`
      );

      res.setHeader(
        'X-Content-Type-Options',
        'nosniff'
      );


      return res.sendFile(
        filePath
      );

    } catch (error) {

      next(error);

    }

  }
);


/* =========================================================
   ADMINISTRADOR
========================================================= */

const admin =
  roles(
    'Administrador'
  );


/* =========================================================
   AUTENTICACIÓN
========================================================= */

r.post(
  '/auth/login',
  loginRateLimit,

  [
    body('correo')
      .isEmail()
      .withMessage(
        'Correo inválido'
      ),

    body('contrasena')
      .isString()
      .notEmpty()
      .withMessage(
        'La contraseña es obligatoria'
      )
  ],

  validate,

  login
);

/* =========================================================
   AUTENTICACIÓN CON GOOGLE
========================================================= */

/*
  Iniciar OAuth con Google.
*/
r.get(
  '/auth/google',
  googleLogin
);

/*
  Google devuelve aquí el código OAuth.
*/
r.get(
  '/auth/google/callback',
  googleCallback
);

/*
  Intercambiar el código temporal por la sesión
  JWT del sistema.
*/
r.post(
  '/auth/google/exchange',
  googleExchange
);

/*
  Obtener los datos temporales del usuario nuevo
  antes de completar su registro.
*/
r.get(
  '/auth/google/pending',
  googlePendingData
);

/*
  Completar el registro de un usuario nuevo
  autenticado mediante Google.
*/
r.post(
  '/auth/google/complete',
  googleComplete
);

/* =========================================================
   USUARIO ACTUAL
========================================================= */

r.get(
  '/auth/me',
  auth,
  me
);


/* =========================================================
   RENOVAR ACCESS TOKEN
========================================================= */

r.post(
  '/auth/refresh',
  refresh
);


/* =========================================================
   REGISTRO
========================================================= */

r.post(
  '/auth/register',

  [
    body('nombre_usuario')
      .isString()
      .trim()
      .isLength({
        min: 3,
        max: 50
      })
      .withMessage(
        'El usuario debe tener entre 3 y 50 caracteres'
      ),

    body('correo')
      .isEmail()
      .withMessage(
        'Correo inválido'
      ),

    body('contrasena')
      .isString()
      .isLength({
        min: 8
      })
      .withMessage(
        'La contraseña debe tener mínimo 8 caracteres'
      ),

    body('identificacion')
      .isString()
      .trim()
      .matches(/^\d{1,20}$/)
      .withMessage(
        'La identificación debe contener entre 1 y 20 dígitos'
      ),

    body('nombre')
      .isString()
      .trim()
      .notEmpty()
      .withMessage(
        'El nombre es obligatorio'
      ),

    body('apellido')
      .isString()
      .trim()
      .notEmpty()
      .withMessage(
        'El apellido es obligatorio'
      )
  ],

  validate,

  registrarUsuario
);

/* =========================================================
   CERRAR SESIÓN
========================================================= */

r.post(
  '/auth/logout',
  auth,
  logout
);

/* =========================================================
   ELIMINAR CUENTA ACTUAL
========================================================= */

r.delete(
  '/auth/account',
  auth,
  deleteAccount
);


/* =========================================================
   RECUPERAR CONTRASEÑA
========================================================= */

r.post(
  '/auth/forgot-password',
  recoveryRateLimit,

  body('correo')
    .isEmail()
    .withMessage(
      'Correo inválido'
    ),

  validate,

  forgot
);


/* =========================================================
   CAMBIAR CONTRASEÑA
========================================================= */

r.post(
  '/auth/reset-password',
  resetRateLimit,

  [
    body('token')
      .notEmpty()
      .withMessage(
        'El token es obligatorio'
      ),

    body('nuevaContrasena')
      .isLength({ min: 8 })
      .withMessage(
        'La nueva contraseña debe tener mínimo 8 caracteres'
      )
  ],

  validate,

  reset
);


/* =========================================================
   TIEMPO REAL
========================================================= */

/*
  Primero se solicita un ticket temporal utilizando
  la autenticación normal de la API.

  Después el frontend utiliza ese ticket para abrir
  la conexión SSE.
*/

r.get(
  '/realtime/ticket',
  auth,
  createRealtimeTicket
);


r.get(
  '/realtime/events',
  connectRealtime
);


/* =========================================================
   ROLES
   SOLO ADMINISTRADOR
========================================================= */

r.get(
  '/roles',
  auth,
  admin,
  listarRoles
);


r.get(
  '/roles/modulos',
  auth,
  admin,
  listarModulos
);


r.get(
  '/roles/:id',
  auth,
  admin,
  obtenerRol
);


r.get(
  '/roles/:id/asignados',
  auth,
  admin,
  listarAsignadosRol
);


r.post(
  '/roles',
  auth,
  admin,

  [
    body('nombre_rol')
      .isString()
      .trim()
      .isLength({
        min: 2,
        max: 80
      })
      .withMessage(
        'El nombre del rol debe tener entre 2 y 80 caracteres'
      ),

    body('permisos')
      .optional({
        nullable: true
      })
      .custom(
        valor => {

          if (
            valor === null ||
            valor === undefined
          ) {

            return true;

          }


          if (
            Array.isArray(valor)
          ) {

            return valor.every(
              permiso =>
                typeof permiso ===
                'string'
            );

          }


          if (
            typeof valor ===
            'string'
          ) {

            return true;

          }


          throw new Error(
            'Los permisos no tienen un formato válido'
          );

        }
      ),

    body('estado_rol')
      .optional()
      .isBoolean()
      .withMessage(
        'El estado del rol debe ser verdadero o falso'
      )
  ],

  validate,

  crearRol
);


r.put(
  '/roles/:id',
  auth,
  admin,

  [
    body('nombre_rol')
      .optional()
      .isString()
      .trim()
      .isLength({
        min: 2,
        max: 80
      })
      .withMessage(
        'El nombre del rol no es válido'
      ),

    body('permisos')
      .optional({
        nullable: true
      })
      .custom(
        valor => {

          if (
            valor === null ||
            valor === undefined
          ) {

            return true;

          }


          if (
            Array.isArray(valor)
          ) {

            return valor.every(
              permiso =>
                typeof permiso ===
                'string'
            );

          }


          if (
            typeof valor ===
            'string'
          ) {

            return true;

          }


          throw new Error(
            'Los permisos no tienen un formato válido'
          );

        }
      ),

    body('estado_rol')
      .optional()
      .isBoolean()
      .withMessage(
        'El estado debe ser verdadero o falso'
      )
  ],

  validate,

  actualizarRol
);


r.patch(
  '/roles/:id/estado',
  auth,
  admin,

  [
    body('estado_rol')
      .isBoolean()
      .withMessage(
        'estado_rol debe ser verdadero o falso'
      )
  ],

  validate,

  cambiarEstadoRol
);


r.patch(
  '/roles/:id/modulos/:moduloId',
  auth,
  admin,

  [
    body('estado_permiso')
      .isBoolean()
      .withMessage(
        'estado_permiso debe ser verdadero o falso'
      )
  ],

  validate,

  actualizarModuloRol
);


/* =========================================================
   CRUD ADMINISTRADOR
========================================================= */

function crudAdmin(
  pathName,
  table
) {

  r.get(
    `/${pathName}`,
    auth,
    admin,
    genericList(table)
  );


  r.get(
    `/${pathName}/:id`,
    auth,
    admin,
    genericGet(table)
  );


  r.post(
    `/${pathName}`,
    auth,
    admin,
    genericCreate(table)
  );


  r.put(
    `/${pathName}/:id`,
    auth,
    admin,
    genericUpdate(table)
  );


  r.delete(
    `/${pathName}/:id`,
    auth,
    admin,
    genericDelete(table)
  );

}


/* =========================================================
   CRUD CLIENTE + ADMINISTRADOR
========================================================= */

function crudCliente(
  pathName,
  table
) {

  r.get(
    `/${pathName}`,
    auth,
    genericList(table)
  );


  r.get(
    `/${pathName}/:id`,
    auth,
    genericGet(table)
  );


  r.post(
    `/${pathName}`,
    auth,
    genericCreate(table)
  );


  r.put(
    `/${pathName}/:id`,
    auth,
    genericUpdate(table)
  );


  r.delete(
    `/${pathName}/:id`,
    auth,
    admin,
    genericDelete(table)
  );

}


/* =========================================================
   USUARIOS
========================================================= */

crudAdmin(
  'usuarios',
  'usuarios'
);


/* =========================================================
   CLIENTES
========================================================= */

crudAdmin(
  'clientes',
  'clientes'
);


/* =========================================================
   HABITACIONES
========================================================= */

r.get(
  '/habitaciones/disponibilidad',
  auth,
  R.availability
);


/* =========================================================
   IMÁGENES DE HABITACIONES

   La imagen del catálogo es pública porque forma parte
   de la información visual de una habitación.

   Las operaciones de administración requieren sesión
   de Administrador.
========================================================= */

r.get(
  '/habitaciones/imagenes/:filename',
  servirImagenHabitacion
);


r.get(
  '/habitaciones/:id/imagenes',
  auth,
  listarImagenesHabitacion
);


r.post(
  '/habitaciones/:id/imagenes',
  auth,
  admin,
  uploadHabitacionImagenes.array('imagenes', 10),
  validarImagenesHabitacion,
  subirImagenesHabitacion
);


r.put(
  '/habitaciones/:id/imagenes/:imagenId',
  auth,
  admin,
  uploadHabitacionImagenes.single('imagen'),
  validarImagenesHabitacion,
  cambiarImagenHabitacion
);


r.delete(
  '/habitaciones/:id/imagenes/:imagenId',
  auth,
  admin,
  eliminarImagenHabitacion
);


crudCliente(
  'habitaciones',
  'habitaciones'
);


/* =========================================================
   SERVICIOS
========================================================= */

r.get(
  '/servicios/imagenes/:filename',
  servirImagenServicio
);

r.get(
  '/servicios/:id/imagenes',
  auth,
  listarImagenesServicio
);

r.post(
  '/servicios/:id/imagenes',
  auth,
  admin,
  uploadServicioImagenes.array('imagenes', 10),
  validarImagenesServicio,
  subirImagenesServicio
);

r.put(
  '/servicios/:id/imagenes/:imagenId',
  auth,
  admin,
  uploadServicioImagenes.single('imagen'),
  validarImagenesServicio,
  cambiarImagenServicio
);

r.delete(
  '/servicios/:id/imagenes/:imagenId',
  auth,
  admin,
  eliminarImagenServicio
);

crudCliente(
  'servicios',
  'servicios'
);


/* =========================================================
   PAQUETES
========================================================= */

r.get(
  '/paquetes/imagenes/:filename',
  servirImagenPaquete
);

r.get(
  '/paquetes/:id/imagenes',
  auth,
  listarImagenesPaquete
);

r.post(
  '/paquetes/:id/imagenes',
  auth,
  admin,
  uploadPaqueteImagenes.array('imagenes', 10),
  validarImagenesPaquete,
  subirImagenesPaquete
);

r.put(
  '/paquetes/:id/imagenes/:imagenId',
  auth,
  admin,
  uploadPaqueteImagenes.single('imagen'),
  validarImagenesPaquete,
  cambiarImagenPaquete
);

r.delete(
  '/paquetes/:id/imagenes/:imagenId',
  auth,
  admin,
  eliminarImagenPaquete
);

crudCliente(
  'paquetes',
  'paquetes'
);


/* =========================================================
   HUÉSPEDES
========================================================= */

crudCliente(
  'huespedes',
  'huespedes'
);


/* =========================================================
   FEEDBACK
========================================================= */

r.get(
  '/feedback/analisis',
  auth,
  admin,
  async (
    req,
    res,
    next
  ) => {

    try {

      const resultado =
        await query(
          `
            SELECT
              calificacion,
              COUNT(*) AS total
            FROM encuestas_feedback
            GROUP BY calificacion
            ORDER BY calificacion
          `
        );


      res.json(
        resultado
      );


    } catch (error) {

      next(error);

    }

  }
);


crudCliente(
  'feedback',
  'encuestas_feedback'
);


/* =========================================================
   PAGOS
========================================================= */

r.get(
  '/pagos',
  auth,
  R.listPayments
);


/* =========================================================
   RESERVAS
========================================================= */

r.get(
  '/reservas',
  auth,
  R.listReservations
);


/* =========================================================
   REPORTES DE RESERVAS
========================================================= */

r.get(
  '/reservas/reportes',
  auth,
  admin,
  R.report
);


/* =========================================================
   PDF DE RESERVA
========================================================= */

r.get(
  '/reservas/:id/pdf',
  auth,
  R.pdf
);


/* =========================================================
   CREAR RESERVA
========================================================= */

r.post(
  '/reservas',
  auth,
  R.create
);


/* =========================================================
   SUBIR COMPROBANTE DE PAGO
========================================================= */

r.post(
  '/reservas/:id/pago',
  auth,
  upload.single('comprobante'),
  validarContenidoComprobante,
  R.pay
);


/* =========================================================
   CONFIRMAR PAGO
========================================================= */

r.patch(
  '/reservas/:id/confirmar-pago',
  auth,
  admin,
  R.confirmPay
);


/* =========================================================
   RECHAZAR PAGO
========================================================= */

r.patch(
  '/reservas/:id/rechazar-pago',
  auth,
  admin,
  R.rejectPay
);


/* =========================================================
   ACTUALIZAR RESERVA
========================================================= */

r.put(
  '/reservas/:id',
  auth,
  R.update
);


/* =========================================================
   CANCELAR RESERVA
========================================================= */

r.patch(
  '/reservas/:id/cancelar',
  auth,
  R.cancel
);


/* =========================================================
   ELIMINAR RESERVA DEL HISTORIAL
========================================================= */

r.delete(
  '/reservas/:id',
  auth,
  admin,
  R.remove
);


/* =========================================================
   DASHBOARD
========================================================= */

r.get(
  '/dashboard/estadisticas',
  auth,
  admin,
  stats
);


/* =========================================================
   INFORMES
========================================================= */

r.get(
  '/informes/desempeno',
  auth,
  admin,
  stats
);


/* =========================================================
   EXPORTAR ROUTER
========================================================= */

export default r;
