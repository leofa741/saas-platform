import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import UserModel from '@/app/models/User';
import { verifyAdmin } from '@/app/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAdmin(req);
    // Solo admin y superadmin pueden ver y gestionar roles
    if (!admin || (admin.role !== 'admin' && admin.role !== 'superadmin')) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
    }

    await connectDB();
    
    // 👈 NUEVO SAAS: Filtrar por tenantId (a menos que sea superadmin, que puede ver todo el sistema)
    const query = admin.role === 'superadmin' ? {} : { tenantId: admin.tenantId };

    // Obtenemos los usuarios EXCLUYENDO la contraseña y tokens de reset
    const users = await UserModel.find(query)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, users }, { status: 200 });
  } catch (error) {
    console.error('❌ Error obteniendo usuarios:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}