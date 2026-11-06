import nodemailer from 'nodemailer';

function obtenerTransporter() {
  const host = String(process.env.SMTP_HOST || '').trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '');

  if (!host || !user || !pass) {
    const error = new Error(
      'SMTP no está configurado. Revisa SMTP_HOST, SMTP_PORT, SMTP_USER y SMTP_PASS en backend/.env.'
    );

    error.code = 'SMTP_NOT_CONFIGURED';

    throw error;
  }

  const secure =
    String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' ||
    port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    }
  });
}

function obtenerRemitente() {
  return (
    String(process.env.SMTP_FROM || '').trim() ||
    String(process.env.SMTP_USER || '').trim()
  );
}

function escaparHtml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


/* =========================================================
   RECUPERACIÓN DE CONTRASEÑA
========================================================= */

export async function enviarCorreoRecuperacion({
  destinatario,
  url
}) {
  const transporter = obtenerTransporter();
  const from = obtenerRemitente();

  if (!from) {
    const error = new Error(
      'SMTP_FROM o SMTP_USER debe estar configurado.'
    );

    error.code = 'SMTP_FROM_NOT_CONFIGURED';

    throw error;
  }

  await transporter.sendMail({
    from,
    to: destinatario,

    subject:
      'PAIE ROYALE - Recuperación de contraseña',

    text:
      `PAIE ROYALE\n\n` +
      `Recibimos una solicitud para restablecer tu contraseña.\n\n` +
      `Para continuar, abre el siguiente enlace:\n` +
      `${url}\n\n` +
      `IMPORTANTE: Este enlace es válido durante 30 minutos.\n\n` +
      `Si tú no solicitaste este cambio, puedes ignorar este mensaje.`,


    html: `
      <div
        style="
          margin:0;
          padding:30px 15px;
          background:#f2f2f2;
          font-family:Arial,Helvetica,sans-serif;
          color:#1b1b1b;
        "
      >

        <div
          style="
            max-width:620px;
            margin:0 auto;
            background:#ffffff;
            border-radius:12px;
            overflow:hidden;
            box-shadow:0 3px 12px rgba(0,0,0,0.10);
          "
        >

          <!-- ENCABEZADO -->
          <div
            style="
              background:#111111;
              padding:28px 25px;
              text-align:center;
            "
          >
            <div
              style="
                color:#ffffff;
                font-size:25px;
                font-weight:bold;
                letter-spacing:2px;
              "
            >
              PAIE ROYALE
            </div>
          </div>


          <!-- CONTENIDO -->
          <div
            style="
              padding:32px 30px;
            "
          >

            <p
              style="
                margin:0 0 18px 0;
                font-size:16px;
                line-height:1.6;
              "
            >
              Recibimos una solicitud para
              <strong>restablecer tu contraseña</strong>.
            </p>


            <p
              style="
                margin:0 0 25px 0;
                font-size:15px;
                line-height:1.6;
                color:#444444;
              "
            >
              Para crear una nueva contraseña,
              utiliza el siguiente botón:
            </p>


            <!-- BLOQUE PRINCIPAL -->
            <div
              style="
                background:#f8f8f8;
                border:2px solid #222222;
                border-radius:10px;
                padding:25px 20px;
                text-align:center;
                margin:25px 0;
              "
            >

              <a
                href="${url}"
                style="
                  display:inline-block;
                  padding:15px 28px;
                  background:#fff4d6;
                  color:#555555;
                  text-decoration:none;
                  border-radius:7px;
                  font-size:15px;
                  font-weight:bold;
                "
              >
                RESTABLECER CONTRASEÑA
              </a>

            </div>


            <!-- AVISO DE TIEMPO -->
            <p
              style="
                margin:25px 0 0 0;
                font-size:14px;
                line-height:1.6;
                color:#555555;
              "
            >
              <strong>IMPORTANTE:</strong>
              Este enlace es válido durante
              <strong>30 minutos</strong>.
            </p>


            <p
              style="
                margin:25px 0 0 0;
                font-size:14px;
                line-height:1.6;
                color:#555555;
              "
            >
              Si tú no solicitaste este cambio,
              puedes ignorar este mensaje.
              Tu contraseña actual no se modificará
              si no utilizas el enlace.
            </p>

          </div>


          <!-- PIE -->
          <div
            style="
              background:#f5f5f5;
              padding:18px 25px;
              text-align:center;
              border-top:1px solid #e1e1e1;
            "
          >
            <p
              style="
                margin:0;
                font-size:12px;
                color:#777777;
              "
            >
              Este mensaje fue enviado automáticamente
              por PAIE ROYALE.
            </p>
          </div>

        </div>

      </div>
    `
  });
}


