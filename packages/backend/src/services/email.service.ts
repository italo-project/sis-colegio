import { Resend } from 'resend';
import { env } from '../config/env';

const resend = new Resend(env.RESEND_API_KEY);

type SendPasswordResetEmailParams = {
  to: string;
  fullName: string;
  resetUrl: string;
};

export const sendPasswordResetEmail = async ({
  to,
  fullName,
  resetUrl,
}: SendPasswordResetEmailParams) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Recuperar contraseña</title>
      </head>
      <body style="font-family: system-ui, -apple-system, sans-serif; background: #f9fafb; padding: 40px 20px;">
        <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px;">
          <h1 style="color: #111827; margin: 0 0 16px;">Recuperar contraseña</h1>
          
          <p style="color: #4b5563; line-height: 1.6;">
            Hola <strong>${fullName}</strong>,
          </p>
          
          <p style="color: #4b5563; line-height: 1.6;">
            Recibimos una solicitud para recuperar tu contraseña en el Sistema de Colegios.
            Haz clic en el botón de abajo para crear una nueva.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              Crear nueva contraseña
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 13px; line-height: 1.6;">
            Este enlace expira en <strong>30 minutos</strong>.
            Si no solicitaste el cambio, ignora este mensaje.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          
          <p style="color: #9ca3af; font-size: 12px;">
            Si el botón no funciona, copia este link en tu navegador:<br>
            <span style="word-break: break-all;">${resetUrl}</span>
          </p>
        </div>
      </body>
    </html>
  `;

  const { error } = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: [to],
    subject: 'Recuperar contraseña - Sistema Colegios',
    html,
  });

  if (error) {
    throw new Error(`Error al enviar email: ${error.message}`);
  }
};