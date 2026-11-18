import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import InsumoModel from '@/app/models/Insumo';
import ProductoModel from '@/app/models/Producto'; // 👈 Renombrado para consistencia
import { verifyAdmin } from '@/app/lib/auth';

// ✅ GET: Obtener lista de insumos DE ESTE TENANT
export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) return NextResponse.json({ message: 'No autorizado' }, { status: 403 });

    await connectDB();
    
    // 👈 NUEVO SAAS: Filtrar estrictamente por el tenantId del admin
    const insumos = await InsumoModel.find({ 
      activo: true, 
      tenantId: admin.tenantId 
    }).sort({ createdAt: -1 });
    
    return NextResponse.json({ success: true, insumos }, { status: 200 });
  } catch (error) {
    console.error('❌ Error obteniendo insumos:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}

// ✅ POST: Crear un nuevo insumo
export async function POST(req: NextRequest) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) return NextResponse.json({ message: 'No autorizado' }, { status: 403 });

    await connectDB();
    const body = await req.json();
    const { nombre, categoria, costo, cantidadPaquete, unidadMedida, stockActual } = body;

    if (!nombre?.trim() || !categoria?.trim() || !costo || !cantidadPaquete || !unidadMedida) {
      return NextResponse.json({ message: 'Todos los campos obligatorios deben ser completados.' }, { status: 400 });
    }

    // 👈 NUEVO SAAS: Asignar el tenantId al crear el insumo
    const nuevoInsumo = await InsumoModel.create({
      tenantId: admin.tenantId,
      nombre: nombre.trim(),
      categoria: categoria.trim(),
      costo: Number(costo),
      cantidadPaquete: Number(cantidadPaquete),
      unidadMedida: unidadMedida.trim(),
      stockActual: Number(stockActual) || 0,
      creadoPor: admin.id
    });

    return NextResponse.json({ success: true, message: 'Insumo creado exitosamente', insumo: nuevoInsumo }, { status: 201 });
  } catch (error: any) {
    console.error('❌ Error creando insumo:', error);
    if (error.code === 11000) {
      return NextResponse.json({ message: 'Ya existe un insumo con ese nombre en tu tienda.' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}

// ✅ PUT: Actualizar un insumo existente (CON ACTUALIZACIÓN EN CASCADA DEL PRECIO FINAL)
export async function PUT(req: NextRequest) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) return NextResponse.json({ message: 'No autorizado' }, { status: 403 });

    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ message: 'ID del insumo es requerido' }, { status: 400 });

    const body = await req.json();
    const { nombre, categoria, costo, cantidadPaquete, unidadMedida, stockActual } = body;

    // 👈 NUEVO SAAS 1: Verificar y actualizar SOLO si el insumo pertenece a este tenant
    const insumoActualizado = await InsumoModel.findOneAndUpdate(
      { _id: id, tenantId: admin.tenantId },
      {
        nombre: nombre?.trim(),
        categoria: categoria?.trim(),
        costo: Number(costo),
        cantidadPaquete: Number(cantidadPaquete),
        unidadMedida: unidadMedida?.trim(),
        stockActual: Number(stockActual) || 0
      },
      { new: true, runValidators: true }
    );

    if (!insumoActualizado) {
      return NextResponse.json({ message: 'Insumo no encontrado o no pertenece a tu tienda' }, { status: 404 });
    }

    // 2. 🔄 ACTUALIZACIÓN EN CASCADA: Buscar productos que usan este insumo
    // 👈 NUEVO SAAS 2: Buscar SOLO productos de este tenant que usen este insumo
    const productosAfectados = await ProductoModel.find({ 
      'insumos.insumoId': id,
      tenantId: admin.tenantId 
    });

    if (productosAfectados.length > 0) {
      const nuevoCostoUnitario = insumoActualizado.costo / insumoActualizado.cantidadPaquete;

      for (const prod of productosAfectados) {
        // Recalcular los insumos de este producto específico
        const insumosActualizados = prod.insumos.map((ins: any) => {
          if (ins.insumoId.toString() === id) {
            // Es el insumo que cambió: actualizamos su costo y subtotal
            const nuevoSubtotal = nuevoCostoUnitario * ins.cantidadUsada;
            return {
              ...ins.toObject(),
              costoUnitarioCalculado: nuevoCostoUnitario,
              subtotalCalculado: nuevoSubtotal
            };
          }
          return ins; // Los demás insumos quedan igual
        });

        // Sumar todos los subtotales actualizados
        const nuevoCostoTotalInsumos = insumosActualizados.reduce(
          (sum: number, ins: any) => sum + (Number(ins.subtotalCalculado) || 0), 
          0
        );

        // Recalcular los totales del producto
        const costoManoObra = (prod.tiempoManoDeObraMinutos / 60) * prod.valorHoraManoDeObra;
        const nuevoCostoTotalProduccion = nuevoCostoTotalInsumos + costoManoObra;
        
        // Aplicar el margen de ganancia original del producto
        const margenDecimal = (prod.margenGananciaPorcentaje || 0) / 100;
        const nuevoPrecioSugerido = nuevoCostoTotalProduccion + (nuevoCostoTotalProduccion * margenDecimal);
        
        // 3. 💡 CLAVE: Actualizamos el precio final de venta para que suba junto con el insumo
        const nuevoPrecioFinal = nuevoPrecioSugerido;

        // 4. Guardar los cambios en el producto
        await ProductoModel.findByIdAndUpdate(prod._id, {
          insumos: insumosActualizados,
          costoTotalInsumos: nuevoCostoTotalInsumos,
          costoTotalProduccion: nuevoCostoTotalProduccion,
          precioSugerido: nuevoPrecioSugerido,
          precioFinalManual: nuevoPrecioFinal,
          estaEnPerdida: false
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Insumo y productos afectados actualizados exitosamente',
      productosActualizados: productosAfectados.length,
      insumo: insumoActualizado 
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Error actualizando insumo:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}

// ✅ DELETE: Eliminar un insumo
export async function DELETE(req: NextRequest) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) return NextResponse.json({ message: 'No autorizado' }, { status: 403 });

    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ message: 'ID del insumo es requerido' }, { status: 400 });

    // 👈 NUEVO SAAS: Eliminar SOLO si el ID coincide con el tenantId del admin
    const insumoEliminado = await InsumoModel.findOneAndDelete({ 
      _id: id, 
      tenantId: admin.tenantId 
    });

    if (!insumoEliminado) {
      return NextResponse.json({ message: 'Insumo no encontrado o no tienes permiso para eliminarlo' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Insumo eliminado exitosamente' }, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error eliminando insumo:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}