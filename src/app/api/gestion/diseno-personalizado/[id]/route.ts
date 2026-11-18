import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import connectDB from '@/app/lib/mongoose';
import DisenoPersonalizadoModel from '@/app/models/DisenoPersonalizado';
import UserModel from '@/app/models/User';

// ✅ GET: Obtener detalle de un diseño (cliente o admin)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getToken({ req });
    if (!token || !token.id) {
      return NextResponse.json({ message: 'No autorizado (Sesión inválida)' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    
    // 👈 NUEVO SAAS: Extraer tenantId y rol
    const tenantId = (token as any).tenantId;
    const role = token.role as string;
    const isClient = role === 'user' || role === 'cliente';

    // 🎯 LA CLAVE: La consulta SIEMPRE debe incluir tenantId.
    // Si es cliente, además exigimos que el campo 'cliente' coincida con su ID.
    const query: any = { _id: id, tenantId };
    if (isClient) {
      query.cliente = token.id;
    }

    const diseno = await DisenoPersonalizadoModel.findOne(query).lean() as any;

    if (!diseno) {
      return NextResponse.json({ message: 'Diseño no encontrado o no tienes permiso para verlo' }, { status: 404 });
    }

    return NextResponse.json({ success: true, diseno });
  } catch (error) {
    console.error('❌ Error obteniendo diseño:', error);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}

// ✅ PUT: Admin actualiza estado o envía mensaje
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getToken({ req });
    if (!token || !['admin', 'superadmin', 'vendedor'].includes(token.role as string)) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const { estado, mensaje, imagenMensaje } = body;

    const tenantId = (token as any).tenantId;

    // 👈 NUEVO SAAS 1: Buscar el diseño SOLO si pertenece a este tenant
    const diseno = await DisenoPersonalizadoModel.findOne({ _id: id, tenantId });
    if (!diseno) {
      return NextResponse.json({ message: 'Diseño no encontrado o no pertenece a tu tienda' }, { status: 404 });
    }

    if (estado) {
      diseno.estado = estado;
      if (estado !== 'pendiente') diseno.fechaRespuestaAdmin = new Date();
    }

    if (mensaje?.trim()) {
      // 👈 NUEVO SAAS 2: Buscar al admin verificando también su tenantId
      const adminUser = await UserModel.findOne({ _id: token.id, tenantId });
      
      diseno.mensajes.push({
        autor: 'admin',
        nombreAutor: adminUser?.name || 'Equipo',
        contenido: mensaje.trim(),
        imagen: imagenMensaje || null,
        createdAt: new Date()
      });
    }

    await diseno.save();
    return NextResponse.json({ success: true, message: 'Diseño actualizado', diseno });
  } catch (error) {
    console.error('❌ Error actualizando diseño:', error);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}

// ✅ POST: Cliente envía mensaje o aprueba diseño
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = await getToken({ req });
    if (!token || !token.id) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const { mensaje, accion } = body;

    const tenantId = (token as any).tenantId;

    // 🎯 DEFENSA EN PROFUNDIDAD: El documento DEBE coincidir en ID, tenantId Y cliente.
    // Si falla cualquiera de los tres, devuelve 404.
    const diseno = await DisenoPersonalizadoModel.findOne({
      _id: id,
      tenantId,
      cliente: token.id
    });

    if (!diseno) {
      return NextResponse.json({ message: 'Diseño no encontrado o no tienes permiso' }, { status: 404 });
    }

    if (mensaje?.trim()) {
      // 👈 NUEVO SAAS: Buscar al cliente verificando su tenantId
      const user = await UserModel.findOne({ _id: token.id, tenantId });
      
      diseno.mensajes.push({
        autor: 'cliente',
        nombreAutor: user?.name || 'Cliente',
        contenido: mensaje.trim(),
        createdAt: new Date()
      });
    }

    if (accion === 'aprobar') {
      diseno.estado = 'aprobado';
      diseno.fechaAprobacionCliente = new Date();
    } else if (accion === 'rechazar') {
      diseno.estado = 'consulta';
    }

    await diseno.save();
    return NextResponse.json({ success: true, message: 'Respuesta registrada', diseno });
  } catch (error) {
    console.error('❌ Error del cliente:', error);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}