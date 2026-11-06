import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { query, pool } from '../config/db.js';

import {
  enviarCorreoRecuperacion,
  enviarCorreoBienvenidaGoogle,
  enviarCorreoEliminacionCuenta
} from '../services/emailService.js';

import {
  crearSesionActiva,
  validarSesionActiva,
  renovarSesionActiva,
  eliminarSesionActiva
} from '../services/sessionService.js';

import { broadcast } from '../realtime/realtime.js';


/* =========================================================
   CONFIGURACIÓN
========================================================= */

const GOOGLE_CLIENT_ID =
  String(process.env.GOOGLE_CLIENT_ID || '').trim();

const GOOGLE_CLIENT_SECRET =
  String(process.env.GOOGLE_CLIENT_SECRET || '').trim();

const GOOGLE_REDIRECT_URI =
  String(process.env.GOOGLE_REDIRECT_URI || '').trim();

const FRONTEND_URL =
  String(
    process.env.FRONTEND_URL ||
    'http://localhost:5173'
  )
    .trim()
    .replace(/\/+$/, '');

const JWT_SECRET =
  process.env.JWT_SECRET;

const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  JWT_SECRET;


/* =========================================================
   ALMACENAMIENTO TEMPORAL GOOGLE
========================================================= */

const googlePending = new Map();

const GOOGLE_PENDING_MINUTES = 10;


/* =========================================================
   FUNCIONES AUXILIARES
========================================================= */

function crearTokenSesion({
  id,
  sid
}) {
  return jwt.sign(
    {
      id,
      sid
    },
    JWT_SECRET,
    {
      expiresIn: '30m'
    }
  );
}


function crearRefreshToken({
  id,
  sid
}) {
  return jwt.sign(
    {
      id,
      sid,
      tipo: 'refresh'
    },
    JWT_REFRESH_SECRET,
    {
      expiresIn: '7d'
    }
  );
}


function limpiarTexto(valor) {
  return String(valor || '')
    .trim()
    .replace(/\s+/g, ' ');
}
function validarContrasenaSegura(password) {
  const value = String(password || '');

  if (value.length < 8) return 'La contraseña debe tener mínimo 8 caracteres';
  if (!/[A-Z]/.test(value)) return 'La contraseña debe contener al menos una mayúscula';
  if (!/[a-z]/.test(value)) return 'La contraseña debe contener al menos una minúscula';
  if (!/[0-9]/.test(value)) return 'La contraseña debe contener al menos un número';
  return null;
}



function normalizarUsername(valor) {
  return limpiarTexto(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 45);
}


function pareceCorreoONombreCorreo(valor, correo) {
  const texto =
    limpiarTexto(valor)
      .toLowerCase();

  const email =
    limpiarTexto(correo)
      .toLowerCase();

  if (!texto || !email) {
    return false;
  }

  if (texto === email) {
    return true;
  }

  const local =
    email.split('@')[0];

  return texto === local;
}


/* =========================================================
   OBTENER NOMBRE DESDE GOOGLE
========================================================= */

function obtenerDatosNombreGoogle({
  nombre,
  apellido,
  nombreCompleto,
  correo
}) {
  let nombreFinal =
    limpiarTexto(nombre);

  let apellidoFinal =
    limpiarTexto(apellido);

  const completo =
    limpiarTexto(nombreCompleto);

  /*
    Google puede proporcionar:
    - name
    - given_name
    - family_name

    Los tres son claims estándar del perfil.
  */

  if (
    completo &&
    !pareceCorreoONombreCorreo(
      completo,
      correo
    )
  ) {
    const partes =
      completo
        .split(/\s+/)
        .filter(Boolean);

    if (partes.length >= 2) {
      nombreFinal =
        partes.shift();

      apellidoFinal =
        partes.join(' ');
    } else if (!nombreFinal) {
      nombreFinal =
        completo;
    }
  }

  /*
    Si Google no entregó apellido,
    usamos el nombre completo cuando
    exista.
  */

  if (
    !apellidoFinal &&
    completo &&
    !pareceCorreoONombreCorreo(
      completo,
      correo
    )
  ) {
    const partes =
      completo
        .split(/\s+/)
        .filter(Boolean);

    if (partes.length >= 2) {
      nombreFinal =
        partes.shift();

      apellidoFinal =
        partes.join(' ');
    }
  }

  /*
    Último recurso.
    No inventamos nombres si Google no
    proporciona información suficiente.
  */

  if (!nombreFinal) {
    nombreFinal =
      'Cliente';
  }

  if (!apellidoFinal) {
    apellidoFinal =
      'Google';
  }

  return {
    nombre:
      nombreFinal.slice(0, 50),

    apellido:
      apellidoFinal.slice(0, 50)
  };
}