/* =========================================================
   BIENVENIDA - CUENTA CREADA CON GOOGLE
========================================================= */

export async function enviarCorreoBienvenidaGoogle({
  destinatario,
  nombre,
  nombreUsuario,
  contrasena
}) {
  const transporter = obtenerTransporter();
  const from = obtenerRemitente();

  if (!from) {
    const error = new Error(
      'SMTP_FROM o SMTP_USER debe estar configurado.'
    );

    error.code = 'SMTP_FROM_NOT_CONFIGURED';

    throw error;
  }

  const nombreSeguro =
    escaparHtml(nombre);

  const usuarioSeguro =
    escaparHtml(nombreUsuario);

  const contrasenaSegura =
    escaparHtml(contrasena);

  await transporter.sendMail({
    from,
    to: destinatario,

    subject:
      'PAIE ROYALE - Tu cuenta ha sido creada',

    text:
      `PAIE ROYALE\n\n` +
      `Hola ${nombre},\n\n` +
      `Tu cuenta fue registrada.\n\n` +
      `Usuario: ${nombreUsuario}\n` +
      `Contraseña: ${contrasena}\n\n` +
      `Gracias por registrarte en PAIE ROYALE.`,


    html: `
      <div
        style="
          margin:0;
          padding:30px 15px;
          background:#f2f2f2;
          font-family:Arial,Helvetica,sans-serif;
          color:#1b1b1b;
        "
      >

        <div
          style="
            max-width:620px;
            margin:0 auto;
            background:#ffffff;
            border-radius:12px;
            overflow:hidden;
            box-shadow:0 3px 12px rgba(0,0,0,0.10);
          "
        >

          <!-- ENCABEZADO -->
          <div
            style="
              background:#111111;
              padding:28px 25px;
              text-align:center;
            "
          >
            <div
              style="
                color:#ffffff;
                font-size:25px;
                font-weight:bold;
                letter-spacing:2px;
              "
            >
              PAIE ROYALE
            </div>
          </div>


          <!-- CONTENIDO -->
          <div
            style="
              padding:32px 30px;
            "
          >

            <p
              style="
                margin:0 0 18px 0;
                font-size:16px;
                line-height:1.6;
              "
            >
              Hola
              <strong>${nombreSeguro}</strong>,
            </p>


            <p
              style="
                margin:0 0 18px 0;
                font-size:16px;
                line-height:1.6;
              "
            >
              Tu cuenta fue registrada.
            </p>


            <p
              style="
                margin:0 0 25px 0;
                font-size:15px;
                line-height:1.6;
                color:#444444;
              "
            >
              A continuación encontrarás tus
              <strong>datos de acceso</strong>.
            </p>


            <div
              style="
                background:#ffffff;
                border:2px solid #222222;
                border-radius:10px;
                padding:24px 22px;
                margin:25px 0;
              "
            >

              <div
                style="
                  font-size:18px;
                  font-weight:bold;
                  color:#111111;
                  margin-bottom:22px;
                  text-align:center;
                  letter-spacing:0.3px;
                "
              >
              </div>


              <!-- USUARIO -->
              <div
                style="
                  background:#f3f3f3;
                  border-radius:7px;
                  padding:15px;
                  margin-bottom:12px;
                "
              >

                <div
                  style="
                    font-size:12px;
                    font-weight:bold;
                    color:#666666;
                    text-transform:uppercase;
                    margin-bottom:6px;
                    letter-spacing:0.5px;
                  "
                >
                  Usuario
                </div>

                <div
                  style="
                    font-size:16px;
                    font-weight:bold;
                    color:#111111;
                    word-break:break-word;
                  "
                >
                  ${usuarioSeguro}
                </div>

              </div>


              <!-- CONTRASEÑA -->
              <div
                style="
                  background:#eeeeee;
                  border:2px solid #111111;
                  border-radius:7px;
                  padding:16px;
                "
              >

                <div
                  style="
                    font-size:12px;
                    font-weight:bold;
                    color:#555555;
                    text-transform:uppercase;
                    margin-bottom:7px;
                    letter-spacing:0.5px;
                  "
                >
                  Contraseña
                </div>

                <div
                  style="
                    font-size:20px;
                    font-weight:bold;
                    color:#111111;
                    letter-spacing:1px;
                    word-break:break-word;
                  "
                >
                  ${contrasenaSegura}
                </div>

              </div>

            </div>



            <p
              style="
                margin:25px 0 0 0;
                font-size:14px;
                line-height:1.6;
                color:#555555;
              "
            >
              Puedes utilizar estos datos para iniciar
              sesión posteriormente en PAIE ROYALE.
            </p>

          </div>


          <!-- PIE -->
          <div
            style="
              background:#f5f5f5;
              padding:18px 25px;
              text-align:center;
              border-top:1px solid #e1e1e1;
            "
          >

            <p
              style="
                margin:0 0 6px 0;
                font-size:13px;
                font-weight:bold;
                color:#444444;
              "
            >
              Gracias por registrarte en PAIE ROYALE.
            </p>

            <p
              style="
                margin:0;
                font-size:12px;
                color:#777777;
              "
            >
              Este mensaje fue enviado automáticamente
              por PAIE ROYALE.
            </p>

          </div>

        </div>

      </div>
    `
  });
}


