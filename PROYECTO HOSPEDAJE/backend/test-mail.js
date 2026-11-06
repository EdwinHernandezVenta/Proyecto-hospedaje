import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const port = Number(process.env.SMTP_PORT || 587);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure: port === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

try {
  await transporter.verify();

  console.log('SMTP conectado correctamente.');

  const info = await transporter.sendMail({
    from: `"PAIE ROYALE" <${process.env.SMTP_USER}>`,
    to: process.env.SMTP_USER,
    subject: 'Prueba de correo - PAIE ROYALE',
    text: 'Este es un correo de prueba enviado desde PAIE ROYALE.'
  });

  console.log('Correo enviado correctamente.');
  console.log(`ID: ${info.messageId}`);
} catch (error) {
  console.error('ERROR AL ENVIAR EL CORREO:');
  console.error(error.message);
}