/* =========================================================
   GENERAR IDENTIFICACIÓN INTERNA GOOGLE
========================================================= */

function generarIdentificacionGoogle() {
  let identificacion = '';

  while (identificacion.length < 20) {
    identificacion +=
      crypto.randomInt(0, 10).toString();
  }

  return identificacion;
}


async function generarIdentificacionUnica() {
  for (let intento = 0; intento < 20; intento++) {
    const identificacion =
      generarIdentificacionGoogle();

    const rows =
      await query(
        `
          SELECT id
          FROM clientes
          WHERE identificacion = ?
          LIMIT 1
        `,
        [identificacion]
      );

    if (!rows[0]) {
      return identificacion;
    }
  }

  throw new Error(
    'No fue posible generar una identificación interna única.'
  );
}


/* =========================================================
   GENERAR USUARIO GOOGLE
========================================================= */

async function generarNombreUsuarioGoogle({
  nombre,
  apellido,
  correo
}) {
  const localCorreo =
    limpiarTexto(
      String(correo || '')
        .split('@')[0]
    );

  let base =
    normalizarUsername(
      `${nombre}.${apellido}`
    );

  /*
    Si el nombre de Google no es útil,
    usamos la parte inicial del correo.
  */

  if (
    !base ||
    base === 'cliente.google'
  ) {
    base =
      normalizarUsername(
        localCorreo
      );
  }

  if (!base) {
    base = 'cliente';
  }

  base =
    base.slice(0, 45);

  let candidato =
    base;

  let numero = 1;

  while (true) {
    const rows =
      await query(
        `
          SELECT id
          FROM usuarios
          WHERE nombre_usuario = ?
          LIMIT 1
        `,
        [candidato]
      );

    if (!rows[0]) {
      return candidato;
    }

    numero++;

    candidato =
      `${base}${numero}`
        .slice(0, 50);
  }
}


/* =========================================================
   RESPUESTA DE SESIÓN
========================================================= */

function crearRespuestaSesion({
  usuario,
  sessionId
}) {
  const accessToken =
    crearTokenSesion({
      id: usuario.id,
      sid: sessionId
    });

  const refreshToken =
    crearRefreshToken({
      id: usuario.id,
      sid: sessionId
    });

  return {
    accessToken,
    refreshToken,

    user: {
      id: usuario.id,
      nombre_usuario:
        usuario.nombre_usuario,
      correo:
        usuario.correo,
      rol:
        usuario.rol
    }
  };
}


/* =========================================================
   OBTENER USUARIO
========================================================= */

async function obtenerUsuarioPorId(id) {
  const usuarios =
    await query(
      `
        SELECT
          u.id,
          u.nombre_usuario,
          u.correo,
          u.id_rol,
          u.estado,
          r.nombre_rol AS rol,
          r.permisos,
          r.estado_rol
        FROM usuarios u
        INNER JOIN roles r
          ON r.id = u.id_rol
        WHERE u.id = ?
        LIMIT 1
      `,
      [id]
    );

  return usuarios[0] || null;
}


/* =========================================================
   LOGIN
========================================================= */

