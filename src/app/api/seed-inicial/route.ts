import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import TenantModel from '@/app/models/Tenant';
import UserModel from '@/app/models/User';

export async function GET() {
  try {
    await connectDB();

    // 1. Buscar o crear el Tenant por defecto para desarrollo local
    let tenant = await TenantModel.findOne({ subdomain: 'localhost' });
    
    if (!tenant) {
      tenant = await TenantModel.create({
        nombre: 'Tienda Demo (Local)',
        subdomain: 'localhost',
        email: 'leonardofarena@gmail.com',
        plan: 'premium',
        activo: true,
        config: {
          colores: { primary: '#3D2B1F', secondary: '#C9A961' },
          logoUrl: '/img/logo-pretty1-removebg-preview1.png',
          whatsapp: '5491132835127',
          description: 'Tienda de prueba para desarrollo del SaaS',
        }
      });
      console.log('✅ Tenant "localhost" creado.');
    }

    // 2. Buscar tu usuario superadmin
    const user = await UserModel.findOne({ email: 'leonardofarena@gmail.com' });

    if (user) {
      // 3. Actualizar el usuario para que tenga el tenantId
      if (!user.tenantId) {
        await UserModel.findByIdAndUpdate(user._id, {
          $set: { tenantId: tenant._id }
        });
        console.log('✅ Usuario Leonardo vinculado al Tenant.');
      }

      return NextResponse.json({
        success: true,
        message: '¡Base de datos inicializada correctamente!',
        data: {
          tenantId: tenant._id,
          tenantNombre: tenant.nombre,
          usuario: user.email,
          usuarioRole: user.role
        }
      });
    } else {
      return NextResponse.json({ error: 'No se encontró el usuario leonardofarena@gmail.com' }, { status: 404 });
    }

  } catch (error) {
    console.error('❌ Error en seed inicial:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}