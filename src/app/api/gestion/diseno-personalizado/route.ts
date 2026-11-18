import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import connectDB from '@/app/lib/mongoose';
import DisenoPersonalizadoModel from '@/app/models/DisenoPersonalizado';
import UserModel from '@/app/models/User';

import { emailTransporter } from '@/app/lib/emails/transporter';
import { getNewDesignRequestAlertTemplate } from '@/app/lib/emails/templates/newDesignRequestAlert';

// ✅ POST: Cliente crea una nueva solicitud de diseño
export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token || !token.id) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();

    const {
      titulo, tipoProducto, descripcion, colores, textoDeseado,
      cantidad, fechaLimite, presupuestoEstimado, imagenesReferencia
    } = body;

    if (!titulo?.trim() || !tipoProducto || !descripcion?.trim()) {
      return NextResponse.json(
        { message: 'Título, tipo de producto y descripción son obligatorios.' },
        { status: 400 }
      );
    }

    // 👈 NUEVO SAAS: Extraer el tenantId del token
    const tenantId = (token as any).tenantId;

    // 👈 NUEVO SAAS: Verificar que el usuario exista y pertenezca a este tenant
    const usuario = await UserModel.findOne({ _id: token.id, tenantId });
    if (!usuario) {
      return NextResponse.json({ message: 'Usuario no encontrado o no pertenece a esta tienda' }, { status: 404 });
    }

    const nuevoDiseno = await DisenoPersonalizadoModel.create({
      tenantId, // 👈 NUEVO SAAS: Asignar el tenantId al diseño
      cliente: token.id,
      nombreCliente: `${usuario.name} ${usuario.lastName || ''}`.trim(),
      emailCliente: usuario.email,
      telefonoCliente: usuario.phone || '',
      titulo: titulo.trim(),
      tipoProducto,
      descripcion: descripcion.trim(),
      colores: colores?.trim() || '',
      textoDeseado: textoDeseado?.trim() || '',
      cantidad: Number(cantidad) || 1,
      fechaLimite: fechaLimite || null,
      presupuestoEstimado: presupuestoEstimado ? Number(presupuestoEstimado) : null,
      imagenesReferencia: imagenesReferencia || [],
      estado: 'pendiente',
      mensajes: [{
        autor: 'cliente',
        nombreAutor: usuario.name,
        contenido: descripcion.trim(),
        createdAt: new Date()
      }]
    });

    // 🚀 ENVIAR ALERTA POR EMAIL SOLO A LOS ADMINS DE ESTE TENANT
    try {
      const admins = await UserModel.find({ 
        tenantId, // 👈 NUEVO SAAS: Solo buscar admins de esta tienda específica
        role: { $in: ['admin', 'superadmin', 'vendedor'] } 
      }).select('email name');

      if (admins.length > 0) {
        const adminPanelUrl = process.env.NEXT_APP_URL || 'http://localhost:3000';
        const productTypeLabel = tipoProducto.replace('_', ' ').toUpperCase();

        const emailData = getNewDesignRequestAlertTemplate(
          nuevoDiseno.nombreCliente,
          productTypeLabel,
          nuevoDiseno.titulo,
          adminPanelUrl,
          nuevoDiseno._id.toString()
        );

        for (const admin of admins) {
          await emailTransporter.sendMail({
            from: `"${process.env.BRAND_NAME || 'EmprendeFácil'}" <${process.env.MAILER_EMAIL}>`,
            to: admin.email,
            subject: emailData.subject,
            html: emailData.html,
            text: emailData.text
          });
        }
        
        console.log(`✅ Alerta de nuevo diseño enviada a ${admins.length} administrador(es) del tenant ${tenantId}.`);
      }
    } catch (emailError) {
      console.error('⚠️ Error enviando alertas de nuevo diseño a admins:', emailError);
      // No fallamos la petición si el email falla, solo lo logueamos
    }

    return NextResponse.json({
      success: true,
      message: '¡Solicitud enviada! Te responderemos en menos de 24hs.',
      diseno: nuevoDiseno
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Error creando diseño personalizado:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}

// ✅ GET: Cliente lista SUS diseños (o Admin lista LOS DE SU TIENDA)
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    
    if (!token || !token.id) {
      return NextResponse.json({ message: 'No autorizado (Sesión inválida)' }, { status: 401 });
    }

    await connectDB();

    const tenantId = (token as any).tenantId;
    const role = token.role as string;
    const isSuperAdmin = role === 'superadmin';

    // 🎯 LA CLAVE: Aislamiento estricto por tenantId
    let query: any = {};
    
    if (isSuperAdmin) {
      query = {}; // Superadmin ve todos los diseños del sistema (para soporte global)
    } else if (['admin', 'vendedor'].includes(role)) {
      query = { tenantId }; // Admin/Vendedor ve todos los diseños de SU tienda
    } else {
      query = { cliente: token.id, tenantId }; // Usuario normal ve SOLO los suyos en SU tienda
    }

    const disenos = await DisenoPersonalizadoModel.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, disenos });

  } catch (error) {
    console.error('❌ Error listando diseños:', error);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}