export async function login(req, res, next) {
  try {
    const correo =
      limpiarTexto(
        req.body.correo
      ).toLowerCase();

    const contrasena =
      String(
        req.body.contrasena || ''
      );

    const usuarios =
      await query(
        `
          SELECT
            u.id,
            u.nombre_usuario,
            u.correo,
            u.contrasena,
            u.id_rol,
            u.estado,
            r.nombre_rol AS rol,
            r.permisos,
            r.estado_rol
          FROM usuarios u
          INNER JOIN roles r
            ON r.id = u.id_rol
          WHERE LOWER(u.correo) = ?
          LIMIT 1
        `,
        [correo]
      );

    if (!usuarios[0]) {
      return res.status(401).json({
        message:
          'Correo o contraseña incorrectos.'
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
          'El usuario no está activo.'
      });
    }

    if (
      usuario.estado_rol !== true &&
      usuario.estado_rol !== 1 &&
      usuario.estado_rol !== '1'
    ) {
      return res.status(403).json({
        message:
          'El rol del usuario está inactivo.'
      });
    }

    const passwordCorrecta =
      await bcrypt.compare(
        contrasena,
        usuario.contrasena
      );

    if (!passwordCorrecta) {
      return res.status(401).json({
        message:
          'Correo o contraseña incorrectos.'
      });
    }

    const sessionId =
      crypto.randomUUID();

    await crearSesionActiva(
      usuario.id,
      sessionId
    );

    return res.json(
      crearRespuestaSesion({
        usuario,
        sessionId
      })
    );

  } catch (error) {
    next(error);
  }
}


/* =========================================================
   ME
========================================================= */

export async function me(req, res, next) {
  try {
    const usuario =
      await obtenerUsuarioPorId(
        req.user.id
      );

    if (!usuario) {
      return res.status(404).json({
        message:
          'Usuario no encontrado.'
      });
    }

    return res.json({
      user: {
        id: usuario.id,
        nombre_usuario:
          usuario.nombre_usuario,
        correo:
          usuario.correo,
        rol:
          usuario.rol
      }
    });

  } catch (error) {
    next(error);
  }
}


/* =========================================================
   REFRESH
========================================================= */

export async function refresh(req, res, next) {
  try {
    const token =
      String(
        req.body?.refreshToken || ''
      ).trim();

    if (!token) {
      return res.status(401).json({
        message:
          'Refresh token requerido.'
      });
    }

    const decoded =
      jwt.verify(
        token,
        JWT_REFRESH_SECRET
      );

    if (
      decoded.tipo !== 'refresh' ||
      !decoded.id ||
      !decoded.sid
    ) {
      return res.status(401).json({
        message:
          'Refresh token inválido.'
      });
    }

    const sesionValida =
      await validarSesionActiva(
        decoded.id,
        decoded.sid
      );

    if (!sesionValida) {
      return res.status(401).json({
        message:
          'La sesión ya no está activa.'
      });
    }

    const usuario =
      await obtenerUsuarioPorId(
        decoded.id
      );

    if (!usuario) {
      return res.status(401).json({
        message:
          'Usuario no encontrado.'
      });
    }

    await renovarSesionActiva(
      decoded.id,
      decoded.sid
    );

    return res.json(
      crearRespuestaSesion({
        usuario,
        sessionId:
          decoded.sid
      })
    );

  } catch (error) {
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError'
    ) {
      return res.status(401).json({
        message:
          'Refresh token inválido o expirado.'
      });
    }

    next(error);
  }
}


/* =========================================================
   ELIMINAR CUENTA ACTUAL
========================================================= */

