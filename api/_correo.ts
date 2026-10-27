import nodemailer from 'nodemailer';

export interface EnviarCorreoParams {
  para: string;
  asunto: string;
  texto: string;
  html?: string;
}

export async function enviarCorreo({ para, asunto, texto, html }: EnviarCorreoParams): Promise<any> {
  const host = process.env.SMTP_HOST;
  const portStr = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !portStr || !user || !pass || !from) {
    throw new Error('FATAL: Configuración SMTP incompleta (se requieren SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM).');
  }

  const port = parseInt(portStr, 10);
  if (Number.isNaN(port)) {
    throw new Error('FATAL: SMTP_PORT debe ser un número entero válido.');
  }

  const isPort465 = port === 465;
  const isPort587 = port === 587;

  if (!isPort465 && !isPort587) {
    throw new Error(`FATAL: Puerto SMTP no permitido (${port}). Se exige puerto 465 o 587 con TLS obligatorio.`);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: isPort465,
    requireTLS: isPort587,
    auth: {
      user,
      pass,
    },
  });

  return await transporter.sendMail({
    from,
    to: para,
    subject: asunto,
    text: texto,
    ...(html ? { html } : {}),
  });
}