/* =========================================================
   VERIFICAR SMTP
========================================================= */

export async function verificarCorreoSMTP() {
  const transporter = obtenerTransporter();

  await transporter.verify();

  return true;
}

/* =========================================================
   BIENVENIDA - CUENTA CREADA MANUALMENTE / ADMINISTRADOR
========================================================= */

export async function enviarCorreoBienvenida({
  destinatario,
  nombre,
  nombreUsuario,
  contrasena
}) {
  const transporter = obtenerTransporter();
  const from = obtenerRemitente();

  if (!from) {
    const error = new Error(
      'SMTP_FROM o SMTP_USER debe estar configurado.'
    );
    error.code = 'SMTP_FROM_NOT_CONFIGURED';
    throw error;
  }

  const nombreSeguro = escaparHtml(nombre || 'Usuario');
  const usuarioSeguro = escaparHtml(nombreUsuario || '');
  const contrasenaSegura = escaparHtml(contrasena || '');

  await transporter.sendMail({
    from,
    to: destinatario,
    subject: 'PAIE ROYALE - Bienvenido a tu cuenta',
    text:
      `PAIE ROYALE\n\n` +
      `Hola ${nombre || 'Usuario'},\n\n` +
      `Tu cuenta fue registrada.\n\n` +
      `Usuario: ${nombreUsuario || '—'}\n` +
      `Contraseña: ${contrasena || '—'}\n\n` +
      `Puedes ingresar con el correo y la contraseña que registraste.\n\n` +
      `Gracias por formar parte de PAIE ROYALE.`,
    html: `
      <div
        style="
          margin:0;
          padding:30px 15px;
          background:#f2f2f2;
          font-family:Arial,Helvetica,sans-serif;
          color:#1b1b1b;
        "
      >
        <div
          style="
            max-width:620px;
            margin:0 auto;
            background:#ffffff;
            border-radius:12px;
            overflow:hidden;
            box-shadow:0 3px 12px rgba(0,0,0,0.10);
          "
        >
          <div
            style="
              background:#111111;
              padding:28px 25px;
              text-align:center;
            "
          >
            <div
              style="
                color:#ffffff;
                font-size:25px;
                font-weight:bold;
                letter-spacing:2px;
              "
            >
              PAIE ROYALE
            </div>
          </div>

          <div style="padding:32px 30px;">
            <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">
              Hola <strong>${nombreSeguro}</strong>,
            </p>

            <p style="margin:0 0 25px;font-size:16px;line-height:1.6;">
              Tu cuenta fue registrada.
            </p>

            <div
              style="
                background:#ffffff;
                border:2px solid #222222;
                border-radius:10px;
                padding:24px 22px;
                margin:25px 0;
              "
            >
              <div
                style="
                  background:#f3f3f3;
                  border-radius:7px;
                  padding:15px;
                  margin-bottom:12px;
                "
              >
                <div style="font-size:12px;font-weight:bold;color:#666666;text-transform:uppercase;margin-bottom:6px;letter-spacing:0.5px;">
                  Usuario
                </div>
                <div style="font-size:16px;font-weight:bold;color:#111111;word-break:break-word;">
                  ${usuarioSeguro}
                </div>
              </div>

              <div
                style="
                  background:#eeeeee;
                  border:2px solid #111111;
                  border-radius:7px;
                  padding:16px;
                "
              >
                <div style="font-size:12px;font-weight:bold;color:#555555;text-transform:uppercase;margin-bottom:7px;letter-spacing:0.5px;">
                  Contraseña
                </div>
                <div style="font-size:20px;font-weight:bold;color:#111111;letter-spacing:1px;word-break:break-word;">
                  ${contrasenaSegura}
                </div>
              </div>
            </div>

            <p style="margin:25px 0 0;font-size:14px;line-height:1.6;color:#555555;">
              Puedes ingresar con el correo y la contraseña que registraste.
            </p>
          </div>

          <div
            style="
              background:#f5f5f5;
              padding:18px 25px;
              text-align:center;
              border-top:1px solid #e1e1e1;
            "
          >
            <p style="margin:0 0 6px;font-size:13px;font-weight:bold;color:#444444;">
              Gracias por registrarte en PAIE ROYALE.
            </p>
            <p style="margin:0;font-size:12px;color:#777777;">
              Este mensaje fue enviado automáticamente por PAIE ROYALE.
            </p>
          </div>
        </div>
      </div>
    `
  });
}