export async function deleteAccount(req, res, next) {
  let connection;

  try {
    const usuarios = await query(
      `
        SELECT id, nombre_usuario, correo
        FROM usuarios
        WHERE id = ?
        LIMIT 1
      `,
      [req.user.id]
    );

    if (!usuarios[0]) {
      return res.status(404).json({
        message: 'La cuenta no fue encontrada.'
      });
    }

    const usuario = usuarios[0];

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [clientes] = await connection.execute(
      `
        SELECT id
        FROM clientes
        WHERE id_usuario = ?
        LIMIT 1
      `,
      [usuario.id]
    );

    if (clientes[0]) {
      const [reservas] = await connection.execute(
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
        /* Conservamos el cliente para no perder el historial. */
        await connection.execute(
          `
            UPDATE clientes
            SET id_usuario = NULL
            WHERE id = ?
          `,
          [clientes[0].id]
        );
      } else {
        /* Sin historial: eliminamos también el cliente. */
        await connection.execute(
          `
            DELETE FROM clientes
            WHERE id = ?
          `,
          [clientes[0].id]
        );
      }
    }

    await connection.execute(
      `DELETE FROM usuarios WHERE id = ?`,
      [usuario.id]
    );

    await connection.commit();
    connection.release();
    connection = null;

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
      accountDeleted: true
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
      connection.release();
    }

    next(error);
  }
}


/* =========================================================
   LOGOUT
========================================================= */

export async function logout(req, res, next) {
  try {
    await eliminarSesionActiva(
      req.user.id,
      req.user.sid
    );

    return res.json({
      message:
        'Sesión cerrada correctamente.'
    });

  } catch (error) {
    next(error);
  }
}


/* =========================================================
   RECUPERACIÓN DE CONTRASEÑA
========================================================= */

export async function forgotPassword(req, res, next) {
  try {
    const correo =
      limpiarTexto(
        req.body.correo
      ).toLowerCase();

    const usuarios =
      await query(
        `
          SELECT
            id,
            correo
          FROM usuarios
          WHERE LOWER(correo) = ?
          LIMIT 1
        `,
        [correo]
      );

    /*
      No revelamos si el correo existe.
    */

    if (!usuarios[0]) {
      return res.json({
        message:
          'Si el correo está registrado, recibirás instrucciones para recuperar tu contraseña.'
      });
    }

    const usuario =
      usuarios[0];

    const token =
      crypto.randomBytes(32)
        .toString('hex');

    await query(
      `
        UPDATE usuarios
        SET
          reset_token = ?,
          reset_token_expires =
            DATE_ADD(NOW(), INTERVAL 30 MINUTE)
        WHERE id = ?
      `,
      [
        token,
        usuario.id
      ]
    );

    const url =
      `${FRONTEND_URL}/#/restablecer-contrasena?token=${encodeURIComponent(token)}`;

    try {
      await enviarCorreoRecuperacion({
        destinatario:
          usuario.correo,
        url
      });
    } catch (emailError) {
      console.error(
        'No fue posible enviar el correo de recuperación:',
        emailError
      );
    }

    return res.json({
      message:
        'Si el correo está registrado, recibirás instrucciones para recuperar tu contraseña.'
    });

  } catch (error) {
    next(error);
  }
}


/* =========================================================
   RESET PASSWORD
========================================================= */

export async function resetPassword(req, res, next) {
  try {
    const token =
      String(
        req.body.token || ''
      ).trim();

    const nuevaContrasena =
      String(
        req.body.nuevaContrasena || ''
      );

    if (!token || !nuevaContrasena) {
      return res.status(400).json({
        message:
          'Token y nueva contraseña son obligatorios.'
      });
    }

    const errorContrasena =
      validarContrasenaSegura(nuevaContrasena);

    if (errorContrasena) {
      return res.status(422).json({
        message: errorContrasena
      });
    }

    const usuarios =
      await query(
        `
          SELECT
            id
          FROM usuarios
          WHERE reset_token = ?
            AND reset_token_expires > NOW()
          LIMIT 1
        `,
        [token]
      );

    if (!usuarios[0]) {
      return res.status(400).json({
        message:
          'El enlace de recuperación es inválido o ha expirado.'
      });
    }

    const hash =
      await bcrypt.hash(
        nuevaContrasena,
        12
      );

    await query(
      `
        UPDATE usuarios
        SET
          contrasena = ?,
          reset_token = NULL,
          reset_token_expires = NULL
        WHERE id = ?
      `,
      [
        hash,
        usuarios[0].id
      ]
    );

    /*
      Cerramos las sesiones activas para
      obligar a iniciar sesión nuevamente.
    */

    await eliminarSesionActiva(
      usuarios[0].id
    );

    return res.json({
      message:
        'Contraseña actualizada correctamente.'
    });

  } catch (error) {
    next(error);
  }
}


