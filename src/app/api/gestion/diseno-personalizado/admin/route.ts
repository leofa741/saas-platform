import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import connectDB from '@/app/lib/mongoose';
import DisenoPersonalizadoModel from '@/app/models/DisenoPersonalizado';

export async function GET(req: NextRequest) {
  try {
    // 🔑 getToken leerá la cookie con NEXTAUTH_SECRET automáticamente
    const token = await getToken({ req });
    
    if (!token || !['admin', 'superadmin', 'vendedor'].includes(token.role as string)) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const estado = searchParams.get('estado');

    // 👈 NUEVO SAAS: Extraer tenantId y rol del token
    const tenantId = (token as any).tenantId;
    const role = token.role as string;
    const isSuperAdmin = role === 'superadmin';

    // 🎯 LA CLAVE: Aislamiento estricto por tenantId
    let query: any = {};
    
    if (isSuperAdmin) {
      // El superadmin puede ver todos los diseños del sistema (para soporte global)
      query = estado && estado !== 'todos' ? { estado } : {};
    } else {
      // Admin y Vendedor SOLO ven los diseños de SU propia tienda
      query = { tenantId };
      if (estado && estado !== 'todos') {
        query.estado = estado;
      }
    }
    
    const disenos = await DisenoPersonalizadoModel.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, disenos });

  } catch (error) {
    console.error('❌ Error listando diseños (admin):', error);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}