/* =========================================================
   NOTIFICACIÓN - CUENTA DESACTIVADA / ELIMINADA
========================================================= */

export async function enviarCorreoEliminacionCuenta({
  destinatario,
  nombre
}) {
  const transporter = obtenerTransporter();
  const from = obtenerRemitente();

  if (!from) {
    const error = new Error(
      'SMTP_FROM o SMTP_USER debe estar configurado.'
    );
    error.code = 'SMTP_FROM_NOT_CONFIGURED';
    throw error;
  }

  const nombreSeguro = escaparHtml(nombre || 'Usuario');

  await transporter.sendMail({
    from,
    to: destinatario,
    subject: 'PAIE ROYALE - Cuenta eliminada',
    text:
      `PAIE ROYALE\n\n` +
      `Hola ${nombre || 'Usuario'},\n\n` +
      `Tu cuenta de PAIE ROYALE ha sido eliminada y ya no podrás iniciar sesión con ella.\n\n` +
      `Si consideras que esto ocurrió por error, comunícate con la administración del hotel.`,
    html: `
      <div style="margin:0;padding:30px 15px;background:#f2f2f2;font-family:Arial,Helvetica,sans-serif;color:#1b1b1b;">
        <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 3px 12px rgba(0,0,0,0.10);">
          <div style="background:#111111;padding:28px 25px;text-align:center;">
            <div style="color:#ffffff;font-size:25px;font-weight:bold;letter-spacing:2px;">PAIE ROYALE</div>
          </div>
          <div style="padding:32px 30px;">
            <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">Hola ${nombreSeguro},</p>
            <p style="margin:0;font-size:14px;line-height:1.7;color:#555;">Tu cuenta de PAIE ROYALE ha sido eliminada y ya no podrás iniciar sesión con ella.</p>
            <p style="margin:20px 0 0;font-size:14px;line-height:1.7;color:#555;">Si consideras que esto ocurrió por error, comunícate con la administración del hotel.</p>
          </div>
          <div style="background:#f5f5f5;padding:18px 25px;text-align:center;border-top:1px solid #e1e1e1;">
            <p style="margin:0;font-size:12px;color:#777;">Este mensaje fue enviado automáticamente por PAIE ROYALE.</p>
          </div>
        </div>
      </div>
    `
  });
}

/* =========================================================
   NOTIFICACIONES DE RESERVA
========================================================= */

function formatearFechaCorreo(valor) {
  if (!valor) return 'No especificada';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return String(valor);
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'long'
  }).format(fecha);
}

function formatearMonedaCorreo(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return 'No especificado';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(numero);
}

function construirListaHtml(items, formatter) {
  return items.map(item => `
    <li style="margin:0 0 8px;color:#333;line-height:1.5;">
      ${formatter(item)}
    </li>
  `).join('');
}