/* =========================================================
   ALIAS COMPATIBLES CON ROUTES/INDEX.JS
========================================================= */

export const forgot =
  forgotPassword;

export const reset =
  resetPassword;


/* =========================================================
   GOOGLE - INICIAR LOGIN
========================================================= */

export function googleLogin(req, res) {

  console.log('Entró a googleLogin');
  console.log('CLIENT ID configurado:', Boolean(GOOGLE_CLIENT_ID));
  console.log('CLIENT SECRET configurado:', Boolean(GOOGLE_CLIENT_SECRET));
  console.log('REDIRECT URI configurada:', GOOGLE_REDIRECT_URI);

  if (

    !GOOGLE_CLIENT_ID ||
    !GOOGLE_CLIENT_SECRET ||
    !GOOGLE_REDIRECT_URI
  ) {
    return res.status(500).send(
      'Google OAuth no está configurado correctamente.'
    );
  }

  console.log('CLIENT ID:', GOOGLE_CLIENT_ID);
  console.log('REDIRECT URI:', GOOGLE_REDIRECT_URI);

  const params =
    new URLSearchParams({
      client_id:
        GOOGLE_CLIENT_ID,

      redirect_uri:
        GOOGLE_REDIRECT_URI,

      response_type:
        'code',

      scope:
        'openid email profile',

      access_type:
        'offline',

      prompt:
        'select_account'
    });
    

  const url =
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

   console.log('URL DE GOOGLE:', url);

  return res.redirect(url);
}


/* =========================================================
   GOOGLE - CALLBACK
========================================================= */

export async function googleCallback(req, res) {
  try {
    const code =
      String(
        req.query.code || ''
      ).trim();

    if (!code) {
      return res.redirect(
        `${FRONTEND_URL}/#/login?google_error=missing_code`
      );
    }

    const tokenResponse =
      await fetch(
        'https://oauth2.googleapis.com/token',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/x-www-form-urlencoded'
          },

          body:
            new URLSearchParams({
              code,

              client_id:
                GOOGLE_CLIENT_ID,

              client_secret:
                GOOGLE_CLIENT_SECRET,

              redirect_uri:
                GOOGLE_REDIRECT_URI,

              grant_type:
                'authorization_code'
            })
        }
      );

    const tokenData =
      await tokenResponse.json();

    if (
      !tokenResponse.ok ||
      !tokenData.id_token
    ) {
      console.error(
        'Error intercambiando código Google:',
        tokenData
      );

      return res.redirect(
        `${FRONTEND_URL}/#/login?google_error=token`
      );
    }

    const partes =
      tokenData.id_token.split('.');

    if (partes.length !== 3) {
      return res.redirect(
        `${FRONTEND_URL}/#/login?google_error=invalid_token`
      );
    }

    const payload =
      JSON.parse(
        Buffer.from(
          partes[1],
          'base64url'
        ).toString('utf8')
      );

    /*
      Verificaciones básicas del ID token.
    */

    if (
      payload.iss !==
        'https://accounts.google.com' &&
      payload.iss !==
        'accounts.google.com'
    ) {
      return res.redirect(
        `${FRONTEND_URL}/#/login?google_error=invalid_issuer`
      );
    }

    if (
      payload.aud !==
      GOOGLE_CLIENT_ID
    ) {
      return res.redirect(
        `${FRONTEND_URL}/#/login?google_error=invalid_audience`
      );
    }

    if (
      !payload.email ||
      payload.email_verified !== true
    ) {
      return res.redirect(
        `${FRONTEND_URL}/#/login?google_error=email_not_verified`
      );
    }

    const googleId =
      String(
        payload.sub || ''
      ).trim();

    const correo =
      limpiarTexto(
        payload.email
      ).toLowerCase();

    if (!googleId || !correo) {
      return res.redirect(
        `${FRONTEND_URL}/#/login?google_error=missing_data`
      );
    }

    /*
      Google puede proporcionar:
      name
      given_name
      family_name

      Aprovechamos todos los disponibles.
    */

    const datosNombre =
      obtenerDatosNombreGoogle({
        nombre:
          payload.given_name,

        apellido:
          payload.family_name,

        nombreCompleto:
          payload.name,

        correo
      });

    /*
      Primero buscamos si ya existe
      un usuario con ese correo.
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
            r.nombre_rol AS rol
          FROM usuarios u
          INNER JOIN roles r
            ON r.id = u.id_rol
          WHERE LOWER(u.correo) = ?
          LIMIT 1
        `,
        [correo]
      );

    const codigo =
      crypto.randomBytes(32)
        .toString('hex');

    googlePending.set(
      codigo,
      {
        type:
          usuarios[0]
            ? 'existing_user'
            : 'new_user',

        googleId,

        correo,

        nombre:
          datosNombre.nombre,

        apellido:
          datosNombre.apellido,

        expiresAt:
          Date.now() +
          GOOGLE_PENDING_MINUTES *
          60 *
          1000
      }
    );

    return res.redirect(
      `${FRONTEND_URL}/#/login?google_code=${encodeURIComponent(codigo)}`
    );

  } catch (error) {
    console.error(
      'Error en Google callback:',
      error
    );

    return res.redirect(
      `${FRONTEND_URL}/#/login?google_error=server`
    );
  }
}


/* =========================================================
   GOOGLE - OBTENER DATOS PENDIENTES
========================================================= */

