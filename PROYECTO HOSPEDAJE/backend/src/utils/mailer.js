import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const smtpPort = Number(
  process.env.SMTP_PORT || 587
);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpPort === 465,

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export async function sendMail({
  to,
  subject,
  text,
  html
}) {
  if (!process.env.SMTP_HOST) {
    throw new Error(
      'SMTP_HOST no está configurado'
    );
  }

  if (!process.env.SMTP_USER) {
    throw new Error(
      'SMTP_USER no está configurado'
    );
  }

  if (!process.env.SMTP_PASS) {
    throw new Error(
      'SMTP_PASS no está configurado'
    );
  }

  const info = await transporter.sendMail({
    from: `"PAIE ROYALE" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html
  });

  console.log(
    `Correo enviado a ${to}. ID: ${info.messageId}`
  );

  return info;
}