function bloqueDatosReservaHtml(resumen, { mostrarPago = true } = {}) {
  const habitaciones = Array.isArray(resumen.habitaciones)
    ? resumen.habitaciones
    : [];
  const servicios = Array.isArray(resumen.servicios)
    ? resumen.servicios
    : [];
  const paquetes = Array.isArray(resumen.paquetes)
    ? resumen.paquetes
    : [];

  const seccion = (titulo, contenido) => `
    <div style="margin-top:22px;">
      <div style="font-size:13px;font-weight:bold;letter-spacing:.4px;text-transform:uppercase;color:#8a6b19;margin-bottom:8px;">
        ${titulo}
      </div>
      <div style="background:#f8f8f8;border:1px solid #e5e5e5;border-radius:10px;padding:14px 16px;">
        ${contenido}
      </div>
    </div>
  `;

  let html = `
    <div style="background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:20px;">
      <div style="font-size:18px;font-weight:bold;color:#111;margin-bottom:14px;">
        Información de la reserva
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 20px;">
        <div><strong>Cliente:</strong><br>${escaparHtml(resumen.cliente_nombre)}</div>
        <div><strong>Confirmación:</strong><br>${escaparHtml(resumen.numero_confirmacion || '—')}</div>
        <div><strong>Fecha de entrada:</strong><br>${escaparHtml(formatearFechaCorreo(resumen.fecha_inicio))}</div>
        <div><strong>Fecha de salida:</strong><br>${escaparHtml(formatearFechaCorreo(resumen.fecha_fin))}</div>
        ${Number(resumen.numero_personas || 0) > 0 ? `<div><strong>Huéspedes:</strong><br>${Number(resumen.numero_personas)}</div>` : ''}
      </div>
    </div>
  `;

  if (habitaciones.length) {
    html += seccion(
      'Habitación',
      `<ul style="margin:0;padding-left:20px;">${construirListaHtml(habitaciones, item => `Habitación ${escaparHtml(item)}`)}</ul>`
    );
  }

  if (servicios.length) {
    html += seccion(
      'Servicios',
      `<ul style="margin:0;padding-left:20px;">${construirListaHtml(servicios, item => `${escaparHtml(item.nombre)}${Number(item.cantidad || 1) > 1 ? ` — cantidad: ${Number(item.cantidad)}` : ''}`)}</ul>`
    );
  }

  if (paquetes.length) {
    html += seccion(
      'Paquetes',
      `<ul style="margin:0;padding-left:20px;">${construirListaHtml(paquetes, item => `${escaparHtml(item.nombre)}${Number(item.cantidad || 1) > 1 ? ` — cantidad: ${Number(item.cantidad)}` : ''}`)}</ul>`
    );
  }

  if (mostrarPago && resumen.pago) {
    const total = Number(resumen.valor_total || 0);
    const pagado = Number(resumen.pago.total_confirmado ?? 0);
    const saldo = Math.max(0, total - pagado);
    const estado = String(resumen.pago.estado || '').toLowerCase() === 'confirmado'
      ? (saldo <= 0.01 ? 'Pago total aprobado' : 'Pago registrado')
      : String(resumen.pago.estado || '').toLowerCase() === 'rechazado'
        ? 'Pago rechazado'
        : 'Pago pendiente de verificación';

    html += seccion('Pago', `
      <div style="font-size:14px;line-height:1.8;color:#333;">
        <div><strong>Estado:</strong> ${escaparHtml(estado)}</div>
        <div><strong>Total de la reserva:</strong> ${escaparHtml(formatearMonedaCorreo(total))}</div>
        <div><strong>Valor pagado confirmado:</strong> ${escaparHtml(formatearMonedaCorreo(pagado))}</div>
        <div><strong>Saldo pendiente:</strong> ${escaparHtml(formatearMonedaCorreo(saldo))}</div>
        <div><strong>Método:</strong> ${escaparHtml(resumen.pago.metodo || 'No especificado')}</div>
      </div>
    `);
  }

  return html;
}

function plantillaBaseReserva({ saludo, introduccion, cuerpo, despedida }) {
  return `
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      @media only screen and (max-width: 600px) {
        .paie-email-outer { padding: 12px 8px !important; }
        .paie-email-card { width: 100% !important; border-radius: 10px !important; }
        .paie-email-content { padding: 22px 16px !important; }
        .paie-email-header { padding: 22px 14px !important; font-size: 21px !important; }
        .paie-email-footer { padding: 16px 12px !important; }
      }
    </style>
    <div class="paie-email-outer" style="margin:0;padding:30px 15px;background:#f2f2f2;font-family:Arial,Helvetica,sans-serif;color:#1b1b1b;box-sizing:border-box;width:100%;">
      <div class="paie-email-card" style="width:100%;max-width:650px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 3px 12px rgba(0,0,0,.10);box-sizing:border-box;">
        <div class="paie-email-header" style="background:#111;padding:28px 25px;text-align:center;">
          <div style="color:#fff;font-size:25px;font-weight:bold;letter-spacing:2px;">PAIE ROYALE</div>
        </div>
        <div class="paie-email-content" style="padding:32px 30px;box-sizing:border-box;overflow-wrap:anywhere;">
          <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">${saludo}</p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#444;">${introduccion}</p>
          ${cuerpo}
          <p style="margin:26px 0 0;font-size:14px;line-height:1.7;color:#555;">${despedida}</p>
        </div>
        <div class="paie-email-footer" style="background:#f5f5f5;padding:18px 25px;text-align:center;border-top:1px solid #e1e1e1;">
          <p style="margin:0;font-size:12px;color:#777;">Este mensaje fue enviado automáticamente por PAIE ROYALE.</p>
        </div>
      </div>
    </div>
  `;
}

