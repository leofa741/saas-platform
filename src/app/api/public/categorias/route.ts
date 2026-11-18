import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import ProductoModel from '@/app/models/Producto';
import { getTenantConfig } from '@/app/lib/getTenantConfig';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    // 1. Identificar el tenant por el host
    const host = req.headers.get('host') || 'localhost';
    const subdomain = host.split('.')[0]; 
    const tenantConfig = await getTenantConfig(subdomain);

    if (!tenantConfig.id && subdomain !== 'localhost') {
      return NextResponse.json({ success: true, categorias: [], footerLinks: [] }, { status: 200 });
    }
    
    // 2. Obtener todos los productos activos DE ESTE TENANT
    const todosLosProductos = await ProductoModel.find({ 
      activo: true, 
      tenantId: tenantConfig.id 
    })
      .select('categoria subcategoria')
      .lean();

    // 3. AGRUPAR manualmente para generar ambos formatos
    const mapaCategorias = new Map<string, Set<string>>();
    const categoriasPlanasSet = new Set<string>(); 

    todosLosProductos.forEach((p: any) => {
      const cat = p.categoria?.trim();
      const sub = p.subcategoria?.trim();

      if (cat) {
        categoriasPlanasSet.add(cat); // Guardamos para el footer
        if (!mapaCategorias.has(cat)) {
          mapaCategorias.set(cat, new Set<string>());
        }
        if (sub) {
          mapaCategorias.get(cat)!.add(sub); // Guardamos para el navbar
        }
      }
    });

    // 4. CONSTRUIR formato jerárquico (PARA EL NAVBAR)
    const categoriasJerarquicas = Array.from(mapaCategorias.entries()).map(([nombreCat, subsSet]) => {
      const catSlug = nombreCat.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
      
      const hijas = Array.from(subsSet).map(subNombre => {
        const subSlug = subNombre.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
        return {
          _id: `sub-${subSlug}`,
          nombre: subNombre,
          slug: subSlug
        };
      });

      return {
        _id: `cat-${catSlug}`,
        nombre: nombreCat,
        slug: catSlug,
        hijas: hijas.length > 0 ? hijas : undefined
      };
    });

    // 5. CONSTRUIR formato plano (PARA EL FOOTER)
    const footerLinks = Array.from(categoriasPlanasSet)
      .filter(cat => cat && cat.trim() !== '')
      .map(cat => {
        const cleanCat = cat.toLowerCase().trim();
        return {
          label: cleanCat.charAt(0).toUpperCase() + cleanCat.slice(1),
          slug: cleanCat,
          href: `/categoria/${cleanCat}`
        };
      });

    // 6. DEVOLVER AMBOS FORMATOS EN LA MISMA RESPUESTA
    return NextResponse.json({ 
      success: true, 
      categorias: categoriasJerarquicas, // 👈 Para el Navbar
      footerLinks: footerLinks           // 👈 Para el Footer
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Error obteniendo categorías públicas:', error);
    return NextResponse.json({ success: false, message: 'Error interno' }, { status: 500 });
  }
}