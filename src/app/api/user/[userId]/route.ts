import connectDB from '@/app/lib/mongoose';
import User from '@/app/models/User';
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;

    if (!ObjectId.isValid(userId)) {
      return NextResponse.json({ message: 'ID de usuario no válido' }, { status: 400 });
    }

    // 👈 NUEVO: Exigimos autenticación para evitar que se espíen datos entre tenants
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const sessionTenantId = (session.user as any).tenantId;

    await connectDB();

    // 👈 NUEVO: Buscamos el usuario SOLO si coincide el userId Y el tenantId de la sesión
    // Esto impide que un usuario de la "Tienda A" consulte datos de un usuario de la "Tienda B"
    const user = await User.findOne({ 
      _id: userId, 
      tenantId: sessionTenantId 
    }).select('-password');

    if (!user) {
      return NextResponse.json({ message: 'Usuario no encontrado o no tienes permiso para verlo' }, { status: 404 });
    }

    return NextResponse.json(user, { status: 200 });

  } catch (error) {
    console.error('Error al obtener el usuario:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}