export async function enviarCorreoReservaRegistrada(resumen) {
  if (!resumen?.cliente_correo) return;
  const transporter = obtenerTransporter();
  const from = obtenerRemitente();
  if (!from) throw new Error('SMTP_FROM o SMTP_USER debe estar configurado.');
  const nombre = escaparHtml(resumen.cliente_nombre || 'Cliente');
  const total = Number(resumen.valor_total || 0);
  const fechaEntrada = formatearFechaCorreo(resumen.fecha_inicio);
  const fechaSalida = formatearFechaCorreo(resumen.fecha_fin);
  const cuerpo = bloqueDatosReservaHtml(resumen, { mostrarPago: false });
  await transporter.sendMail({
    from,
    to: resumen.cliente_correo,
    subject: `PAIE ROYALE - Reserva registrada · ${resumen.numero_confirmacion || ''}`.trim(),
    text:
      `PAIE ROYALE\n\n` +
      `Hola ${resumen.cliente_nombre || 'Cliente'},\n\n` +
      `Tu reserva fue registrada y está pendiente de pago. Todavía no se encuentra confirmada.\n\n` +
      `Código de reserva: ${resumen.numero_confirmacion || '—'}\n` +
      `Entrada: ${fechaEntrada}\n` +
      `Salida: ${fechaSalida}\n` +
      `Huéspedes: ${Number(resumen.numero_personas || 0) || '—'}\n` +
      `Total a pagar (100 %): ${formatearMonedaCorreo(total)}\n\n` +
      `Continúa en el módulo Pagos para completar el pago.`,
    html: plantillaBaseReserva({
      saludo: `Hola <strong>${nombre}</strong>,`,
      introduccion: 'Tu reserva fue registrada correctamente. Está pendiente de pago y todavía no se encuentra confirmada.',
      cuerpo: `${cuerpo}<div style="margin-top:20px;padding:16px;border-radius:10px;background:#f8f8f8;border:1px solid #e5e5e5;"><strong>Total a pagar (100 %):</strong> ${escaparHtml(formatearMonedaCorreo(total))}<br><span style="color:#666;font-size:13px;">Completa el pago desde el módulo Pagos.</span></div>`,
      despedida: 'Te enviaremos la confirmación y el comprobante PDF cuando el pago haya sido aprobado.'
    })
  });
}

export async function enviarCorreoConfirmacionReserva(resumen, pdfPath = null) {
  const transporter = obtenerTransporter();
  const from = obtenerRemitente();
  if (!from) throw new Error('SMTP_FROM o SMTP_USER debe estar configurado.');

  const nombre = resumen.cliente_nombre || 'Cliente';
  const fecha = (valor) => {
    if (!valor) return '—';
    const date = new Date(valor);
    return Number.isNaN(date.getTime())
      ? String(valor)
      : new Intl.DateTimeFormat('es-CO').format(date);
  };
  const moneda = formatearMonedaCorreo;
  const habitaciones = Array.isArray(resumen.habitaciones) && resumen.habitaciones.length
    ? resumen.habitaciones.join(', ')
    : '—';
  const metodo = String(resumen.pago?.metodo || '—').toLowerCase();
  const total = Number(resumen.valor_total || 0);
  const pagado = Number(resumen.pago?.total_confirmado || 0);

  const bloques = [
    ['INFORMACIÓN DE LA RESERVA', [
      ['Cliente', nombre],
      ['Código de reserva', resumen.numero_confirmacion || '—'],
      ['Fecha de entrada', fecha(resumen.fecha_inicio)],
      ['Fecha de salida', fecha(resumen.fecha_fin)],
      ['Huéspedes', Number(resumen.numero_personas || 0) || '—']
    ]],
    ...(Array.isArray(resumen.habitaciones) && resumen.habitaciones.length
      ? [['HABITACIÓN', [['Habitación', habitaciones]]]]
      : []),
    ['PAGO', [
      ['Estado', 'Aprobado'],
      ['Total de la reserva', moneda(total)],
      ['Valor pagado confirmado', moneda(pagado)],
      ['Método', metodo]
    ]]
  ];

  const htmlBloques = bloques.map(([titulo, campos]) => `
    <section class="paie-confirm-section" style="margin-top:22px;">
      <h3 style="margin:0 0 10px;font-size:14px;letter-spacing:.3px;color:#8a6b19;">${titulo}</h3>
      <div style="border:1px solid #e5e5e5;border-radius:9px;padding:14px 16px;background:#fff;overflow-wrap:anywhere;">
        ${campos.map(([etiqueta, valor]) => `<div style="margin:0 0 8px;line-height:1.5;color:#333;"><strong>${etiqueta}:</strong> ${escaparHtml(valor)}</div>`).join('')}
      </div>
    </section>
  `).join('');

  const html = `
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      @media only screen and (max-width: 600px) {
        .paie-confirm-outer { padding: 12px 8px !important; }
        .paie-confirm-card { width: 100% !important; border-radius: 10px !important; }
        .paie-confirm-header { padding: 21px 14px !important; font-size: 21px !important; }
        .paie-confirm-content { padding: 20px 15px !important; }
        .paie-confirm-section { padding: 12px !important; }
      }
    </style>
    <div class="paie-confirm-outer" style="margin:0;padding:26px 14px;background:#f2f2f2;font-family:Arial,Helvetica,sans-serif;color:#1b1b1b;box-sizing:border-box;width:100%;">
      <div class="paie-confirm-card" style="width:100%;max-width:620px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-sizing:border-box;">
        <header class="paie-confirm-header" style="background:#111;padding:25px;text-align:center;color:#fff;font-size:24px;font-weight:bold;letter-spacing:2px;">PAIE ROYALE</header>
        <main class="paie-confirm-content" style="padding:26px 28px;box-sizing:border-box;overflow-wrap:anywhere;">
          <p style="margin:0 0 18px;font-size:16px;">Hola, <strong>${escaparHtml(nombre)}</strong>.</p>
          ${htmlBloques}
        </main>
      </div>
    </div>
  `;

  const text = [
    'PAIE ROYALE',
    '',
    `Hola, ${nombre}.`,
    '',
    ...bloques.flatMap(([titulo, campos]) => [titulo, ...campos.map(([etiqueta, valor]) => `${etiqueta}: ${valor}`), ''])
  ].join('\n');

  await transporter.sendMail({
    from,
    to: resumen.cliente_correo,
    subject: `PAIE ROYALE - Reserva ${resumen.numero_confirmacion || ''} confirmada`.trim(),
    text,
    attachments: pdfPath ? [{ filename: 'Comprobante-PAIE-ROYALE.pdf', path: pdfPath, contentType: 'application/pdf' }] : [],
    html
  });
}

