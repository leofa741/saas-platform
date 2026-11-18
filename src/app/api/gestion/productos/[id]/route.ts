import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import ProductoModel from '@/app/models/Producto';
import InsumoModel from '@/app/models/Insumo';
import { verifyAdmin } from '@/app/lib/auth';

// ✅ GET: Obtener un solo producto por su ID
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const admin = await verifyAdmin(req);
        if (!admin) {
            return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
        }

        await connectDB();
        const { id } = await params;

        // 👈 NUEVO SAAS: Buscar por ID Y por tenantId
        const producto = await ProductoModel.findOne({ _id: id, tenantId: admin.tenantId });

        if (!producto) {
            return NextResponse.json({ message: 'Producto no encontrado o no pertenece a tu tienda' }, { status: 404 });
        }

        return NextResponse.json({ success: true, producto }, { status: 200 });
    } catch (error) {
        console.error('❌ Error obteniendo producto:', error);
        return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
    }
}

// ✅ PUT: Actualizar un producto por su ID
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const admin = await verifyAdmin(req);
        if (!admin) {
            return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
        }

        await connectDB();
        const { id } = await params;
        const body = await req.json();
        
        const {
            nombre, descripcion, categoria, subcategoria, stock, precioMayorista, insumos, 
            tiempoManoDeObraMinutos, valorHoraManoDeObra, margenGananciaPorcentaje, 
            precioFinalManual, imagen, destacado, nuevo
        } = body;

        // 👈 NUEVO SAAS: Verificar que el producto exista y pertenezca a este tenant antes de editar
        const productoExistente = await ProductoModel.findOne({ _id: id, tenantId: admin.tenantId });
        if (!productoExistente) {
            return NextResponse.json({ message: 'Producto no encontrado o no tienes permiso para editarlo' }, { status: 404 });
        }

        let updateData: any = {};

        // Si se envían insumos, recalculamos todos los costos automáticamente
        if (insumos && Array.isArray(insumos) && insumos.length > 0) {
            let costoTotalInsumos = 0;
            const insumosDetallados = [];

            for (const item of insumos) {
                // 👈 NUEVO SAAS: Validar que el insumo también pertenezca a este tenant
                const insumo = await InsumoModel.findOne({ _id: item.insumoId, tenantId: admin.tenantId });
                if (!insumo) {
                    return NextResponse.json({ message: `El insumo con ID ${item.insumoId} no existe o no pertenece a tu tienda.` }, { status: 400 });
                }

                const costoPorUnidad = insumo.costo / insumo.cantidadPaquete;
                const subtotal = costoPorUnidad * item.cantidadUsada;
                costoTotalInsumos += subtotal;

                insumosDetallados.push({
                    insumoId: insumo._id, 
                    nombre: insumo.nombre, 
                    cantidadUsada: item.cantidadUsada,
                    costoUnitarioCalculado: costoPorUnidad, 
                    subtotalCalculado: subtotal
                });
            }

            const costoManoObra = ((tiempoManoDeObraMinutos || 0) / 60) * (valorHoraManoDeObra || 0);
            const costoTotalProduccion = costoTotalInsumos + costoManoObra;
            const margenDecimal = (margenGananciaPorcentaje || 0) / 100;
            const precioSugerido = costoTotalProduccion + (costoTotalProduccion * margenDecimal);
            const precioFinal = precioFinalManual ? Number(precioFinalManual) : precioSugerido;
            const estaEnPerdida = precioFinal > 0 && precioFinal < costoTotalProduccion;

            updateData = {
                insumos: insumosDetallados, 
                tiempoManoDeObraMinutos: tiempoManoDeObraMinutos || 0,
                valorHoraManoDeObra: valorHoraManoDeObra || 0, 
                margenGananciaPorcentaje: margenGananciaPorcentaje || 0,
                precioFinalManual: precioFinal, 
                costoTotalInsumos, 
                costoManoObra, 
                costoTotalProduccion,
                precioSugerido, 
                estaEnPerdida
            };
        } 
        
        // Actualización de campos básicos
        if (nombre !== undefined) updateData.nombre = nombre.trim();
        if (descripcion !== undefined) updateData.descripcion = descripcion.trim();
        if (categoria !== undefined) updateData.categoria = categoria;
        if (subcategoria !== undefined) updateData.subcategoria = subcategoria;
        if (stock !== undefined) updateData.stock = Number(stock);
        if (precioMayorista !== undefined) updateData.precioMayorista = Number(precioMayorista);
        if (precioFinalManual !== undefined && !insumos) updateData.precioFinalManual = Number(precioFinalManual);
        if (imagen !== undefined) updateData.imagen = imagen;
        if (destacado !== undefined) updateData.destacado = destacado;
        if (nuevo !== undefined) updateData.nuevo = nuevo;

        // 👈 NUEVO SAAS: Actualizar usando findOneAndUpdate con el filtro de tenant
        const productoActualizado = await ProductoModel.findOneAndUpdate(
            { _id: id, tenantId: admin.tenantId }, 
            { $set: updateData }, 
            { new: true, runValidators: true }
        );

        return NextResponse.json({ 
            success: true, 
            message: 'Producto actualizado', 
            producto: productoActualizado 
        }, { status: 200 });

    } catch (error: any) {
        console.error('❌ Error actualizando producto:', error);
        return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
    }
}

// ✅ DELETE: Eliminar un producto por su ID
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const admin = await verifyAdmin(req);
        if (!admin) {
            return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
        }

        await connectDB();
        const { id } = await params;

        // 👈 NUEVO SAAS: Solo eliminar si el ID coincide con el tenantId del admin
        const productoEliminado = await ProductoModel.findOneAndDelete({ 
            _id: id, 
            tenantId: admin.tenantId 
        });

        if (!productoEliminado) {
            return NextResponse.json({ message: 'Producto no encontrado o no tienes permiso para eliminarlo' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Producto eliminado' }, { status: 200 });

    } catch (error: any) {
        console.error('❌ Error eliminando producto:', error);
        return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
    }
}