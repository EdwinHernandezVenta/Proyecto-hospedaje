import { query } from '../config/db.js';

let tableReady;
let cleanupTimerStarted = false;

const SESSION_MINUTES = 30;

async function ensureSessionsTable() {
  if (!tableReady) {
    tableReady = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS sesiones_activas (
          id_usuario BIGINT NOT NULL,
          session_id CHAR(36) NOT NULL UNIQUE,
          expires_at DATETIME NOT NULL,
          close_pending_at DATETIME NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id_usuario, session_id)
        )
      `);

      /*
        Compatibilidad con la tabla anterior.

        La tabla antigua tenía:
          PRIMARY KEY (id_usuario)

        Eso permitía solamente una sesión por cuenta.

        Ahora la clave primaria es:
          PRIMARY KEY (id_usuario, session_id)

        De esta forma cada dispositivo/navegador puede
        tener su propia sesión.
      */

      const indices = await query(`
        SHOW INDEX
        FROM sesiones_activas
      `);

      const primaryColumns =
        indices
          .filter(
            index => index.Key_name === 'PRIMARY'
          )
          .sort(
            (a, b) =>
              a.Seq_in_index -
              b.Seq_in_index
          )
          .map(
            index =>
              index.Column_name
          );

      const primaryCorrecta =
        primaryColumns.length === 2 &&
        primaryColumns[0] === 'id_usuario' &&
        primaryColumns[1] === 'session_id';

      if (!primaryCorrecta) {
        await query(`
          ALTER TABLE sesiones_activas
          DROP PRIMARY KEY,
          ADD PRIMARY KEY (
            id_usuario,
            session_id
          )
        `);
      }

      const columnas = await query(`
        SHOW COLUMNS
        FROM sesiones_activas
      `);

      const tieneClosePending =
        columnas.some(
          columna =>
            columna.Field ===
            'close_pending_at'
        );

      if (!tieneClosePending) {
        await query(`
          ALTER TABLE sesiones_activas
          ADD COLUMN close_pending_at DATETIME NULL
        `);
      }

      try {
        await query(`
          CREATE INDEX idx_sesiones_expiracion
          ON sesiones_activas (expires_at)
        `);
      } catch (error) {
        if (
          error?.code !== 'ER_DUP_KEYNAME' &&
          error?.errno !== 1061
        ) {
          throw error;
        }
      }

    })().catch((error) => {
      tableReady = null;
      throw error;
    });
  }

  await tableReady;
  iniciarLimpiezaAutomatica();
}

async function limpiarSesionesVencidas() {
  await query(`
    DELETE FROM sesiones_activas
    WHERE expires_at <= NOW()
       OR (
         close_pending_at IS NOT NULL
         AND close_pending_at <= NOW()
       )
  `);
}

function iniciarLimpiezaAutomatica() {
  if (cleanupTimerStarted) {
    return;
  }

  cleanupTimerStarted = true;

  setInterval(() => {
    limpiarSesionesVencidas().catch(() => {});
  }, 1000);
}

export async function obtenerSesionActiva(idUsuario) {
  await ensureSessionsTable();
  await limpiarSesionesVencidas();

  const rows = await query(`
    SELECT
      id_usuario,
      session_id,
      expires_at,
      close_pending_at,
      created_at
    FROM sesiones_activas
    WHERE id_usuario = ?
    ORDER BY created_at DESC
  `, [idUsuario]);

  return rows;
}

export async function crearSesionActiva(
  idUsuario,
  sessionId
) {
  await ensureSessionsTable();

  if (!idUsuario) {
    throw new Error(
      'No se puede crear una sesión sin id de usuario'
    );
  }

  if (!sessionId) {
    throw new Error(
      'No se puede crear una sesión sin session_id'
    );
  }

  await limpiarSesionesVencidas();

  /*
    OPCIÓN B:

    No se busca ni se elimina una sesión existente.

    Cada login inserta una sesión nueva.
  */

  await query(`
    INSERT INTO sesiones_activas
    (
      id_usuario,
      session_id,
      expires_at,
      close_pending_at
    )
    VALUES
    (
      ?,
      ?,
      DATE_ADD(
        NOW(),
        INTERVAL ${SESSION_MINUTES} MINUTE
      ),
      NULL
    )
  `, [
    idUsuario,
    sessionId
  ]);

  const sesion = await query(`
    SELECT
      id_usuario,
      session_id,
      expires_at,
      close_pending_at,
      created_at
    FROM sesiones_activas
    WHERE id_usuario = ?
      AND session_id = ?
    LIMIT 1
  `, [
    idUsuario,
    sessionId
  ]);

  if (!sesion[0]) {
    throw new Error(
      'No fue posible establecer la sesión activa'
    );
  }

  return sesion[0];
}

export async function renovarSesionActiva(
  idUsuario,
  sessionId
) {
  await ensureSessionsTable();

  if (!idUsuario || !sessionId) {
    return false;
  }

  const resultado = await query(`
    UPDATE sesiones_activas
    SET
      expires_at = DATE_ADD(
        NOW(),
        INTERVAL ${SESSION_MINUTES} MINUTE
      ),
      close_pending_at = NULL
    WHERE id_usuario = ?
      AND session_id = ?
      AND expires_at > NOW()
  `, [
    idUsuario,
    sessionId
  ]);

  return resultado.affectedRows > 0;
}

export async function marcarCierrePendiente(
  idUsuario,
  sessionId
) {
  await ensureSessionsTable();

  if (!idUsuario || !sessionId) {
    return false;
  }

  const resultado = await query(`
    UPDATE sesiones_activas
    SET
      close_pending_at = DATE_ADD(
        NOW(),
        INTERVAL 15 SECOND
      )
    WHERE id_usuario = ?
      AND session_id = ?
      AND expires_at > NOW()
  `, [
    idUsuario,
    sessionId
  ]);

  return resultado.affectedRows > 0;
}

export async function cancelarCierrePendiente(
  idUsuario,
  sessionId
) {
  await ensureSessionsTable();

  if (!idUsuario || !sessionId) {
    return false;
  }

  const resultado = await query(`
    UPDATE sesiones_activas
    SET
      close_pending_at = NULL
    WHERE id_usuario = ?
      AND session_id = ?
      AND expires_at > NOW()
  `, [
    idUsuario,
    sessionId
  ]);

  return resultado.affectedRows > 0;
}

export async function eliminarSesionActiva(
  idUsuario,
  sessionId = null
) {
  await ensureSessionsTable();

  if (!idUsuario) {
    return;
  }

  if (sessionId) {
    /*
      Cierra únicamente esta sesión.
    */
    await query(`
      DELETE FROM sesiones_activas
      WHERE id_usuario = ?
        AND session_id = ?
    `, [
      idUsuario,
      sessionId
    ]);

    return;
  }

  /*
    Sin sessionId se cierran todas las sesiones
    de la cuenta.
  */
  await query(`
    DELETE FROM sesiones_activas
    WHERE id_usuario = ?
  `, [
    idUsuario
  ]);
}

export async function validarSesionActiva(
  idUsuario,
  sessionId
) {
  if (!idUsuario || !sessionId) {
    return false;
  }

  await ensureSessionsTable();
  await limpiarSesionesVencidas();

  const rows = await query(`
    SELECT
      session_id,
      expires_at
    FROM sesiones_activas
    WHERE id_usuario = ?
      AND session_id = ?
      AND expires_at > NOW()
    LIMIT 1
  `, [
    idUsuario,
    sessionId
  ]);

  return rows.length > 0;
}
