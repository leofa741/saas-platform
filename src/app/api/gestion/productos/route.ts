import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import ProductoModel from '@/app/models/Producto';
import InsumoModel from '@/app/models/Insumo';
import { verifyAdmin } from '@/app/lib/auth';

// ✅ GET: Obtener todos los productos DE ESTE TENANT
export async function GET(req: NextRequest) {
    try {
        const admin = await verifyAdmin(req);
        if (!admin) {
            return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
        }

        await connectDB();
        
        // 👈 NUEVO SAAS: Filtrar estrictamente por el tenantId del admin
        const productos = await ProductoModel.find({ tenantId: admin.tenantId })
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({ success: true, productos }, { status: 200 });
    } catch (error) {
        console.error('❌ Error obteniendo productos:', error);
        return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
    }
}

// ✅ POST: Crear un nuevo producto
export async function POST(req: NextRequest) {
    try {
        const admin = await verifyAdmin(req);
        if (!admin) return NextResponse.json({ message: 'No autorizado' }, { status: 403 });

        await connectDB();
        const body = await req.json();
        
        const {
            nombre, descripcion, categoria, subcategoria, insumos, 
            tiempoManoDeObraMinutos, valorHoraManoDeObra, margenGananciaPorcentaje, 
            precioFinalManual, imagen, destacado, nuevo, stock, precioMayorista
        } = body;

        let costoTotalInsumos = 0;
        const insumosDetallados = [];

        if (insumos && Array.isArray(insumos) && insumos.length > 0) {
            for (const item of insumos) {
                // 👈 NUEVO SAAS: Verificar que el insumo pertenezca al MISMO tenant
                const insumo = await InsumoModel.findOne({ 
                    _id: item.insumoId, 
                    tenantId: admin.tenantId 
                });
                
                if (!insumo) {
                    return NextResponse.json({ message: `Insumo no encontrado o no pertenece a tu tienda: ${item.insumoId}` }, { status: 400 });
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
        }

        const costoManoObra = ((tiempoManoDeObraMinutos || 0) / 60) * (valorHoraManoDeObra || 0);
        const costoTotalProduccion = costoTotalInsumos + costoManoObra;
        const margenDecimal = (margenGananciaPorcentaje || 0) / 100;
        const precioSugerido = costoTotalProduccion + (costoTotalProduccion * margenDecimal);
        const precioFinal = precioFinalManual ? Number(precioFinalManual) : precioSugerido;
        const estaEnPerdida = precioFinal > 0 && precioFinal < costoTotalProduccion;

        const nuevoProducto = await ProductoModel.create({
            tenantId: admin.tenantId, // 👈 NUEVO SAAS: Asignar al tenant
            nombre: nombre.trim(),
            descripcion: descripcion.trim(),
            categoria: categoria.trim(),
            subcategoria: subcategoria ? subcategoria.trim() : '',
            stock: stock || 0,
            precioMayorista: precioMayorista || 0,
            insumos: insumosDetallados,
            tiempoManoDeObraMinutos: tiempoManoDeObraMinutos || 0,
            valorHoraManoDeObra: valorHoraManoDeObra || 0,
            margenGananciaPorcentaje: margenGananciaPorcentaje || 0,
            precioFinalManual: precioFinal,
            imagen: imagen || '',
            destacado: destacado || false,
            nuevo: nuevo || false,
            costoTotalInsumos,
            costoManoObra,
            costoTotalProduccion,
            precioSugerido,
            estaEnPerdida,
            creadoPor: admin.email
        });

        return NextResponse.json({ success: true, producto: nuevoProducto }, { status: 201 });
    } catch (error: any) {
        console.error('❌ Error creando producto:', error);
        return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
    }
}