export function googlePendingData(req, res) {
  const codigo =
    String(
      req.query.codigo ||
      req.query.code ||
      ''
    ).trim();

  if (!codigo) {
    return res.status(400).json({
      message:
        'Código temporal requerido.'
    });
  }

  const pendiente =
    googlePending.get(
      codigo
    );

  if (!pendiente) {
    return res.status(404).json({
      message:
        'La información temporal de Google no existe o ya fue utilizada.'
    });
  }

  if (
    pendiente.expiresAt <=
    Date.now()
  ) {
    googlePending.delete(
      codigo
    );

    return res.status(410).json({
      message:
        'La sesión temporal de Google ha expirado.'
    });
  }

  return res.json({
    type:
      pendiente.type,

    correo:
      pendiente.correo,

    nombre:
      pendiente.nombre,

    apellido:
      pendiente.apellido
  });
}


/* =========================================================
   GOOGLE - EXCHANGE
========================================================= */

export async function googleExchange(req, res, next) {
  try {
    const codigo =
      String(
        req.body?.codigo ||
        req.body?.code ||
        ''
      ).trim();

    if (!codigo) {
      return res.status(400).json({
        message:
          'Código temporal requerido.'
      });
    }

    const pendiente =
      googlePending.get(
        codigo
      );

    if (!pendiente) {
      return res.status(404).json({
        message:
          'El código de Google no existe o ya fue utilizado.'
      });
    }

    if (
      pendiente.expiresAt <=
      Date.now()
    ) {
      googlePending.delete(
        codigo
      );

      return res.status(410).json({
        message:
          'El código temporal de Google ha expirado.'
      });
    }

    /*
      Si el usuario ya existía, iniciamos
      sesión directamente.
    */

    if (
      pendiente.type ===
      'existing_user'
    ) {
      const usuarios =
        await query(
          `
            SELECT
              u.id,
              u.nombre_usuario,
              u.correo,
              u.id_rol,
              u.estado,
              r.nombre_rol AS rol,
              r.permisos,
              r.estado_rol
            FROM usuarios u
            INNER JOIN roles r
              ON r.id = u.id_rol
            WHERE LOWER(u.correo) = ?
            LIMIT 1
          `,
          [pendiente.correo]
        );

      if (!usuarios[0]) {
        return res.status(404).json({
          message:
            'No se encontró el usuario asociado a la cuenta Google.'
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
            'El usuario no está activo.'
        });
      }

      const sessionId =
        crypto.randomUUID();

      await crearSesionActiva(
        usuario.id,
        sessionId
      );

      googlePending.delete(
        codigo
      );

      return res.json(
        crearRespuestaSesion({
          usuario,
          sessionId
        })
      );
    }

    return res.status(400).json({
      message:
        'Este código corresponde a un registro nuevo. Debe completarse mediante el endpoint de registro Google.'
    });

  } catch (error) {
    next(error);
  }
}


