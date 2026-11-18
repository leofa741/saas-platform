import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import ClienteModel from '@/app/models/Cliente';
import { verifyAdmin } from '@/app/lib/auth';

// ✅ GET: Obtener un solo cliente por su ID
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) return NextResponse.json({ message: 'No autorizado' }, { status: 403 });

    await connectDB();
    const { id } = await params;

    // 👈 NUEVO SAAS: Buscar por ID Y por tenantId
    const cliente = await ClienteModel.findOne({ _id: id, tenantId: admin.tenantId });

    if (!cliente) {
      return NextResponse.json({ message: 'Clienta no encontrada o no pertenece a tu tienda' }, { status: 404 });
    }

    return NextResponse.json({ success: true, cliente }, { status: 200 });
  } catch (error) {
    console.error('❌ Error obteniendo cliente:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}

// ✅ PUT: Actualizar un cliente por su ID
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) return NextResponse.json({ message: 'No autorizado' }, { status: 403 });

    await connectDB();
    const { id } = await params;
    const body = await req.json();
    const { nombre, apellido, telefono, email, direccion, ciudad, notas } = body;

    // 👈 NUEVO SAAS: Verificar que el cliente exista y pertenezca a este tenant antes de editar
    const clienteExistente = await ClienteModel.findOne({ _id: id, tenantId: admin.tenantId });
    if (!clienteExistente) {
      return NextResponse.json({ message: 'Clienta no encontrada o no tienes permiso para editarla' }, { status: 404 });
    }

    // 👈 NUEVO SAAS: Usar findOneAndUpdate con el filtro de tenant
    const clienteActualizado = await ClienteModel.findOneAndUpdate(
      { _id: id, tenantId: admin.tenantId },
      { nombre, apellido, telefono, email, direccion, ciudad, notas },
      { new: true, runValidators: true }
    );

    return NextResponse.json({ success: true, message: 'Clienta actualizada', cliente: clienteActualizado }, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error actualizando cliente:', error);
    if (error.statusCode === 409) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}

// ✅ DELETE: Desactivar un cliente por su ID (Soft Delete)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) return NextResponse.json({ message: 'No autorizado' }, { status: 403 });

    await connectDB();
    const { id } = await params;
    
    // 👈 NUEVO SAAS: Soft delete SOLO si el ID coincide con el tenantId del admin
    const cliente = await ClienteModel.findOneAndUpdate(
      { _id: id, tenantId: admin.tenantId },
      { activo: false },
      { new: true }
    );

    if (!cliente) {
      return NextResponse.json({ message: 'Clienta no encontrada o no tienes permiso para desactivarla' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Clienta desactivada exitosamente' }, { status: 200 });
  } catch (error) {
    console.error('❌ Error desactivando cliente:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}