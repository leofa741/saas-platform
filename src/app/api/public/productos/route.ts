import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import ProductoModel from '@/app/models/Producto';
import { getTenantConfig } from '@/app/lib/getTenantConfig'; // 👈 NUEVO SAAS: Para identificar la tienda

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    // 👈 NUEVO SAAS: 1. Identificar a qué tienda está visitando el cliente
    const host = req.headers.get('host') || 'localhost';
    const subdomain = host.split('.')[0]; // Ej: 'prettywitches' o 'localhost'
    
    const tenantConfig = await getTenantConfig(subdomain);
    
    // Si no hay un tenant válido (y no es el fallback de localhost), devolvemos vacío por seguridad
    if (!tenantConfig.id && subdomain !== 'localhost') {
      return NextResponse.json({ 
        success: true, 
        productos: [],
        pagination: { currentPage: 1, totalPages: 1, totalProductos: 0, limit: 12 }
      }, { status: 200 });
    }

    // 2. Leer parámetros de la URL
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '12', 10);
    const categoria = searchParams.get('categoria');
    const destacadoParam = searchParams.get('destacado');

    // 3. Construir la consulta dinámicamente
    // 👈 NUEVO SAAS: Agregamos tenantId a la consulta base
    const query: any = { 
      activo: true, 
      tenantId: tenantConfig.id // 👈 FILTRO CRÍTICO: Solo productos de esta tienda
    };
    
    // ✅ CORRECCIÓN CLAVE: Buscar en categoría O en subcategoría, ignorando mayúsculas y cambiando guiones por espacios
    if (categoria && categoria !== 'todas') {
      const regexPattern = categoria.replace(/-/g, '[ -]');
      const regex = new RegExp(`^${regexPattern}$`, 'i');
      
      query.$or = [
        { categoria: regex },
        { subcategoria: regex }
      ];
    }
    
    if (destacadoParam === 'true') {
      query.destacado = true;
    }

    // 4. Obtener el total de productos que coinciden con la consulta (para la paginación)
    const totalProductos = await ProductoModel.countDocuments(query);
    const totalPages = Math.ceil(totalProductos / limit) || 1;

    // 5. Obtener los productos con skip y limit
    const productos = await ProductoModel.find(query)
      .select('nombre descripcion categoria subcategoria precioFinalManual precioMayorista precioSugerido imagen destacado nuevo')
      .sort({ destacado: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // 6. Mapear para asegurar que el frontend reciba los campos exactos
    const productosMapeados = productos.map((p: any) => ({
      _id: p._id.toString(),
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      categoria: p.categoria,
      subcategoria: p.subcategoria || '', 
      precio: p.precioFinalManual || p.precioSugerido || 0,
      precioMayorista: p.precioMayorista || 0,
      precioFinal: p.precioFinalManual || p.precioSugerido || 0,
      moneda: 'ARS',
      imagen: p.imagen || '',
      slug: p.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      destacado: Boolean(p.destacado),
      nuevo: Boolean(p.nuevo)
    }));

    console.log(`✅ API Pública (${subdomain}): ${productosMapeados.length} productos cargados. Página ${page} de ${totalPages}`);

    // 7. Devolver los productos Y la información de paginación
    return NextResponse.json({ 
      success: true, 
      productos: productosMapeados,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalProductos: totalProductos,
        limit: limit
      }
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Error obteniendo productos públicos:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}