export async function enviarCorreoPagoPendiente(resumen) {
  if (!resumen?.cliente_correo) return;
  const transporter = obtenerTransporter();
  const from = obtenerRemitente();
  if (!from) throw new Error('SMTP_FROM o SMTP_USER debe estar configurado.');

  const nombre = escaparHtml(resumen.cliente_nombre || 'Cliente');
  const total = Number(resumen.valor_total || 0);
  const pagadoConfirmado = Number(resumen.pago?.total_confirmado || 0);
  const valorPendiente = Math.max(0, total - pagadoConfirmado);
  const cuerpo = bloqueDatosReservaHtml(resumen, { mostrarPago: true });

  await transporter.sendMail({
    from,
    to: resumen.cliente_correo,
    subject: `PAIE ROYALE - Pago pendiente de verificación · Reserva ${resumen.numero_confirmacion || ''}`.trim(),
    text:
      `PAIE ROYALE\n\n` +
      `Hola ${resumen.cliente_nombre || 'Cliente'},\n\n` +
      `Recibimos tu solicitud de pago para la reserva ${resumen.numero_confirmacion || ''}.\n` +
      `El pago queda pendiente de verificación.\n\n` +
      `Total de la reserva: ${formatearMonedaCorreo(total)}\n` +
      `Valor que debes pagar: ${formatearMonedaCorreo(valorPendiente)} (100 % del saldo pendiente)\n` +
      `Método de pago: ${resumen.pago?.metodo || '—'}\n`,
    html: plantillaBaseReserva({
      saludo: `Hola <strong>${nombre}</strong>,`,
      introduccion: 'Recibimos tu pago. Por ahora se encuentra pendiente de verificación y todavía no debe considerarse como un pago aprobado.',
      cuerpo,
      despedida: 'Te enviaremos una notificación cuando el administrador verifique el pago. La reserva no se considera confirmada hasta su aprobación.'
    })
  });
}

