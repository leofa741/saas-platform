import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import TenantModel from '@/app/models/Tenant';
import UserModel from '@/app/models/User';
import bcrypt from 'bcrypt';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    
    // Leemos el parámetro ?create=... (por defecto es 'prettywitches')
    const target = searchParams.get('create') || 'prettywitches';

    // ==========================================
    // OPCIÓN A: Crear el tenant "Maktub" (Ana)
    // ==========================================
    if (target === 'maktub') {
      const existingTenant = await TenantModel.findOne({ subdomain: 'maktub' });
      if (existingTenant) {
        return NextResponse.json({ 
          message: '✅ El tenant "Maktub" ya existe en la base de datos.',
          tenant: existingTenant 
        });
      }

      // 1. Crear el Tenant
      const newTenant = await TenantModel.create({
        nombre: 'Maktub Decoración',
        subdomain: 'maktub',
        email: 'infoplataformaweb@gmail.com',
        plan: 'basic',
        activo: true,
        config: {
          colores: { primary: '#1e293b', secondary: '#f59e0b' }, // Colores distintos para notar la diferencia
          logoUrl: '/favicon.ico',
          whatsapp: '5491100000000',
          description: 'Tienda de prueba de Maktub para validar el aislamiento del SaaS.',
        },
      });

  

      return NextResponse.json({ 
        message: '🎉 ¡Tenant "Maktub" y usuario "Ana" creados exitosamente!',
        instrucciones: 'Ahora ve a /login e ingresa con: infoplataformaweb@gmail.com / ana123',
        tenantId: newTenant._id
      });
    }

    // ==========================================
    // OPCIÓN B: Crear el tenant "Pretty Witches" (Tú)
    // ==========================================
    const existingTenantLocal = await TenantModel.findOne({ subdomain: 'localhost' });
    if (existingTenantLocal) {
      return NextResponse.json({ 
        message: '✅ El tenant de prueba (localhost) ya existe.',
        tenant: existingTenantLocal 
      });
    }

    const newTenantLocal = await TenantModel.create({
      nombre: 'Pretty Witches (Demo)',
      subdomain: 'localhost',
      email: 'hola.prettywitches@gmail.com',
      plan: 'premium',
      activo: true,
      config: {
        colores: { primary: '#3D2B1F', secondary: '#C9A961' },
        logoUrl: '/img/logo-pretty1-removebg-preview1.png',
        whatsapp: '5491132835127',
        description: 'En Pretty Witches creemos que lo que llevas puesto debe resonar con quien sos.',
      },
    });

    return NextResponse.json({ 
      message: '🎉 ¡Tenant "Pretty Witches" creado exitosamente!',
      tenant: newTenantLocal 
    });

  } catch (error) {
    console.error('❌ Error al crear el tenant:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}