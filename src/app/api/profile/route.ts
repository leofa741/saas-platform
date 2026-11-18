import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import User from '@/app/models/User';
import connectDB from '@/app/lib/mongoose';

connectDB();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    // 👈 NUEVO SAAS: Extraemos el tenantId de la sesión para validación cruzada
    const userId = session.user.id;
    const tenantId = (session.user as any).tenantId;

    // 👈 NUEVO SAAS: Buscamos por ID Y por tenantId (Defensa en profundidad)
    // Esto garantiza que incluso si el ID de sesión fuera manipulado de alguna forma extraña, 
    // la consulta fallará si el tenant no coincide.
    const user = await User.findOne({ 
      _id: userId, 
      tenantId: tenantId 
    }).select('-password -resetPasswordToken -resetPasswordExpires');

    if (!user) {
      return NextResponse.json({ message: 'Usuario no encontrado o no pertenece a esta tienda' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        id: user._id.toString(),
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        address: user.address,
        city: user.city,
        zipCode: user.zipCode,
        img: user.img,
        role: user.role,
        tenantId: user.tenantId
      } 
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Error en GET /api/profile:', error);
    return NextResponse.json({ message: 'Error al obtener el perfil' }, { status: 500 });
  }
}