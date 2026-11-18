import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import connectDB from '@/app/lib/mongoose';
import User from '@/app/models/User';

// Configuración de Nodemailer (Reutilizando tus variables seguras)
const transporter = nodemailer.createTransport({
  service: process.env.MAILER_SERVICE || 'gmail',
  host: process.env.MAILER_HOST,
  port: parseInt(process.env.MAILER_PORT || '587'),
  secure: process.env.MAILER_SECURE === 'true',
  auth: {
    user: process.env.MAILER_EMAIL,
    pass: process.env.MAILER_SECRET_KEY,
  },
});

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    
    // El frontend debería enviar el email y, idealmente, el host actual para personalizar el correo
    const { email, host } = body; 

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Correo electrónico inválido.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. 🔒 BUSCAR USUARIO: Buscamos por email. 
    // En un SaaS estricto, podríamos exigir también el tenantId, pero para recuperación 
    // es aceptable buscar por email, siempre que el token posterior esté vinculado a ese user.
    const user = await User.findOne({ email: normalizedEmail });

    // 2. 🛡️ ANTI-ENUMERACIÓN: 
    // SIEMPRE devolvemos el mismo mensaje de éxito, exista o no el usuario.
    // Esto evita que los atacantes sepan qué correos están registrados en tu SaaS.
    const successResponse = NextResponse.json(
      { 
        success: true, 
        message: 'Si el correo está registrado en nuestro sistema, recibirás un enlace de recuperación en breve.' 
      },
      { status: 200 }
    );

    if (!user) {
      // Simulamos un pequeño retraso para que el tiempo de respuesta no delate si existe o no
      await new Promise(resolve => setTimeout(resolve, 500));
      return successResponse;
    }

    // 3. 🎟️ GENERAR Y GUARDAR TOKEN
    const token = crypto.randomBytes(32).toString('hex');
    const expirationTime = Date.now() + 3600000; // 1 hora de expiración

    await User.findByIdAndUpdate(user._id, {
      resetPasswordToken: token,
      resetPasswordExpires: expirationTime,
    });

    // 4. 🔗 CONSTRUIR ENLACE
    // Usamos el host que nos pasó el frontend, o un fallback global
    const baseUrl = host ? `https://${host}` : (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_APP_URL || 'http://localhost:3000');
    const resetLink = `${baseUrl}/change-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

    // Determinamos el nombre de la marca para el correo
    const brandName = process.env.BRAND_NAME || 'EmprendeFácil';

    // 5. 📧 ENVIAR CORREO
    const mailOptions = {
      from: `"${brandName}" <${process.env.MAILER_EMAIL}>`,
      to: normalizedEmail,
      subject: `🔒 Recuperación de Contraseña - ${brandName}`,
      text: `Hola,\n\nHas solicitado restablecer tu contraseña.\n\nHaz clic en el siguiente enlace para crear una nueva contraseña (válido por 1 hora):\n${resetLink}\n\nSi no solicitaste esto, ignora este correo.\n\nSaludos,\nEl equipo de ${brandName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #3D2B1F;">🔒 Recuperación de Contraseña</h2>
          <p>Hola,</p>
          <p>Has solicitado restablecer tu contraseña en <strong>${brandName}</strong>.</p>
          <p>Haz clic en el siguiente botón para crear una nueva contraseña (este enlace es válido por <strong>1 hora</strong>):</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #3D2B1F; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Restablecer Contraseña</a>
          </div>
          <p style="color: #64748b; font-size: 14px;">Si no solicitaste este cambio, puedes ignorar este correo de forma segura. Tu contraseña no cambiará.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">Enviado por ${brandName}</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Correo de recuperación enviado a: ${normalizedEmail}`);

    return successResponse;

  } catch (error) {
    console.error('❌ Error en reset-password:', error);
    return NextResponse.json(
      { success: false, message: 'Ocurrió un error al procesar tu solicitud. Inténtalo de nuevo más tarde.' },
      { status: 500 }
    );
  }
}