export async function enviarCorreoPagoRechazado(resumen, pdfPath = null) {
  if (!resumen?.cliente_correo) return;
  const transporter = obtenerTransporter();
  const from = obtenerRemitente();
  if (!from) throw new Error('SMTP_FROM o SMTP_USER debe estar configurado.');

  const nombre = escaparHtml(resumen.cliente_nombre || 'Cliente');
  const cuerpo = bloqueDatosReservaHtml(resumen, { mostrarPago: false });
  const bloqueada = Number(resumen.intentos_rechazados || 0) >= 3;
  const mensajeIntento = bloqueada
    ? 'La reserva alcanzó el límite de 3 pagos rechazados y no admite nuevos intentos de pago.'
    : 'Puedes intentar nuevamente con un medio de pago válido.';

  await transporter.sendMail({
    from,
    to: resumen.cliente_correo,
    subject: `PAIE ROYALE - Pago rechazado · Reserva ${resumen.numero_confirmacion || ''}`.trim(),
    text:
      `PAIE ROYALE\n\n` +
      `Hola ${resumen.cliente_nombre || 'Cliente'},\n\n` +
      `El pago asociado a la reserva ${resumen.numero_confirmacion || ''} fue rechazado.\n` +
      `Motivo: ${resumen.pago?.observaciones || 'El pago no pudo ser verificado.'}\n` +
      `${mensajeIntento}\n`,
    attachments: pdfPath ? [{ filename: 'Comprobante-pago-rechazado-PAIE-ROYALE.pdf', path: pdfPath, contentType: 'application/pdf' }] : [],
    html: plantillaBaseReserva({
      saludo: `Hola <strong>${nombre}</strong>,`,
      introduccion: 'El pago asociado a tu reserva fue rechazado y no se considera un pago aprobado.',
      cuerpo,
      despedida: `${resumen.pago?.observaciones ? `Motivo: ${escaparHtml(resumen.pago.observaciones)}. ` : ''}${escaparHtml(mensajeIntento)}`
    })
  });
}

export async function enviarCorreoCancelacionReserva(resumen) {
  if (!resumen?.cliente_correo) return;
  const transporter = obtenerTransporter();
  const from = obtenerRemitente();
  if (!from) throw new Error('SMTP_FROM o SMTP_USER debe estar configurado.');

  const nombre = escaparHtml(resumen.cliente_nombre || 'Cliente');

  await transporter.sendMail({
    from,
    to: resumen.cliente_correo,
    subject: 'PAIE ROYALE - Reserva cancelada',
    text:
      `PAIE ROYALE\n\n` +
      `Hola ${resumen.cliente_nombre || 'Cliente'},\n\n` +
      `Te informamos que lo que reservaste en PAIE ROYALE fue cancelado.\n\n` +
      `Saludos,\nPAIE ROYALE`,
    html: plantillaBaseReserva({
      saludo: `Hola <strong>${nombre}</strong>,`,
      introduccion: 'Te informamos que lo que reservaste en PAIE ROYALE fue cancelado.',
      cuerpo: '',
      despedida: 'Saludos, PAIE ROYALE.'
    })
  });
}

export async function enviarCorreoEliminacionReserva(resumen) {
  if (!resumen?.cliente_correo) return;
  const transporter = obtenerTransporter();
  const from = obtenerRemitente();
  if (!from) throw new Error('SMTP_FROM o SMTP_USER debe estar configurado.');

  const nombre = resumen.cliente_nombre || 'Cliente';
  const nombreHtml = escaparHtml(nombre);
  await transporter.sendMail({
    from,
    to: resumen.cliente_correo,
    subject: 'PAIE ROYALE - Reserva eliminada',
    text:
      `PAIE ROYALE\n\n` +
      `Hola, ${nombre}.\n\n` +
      `Te informamos que tu reserva en PAIE ROYALE fue eliminada.\n\n` +
      `Saludos, PAIE ROYALE.`,
    html: `
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @media only screen and (max-width: 600px) {
          .paie-delete-outer { padding: 12px 8px !important; }
          .paie-delete-card { width: 100% !important; border-radius: 10px !important; }
          .paie-delete-header { padding: 21px 14px !important; font-size: 21px !important; }
          .paie-delete-content { padding: 20px 15px !important; }
        }
      </style>
      <div class="paie-delete-outer" style="margin:0;padding:26px 14px;background:#f2f2f2;font-family:Arial,Helvetica,sans-serif;color:#1b1b1b;box-sizing:border-box;width:100%;">
        <div class="paie-delete-card" style="width:100%;max-width:620px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-sizing:border-box;">
          <header class="paie-delete-header" style="background:#111;padding:25px;text-align:center;color:#fff;font-size:24px;font-weight:bold;letter-spacing:2px;">PAIE ROYALE</header>
          <main class="paie-delete-content" style="padding:28px;line-height:1.7;font-size:15px;box-sizing:border-box;overflow-wrap:anywhere;">
            <p>Hola, <strong>${nombreHtml}</strong>.</p>
            <p>Te informamos que tu reserva en PAIE ROYALE fue eliminada.</p>
            <p>Saludos, PAIE ROYALE.</p>
          </main>
        </div>
      </div>
    `
  });
}
