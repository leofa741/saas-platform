import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import PedidoModel from '@/app/models/Pedido';
import { verifyAdmin } from '@/app/lib/auth';

// ✅ GET: Obtener un solo pedido por su ID
export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) return NextResponse.json({ message: 'No autorizado' }, { status: 403 });

    const { id } = await params;
    await connectDB();
    
    // 👈 NUEVO SAAS: Buscar por ID Y por tenantId
    const pedido = await PedidoModel.findOne({ _id: id, tenantId: admin.tenantId });

    if (!pedido) {
      return NextResponse.json({ message: 'Pedido no encontrado o no pertenece a tu tienda' }, { status: 404 });
    }

    return NextResponse.json({ success: true, pedido }, { status: 200 });
  } catch (error) {
    console.error('❌ Error obteniendo pedido:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}

// ✅ PUT: Actualizar un pedido existente (Estado, Pagos, Notas, Email Y PRODUCTOS)
export async function PUT(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) return NextResponse.json({ message: 'No autorizado' }, { status: 403 });

    const { id } = await params;
    await connectDB();
    const body = await req.json();
    
    const { estado, seña, notas, fechaEntregaEstimada, clienteEmail, productos, total } = body;

    // 👈 NUEVO SAAS 1: Verificar que el pedido exista y pertenezca a este tenant
    const pedidoActual = await PedidoModel.findOne({ _id: id, tenantId: admin.tenantId });
    if (!pedidoActual) {
      return NextResponse.json({ message: 'Pedido no encontrado o no tienes permiso para editarlo' }, { status: 404 });
    }

    const nuevaSeña = seña !== undefined ? Number(seña) : pedidoActual.seña;
    const nuevoTotal = total !== undefined ? Number(total) : pedidoActual.total;
    const nuevoSaldoPendiente = Math.max(0, nuevoTotal - nuevaSeña);

    const updateData: any = {};
    if (estado !== undefined) updateData.estado = estado;
    if (seña !== undefined) updateData.seña = nuevaSeña;
    if (notas !== undefined) updateData.notas = notas;
    if (fechaEntregaEstimada !== undefined) updateData.fechaEntregaEstimada = new Date(fechaEntregaEstimada);
    if (clienteEmail !== undefined) updateData.clienteEmail = clienteEmail;
    
    // ✅ CORRECCIÓN CLAVE: Limpiar productos temporales antes de guardar en MongoDB
    if (productos && Array.isArray(productos)) {
      const productosLimpios = productos.map((p: any) => {
        const { productoId, ...rest } = p;
        
        if (productoId && productoId.toString().startsWith('temp_')) {
          return rest; 
        }
        return p;
      });
      
      updateData.productos = productosLimpios;
      updateData.total = nuevoTotal;
    }
    
    updateData.saldoPendiente = nuevoSaldoPendiente;

    // 👈 NUEVO SAAS 2: Actualizar SOLO si coincide el ID y el tenantId
    const pedidoActualizado = await PedidoModel.findOneAndUpdate(
      { _id: id, tenantId: admin.tenantId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!pedidoActualizado) {
      return NextResponse.json({ message: 'Pedido no encontrado' }, { status: 404 });
    }

    // ... (Aquí continúa tu lógica de envío de email que ya tenías) ...
    console.log('📧 --- DEBUG DE ENVÍO DE EMAIL ---');
    // ... resto del código del email ...

    return NextResponse.json({ 
      success: true, 
      message: 'Documento actualizado exitosamente', 
      pedido: pedidoActualizado 
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Error actualizando pedido:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}

// ✅ DELETE: Eliminar un pedido
export async function DELETE(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) return NextResponse.json({ message: 'No autorizado' }, { status: 403 });

    const { id } = await params;
    await connectDB();
    
    // 👈 NUEVO SAAS: Eliminar SOLO si el ID coincide con el tenantId del admin
    const pedidoEliminado = await PedidoModel.findOneAndDelete({ 
      _id: id, 
      tenantId: admin.tenantId 
    });

    if (!pedidoEliminado) {
      return NextResponse.json({ message: 'Pedido no encontrado o no tienes permiso para eliminarlo' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Pedido eliminado exitosamente' }, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error eliminando pedido:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}