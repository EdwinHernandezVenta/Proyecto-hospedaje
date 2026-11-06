import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { query, pool } from '../config/db.js';
import { enviarCorreoBienvenida } from '../services/emailService.js';

dotenv.config();

export async function registrarUsuario(req, res, next) {
  let connection;

  try {
    const {
      nombre_usuario,
      correo,
      contrasena,
      identificacion,
      nombre,
      apellido,
      telefono,
      direccion,
      rolSolicitado,
      codigoAdministrador
    } = req.body;

    const usuario = String(nombre_usuario || '').trim();
    const email = String(correo || '').trim().toLowerCase();
    const password = String(contrasena || '').trim();

    const nombreCliente = String(nombre || '').trim();
    const apellidoCliente = String(apellido || '').trim();

    const identificacionTexto = String(identificacion ?? '').trim();

    const rol =
      rolSolicitado === 'Administrador'
        ? 'Administrador'
        : 'Cliente';

    /* ================================
       VALIDACIONES
       ================================ */

    if (!usuario) {
      return res.status(400).json({
        message: 'El nombre de usuario es obligatorio'
      });
    }

    if (usuario.length < 3 || usuario.length > 50) {
      return res.status(400).json({
        message: 'El usuario debe tener entre 3 y 50 caracteres'
      });
    }

    if (!email) {
      return res.status(400).json({
        message: 'El correo es obligatorio'
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        message: 'Ingresa un correo electrónico válido'
      });
    }

    if (!password) {
      return res.status(400).json({
        message: 'La contraseña es obligatoria'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: 'La contraseña debe tener mínimo 8 caracteres'
      });
    }

    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({
        message: 'La contraseña debe contener al menos una mayúscula'
      });
    }

    if (!/[a-z]/.test(password)) {
      return res.status(400).json({
        message: 'La contraseña debe contener al menos una minúscula'
      });
    }

    if (!/[0-9]/.test(password)) {
      return res.status(400).json({
        message: 'La contraseña debe contener al menos un número'
      });
    }

    if (!nombreCliente) {
      return res.status(400).json({
        message: 'El nombre es obligatorio'
      });
    }

    if (!apellidoCliente) {
      return res.status(400).json({
        message: 'El apellido es obligatorio'
      });
    }

    if (!/^\d{1,20}$/.test(identificacionTexto)) {
      return res.status(400).json({
        message: 'La identificación debe contener entre 1 y 20 dígitos'
      });
    }

    /* ================================
       VALIDACIÓN DE ADMINISTRADOR
       ================================ */

    if (rol === 'Administrador') {
      const codigoReal =
        String(process.env.ADMIN_REGISTRATION_CODE || '').trim();

      const codigoRecibido =
        String(codigoAdministrador || '').trim();

      if (!codigoReal) {
        return res.status(500).json({
          message:
            'El registro de administradores no está configurado en el servidor'
        });
      }

      if (codigoRecibido !== codigoReal) {
        return res.status(403).json({
          message: 'El código de administrador es incorrecto'
        });
      }
    }

    /* ================================
       COMPROBAR USUARIO
       ================================ */

    const usuarioExistente = await query(
      `
        SELECT id
        FROM usuarios
        WHERE correo = ?
        LIMIT 1
      `,
      [email]
    );

    if (usuarioExistente.length > 0) {
      return res.status(409).json({
        message:
          'Ya existe una cuenta registrada con ese correo'
      });
    }

    const nombreUsuarioExistente = await query(
      `
        SELECT id
        FROM usuarios
        WHERE nombre_usuario = ?
        LIMIT 1
      `,
      [usuario]
    );

    if (nombreUsuarioExistente.length > 0) {
      return res.status(409).json({
        message:
          'Ese nombre de usuario ya está en uso'
      });
    }

    /* ================================
       COMPROBAR CLIENTE
       ================================ */

    const clienteCorreoExistente = await query(
      `
        SELECT
          id,
          id_usuario,
          identificacion
        FROM clientes
        WHERE LOWER(correo) = ?
        LIMIT 1
      `,
      [email]
    );

    const clienteOrfano =
      clienteCorreoExistente[0] &&
      !clienteCorreoExistente[0].id_usuario
        ? clienteCorreoExistente[0]
        : null;

    /*
       Si existe un cliente vinculado a otra cuenta, el correo no puede
       reutilizarse. Si existe un cliente huérfano (sin id_usuario),
       podremos vincularlo nuevamente cuando la nueva cuenta sea Cliente.
    */
    if (
      clienteCorreoExistente[0] &&
      clienteCorreoExistente[0].id_usuario
    ) {
      return res.status(409).json({
        message:
          'Ese correo ya está registrado como cliente'
      });
    }

    const clienteExistente = await query(
      `
        SELECT id
        FROM clientes
        WHERE identificacion = ?
          AND (? IS NULL OR id <> ?)
        LIMIT 1
      `,
      [
        identificacionTexto,
        clienteOrfano?.id ?? null,
        clienteOrfano?.id ?? null
      ]
    );

    if (clienteExistente.length > 0) {
      return res.status(409).json({
        message:
          'Ya existe un cliente con esa identificación'
      });
    }

    if (clienteOrfano && rol === 'Administrador') {
      return res.status(409).json({
        message:
          'Ese correo conserva un registro de cliente. Para crear un Administrador usa otro correo.'
      });
    }

    /* ================================
       BUSCAR ROL
       ================================ */

    const roles = await query(
      `
        SELECT
          id,
          nombre_rol
        FROM roles
        WHERE nombre_rol = ?
          AND estado_rol = TRUE
        LIMIT 1
      `,
      [rol]
    );

    if (!roles.length) {
      return res.status(500).json({
        message:
          `No se encontró el rol ${rol} activo en el sistema`
      });
    }

    const idRol = roles[0].id;

    /* ================================
       ENCRIPTAR CONTRASEÑA
       ================================ */

    const hash = await bcrypt.hash(
      password,
      10
    );

    /* ================================
       TRANSACCIÓN
       ================================ */

    connection = await pool.getConnection();

    await connection.beginTransaction();

    /* ================================
       CREAR USUARIO
       ================================ */

    const [usuarioResult] =
      await connection.execute(
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
          usuario,
          email,
          hash,
          idRol
        ]
      );

    /* ================================
       CREAR CLIENTE
       ================================ */

    const telefonoValor =
      telefono &&
      String(telefono).trim()
        ? Number(
            String(telefono).replace(/\D/g, '')
          )
        : null;

    if (rol === 'Cliente' && clienteOrfano) {
      /*
         Reutilizamos el cliente histórico en lugar de crear un duplicado.
         Esto permite recuperar una cuenta eliminada sin perder reservas.
      */
      await connection.execute(
        `
          UPDATE clientes
          SET
            id_usuario = ?,
            identificacion = ?,
            nombre = ?,
            apellido = ?,
            telefono = ?,
            direccion = ?,
            correo = ?,
            estado = TRUE
          WHERE id = ?
        `,
        [
          usuarioResult.insertId,
          identificacionTexto,
          nombreCliente,
          apellidoCliente,
          telefonoValor || null,
          direccion
            ? String(direccion).trim()
            : null,
          email,
          clienteOrfano.id
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
          VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
        `,
        [
          usuarioResult.insertId,
          identificacionTexto,
          nombreCliente,
          apellidoCliente,
          telefonoValor || null,
          direccion
            ? String(direccion).trim()
            : null,
          email
        ]
      );
    }

    /* ================================
       CONFIRMAR
       ================================ */

    await connection.commit();

    try {
      await enviarCorreoBienvenida({
        destinatario: email,
        nombre: nombreCliente,
        nombreUsuario: usuario,
        rol
      });
    } catch (emailError) {
      console.error(
        `La cuenta fue creada, pero no fue posible enviar el correo de bienvenida a ${email}:`,
        emailError
      );
    }

    return res.status(201).json({
      message:
        rol === 'Administrador'
          ? 'Cuenta de Administrador creada correctamente'
          : 'Cuenta de Cliente creada correctamente',

      usuario: {
        id: usuarioResult.insertId,
        nombre_usuario: usuario,
        correo: email,
        rol
      }
    });

  } catch (error) {

    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }

    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        message:
          'Ya existe una cuenta o cliente con esos datos'
      });
    }

    next(error);

  } finally {

    if (connection) {
      connection.release();
    }
  }
}