/* =========================================================
   GOOGLE - COMPLETAR REGISTRO
========================================================= */

export async function googleComplete(req, res, next) {
  let connection;

  try {
    const codigo =
      String(
        req.body?.codigo ||
        req.body?.code ||
        ''
      ).trim();

    if (!codigo) {
      return res.status(400).json({
        message: 'Código temporal requerido.'
      });
    }

    const pendiente = googlePending.get(codigo);

    if (!pendiente) {
      return res.status(404).json({
        message:
          'El código temporal de Google no existe o ya fue utilizado.'
      });
    }

    if (pendiente.expiresAt <= Date.now()) {
      googlePending.delete(codigo);

      return res.status(410).json({
        message:
          'El código temporal de Google ha expirado.'
      });
    }

    const correoGoogle =
      limpiarTexto(pendiente.correo).toLowerCase();

    /* =====================================================
       CUENTA DE USUARIO YA EXISTENTE
    ===================================================== */

    const usuariosExistentes = await query(
      `
        SELECT
          u.id,
          u.nombre_usuario,
          u.correo,
          u.id_rol,
          u.estado,
          r.nombre_rol AS rol,
          r.permisos,
          r.estado_rol
        FROM usuarios u
        INNER JOIN roles r
          ON r.id = u.id_rol
        WHERE LOWER(u.correo) = ?
        LIMIT 1
      `,
      [correoGoogle]
    );

    if (usuariosExistentes[0]) {
      const usuario = usuariosExistentes[0];

      if (String(usuario.rol || '').toLowerCase() === 'cliente') {
        const clienteActual = await query(
          `
            SELECT id, id_usuario
            FROM clientes
            WHERE LOWER(correo) = ?
            LIMIT 1
          `,
          [usuario.correo]
        );

        if (clienteActual[0]) {
          if (!clienteActual[0].id_usuario) {
            await query(
              `
                UPDATE clientes
                SET id_usuario = ?, estado = 1
                WHERE id = ?
              `,
              [usuario.id, clienteActual[0].id]
            );
          }
        } else {
          const datosGoogle = obtenerNombreApellidoGoogle(pendiente);
          const identificacion = await generarIdentificacionUnica();

          await query(
            `
              INSERT INTO clientes
              (
                id_usuario,
                identificacion,
                nombre,
                apellido,
                telefono,
                direccion,
                correo,
                estado
              )
              VALUES (?, ?, ?, ?, NULL, NULL, ?, 1)
            `,
            [
              usuario.id,
              identificacion,
              datosGoogle.nombre,
              datosGoogle.apellido,
              usuario.correo
            ]
          );
        }
      }

      if (
        usuario.estado !== 'activo' &&
        usuario.estado !== 1 &&
        usuario.estado !== '1'
      ) {
        return res.status(403).json({
          message: 'El usuario no está activo.'
        });
      }

      const sessionId = crypto.randomUUID();

      await crearSesionActiva(
        usuario.id,
        sessionId
      );

      googlePending.delete(codigo);

      return res.json(
        crearRespuestaSesion({
          usuario,
          sessionId
        })
      );
    }

    /* =====================================================
       NUEVA CUENTA GOOGLE: SI YA EXISTE UN CLIENTE HUÉRFANO
       LO REUTILIZAMOS EN VEZ DE CREAR UN DUPLICADO.
    ===================================================== */

    const clienteHuerfano = await query(
      `
        SELECT
          id,
          identificacion
        FROM clientes
        WHERE LOWER(correo) = ?
          AND id_usuario IS NULL
        LIMIT 1
      `,
      [correoGoogle]
    );

    const nombre =
      limpiarTexto(pendiente.nombre).slice(0, 50);

    const apellido =
      limpiarTexto(pendiente.apellido).slice(0, 50);

    const rolesCliente = await query(
      `
        SELECT id, nombre_rol
        FROM roles
        WHERE nombre_rol = 'Cliente'
          AND (
            estado_rol = 1
            OR estado_rol = TRUE
            OR estado_rol = '1'
          )
        LIMIT 1
      `
    );

    if (!rolesCliente[0]) {
      return res.status(500).json({
        message: 'No existe un rol Cliente activo.'
      });
    }

    const idRolCliente = rolesCliente[0].id;

    const nombreUsuario =
      await generarNombreUsuarioGoogle({
        nombre,
        apellido,
        correo: correoGoogle
      });

    const contrasenaInterna =
      crypto.randomBytes(12)
        .toString('base64url')
        .slice(0, 16);

    const hash = await bcrypt.hash(
      contrasenaInterna,
      12
    );

    const identificacion = clienteHuerfano[0]
      ? clienteHuerfano[0].identificacion
      : await generarIdentificacionUnica();

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [resultadoUsuario] = await connection.execute(
      `
        INSERT INTO usuarios
        (
          nombre_usuario,
          correo,
          contrasena,
          id_rol,
          estado
        )
        VALUES (?, ?, ?, ?, 'activo')
      `,
      [
        nombreUsuario,
        correoGoogle,
        hash,
        idRolCliente
      ]
    );

    const idUsuario = resultadoUsuario.insertId;

    if (clienteHuerfano[0]) {
      await connection.execute(
        `
          UPDATE clientes
          SET
            id_usuario = ?,
            nombre = ?,
            apellido = ?,
            correo = ?,
            estado = 1
          WHERE id = ?
        `,
        [
          idUsuario,
          nombre,
          apellido,
          correoGoogle,
          clienteHuerfano[0].id
        ]
      );
    } else {
      await connection.execute(
        `
          INSERT INTO clientes
          (
            id_usuario,
            identificacion,
            nombre,
            apellido,
            telefono,
            direccion,
            correo,
            estado
          )
          VALUES (?, ?, ?, ?, NULL, NULL, ?, 1)
        `,
        [
          idUsuario,
          identificacion,
          nombre,
          apellido,
          correoGoogle
        ]
      );
    }

    await connection.commit();
    connection.release();
    connection = null;

    try {
      await enviarCorreoBienvenidaGoogle({
        destinatario: correoGoogle,
        nombre,
        nombreUsuario,
        contrasena: contrasenaInterna
      });

      console.log(
        `Correo de bienvenida enviado a ${correoGoogle}`
      );
    } catch (emailError) {
      console.error(
        `La cuenta Google fue creada, pero no fue posible enviar el correo de bienvenida a ${correoGoogle}:`,
        emailError
      );
    }

    const usuario =
      await obtenerUsuarioPorId(idUsuario);

    if (!usuario) {
      return res.status(500).json({
        message:
          'La cuenta fue creada, pero no fue posible recuperar el usuario.'
      });
    }

    const sessionId = crypto.randomUUID();

    await crearSesionActiva(
      idUsuario,
      sessionId
    );

    googlePending.delete(codigo);

    return res.status(201).json(
      crearRespuestaSesion({
        usuario,
        sessionId
      })
    );
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
      connection.release();
    }

    console.error(
      'Error completando registro Google:',
      error
    );

    next(error);
  }
}
