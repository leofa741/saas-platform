// src/app/api/seed-tenant/route.ts
import { NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongoose';
import TenantModel from '@/app/models/Tenant';

export async function GET() {
  try {
    await connectDB();

    // 1. Verificar si ya existe un tenant (para no duplicar)
    const existingTenant = await TenantModel.findOne({ subdomain: 'localhost' });

    if (existingTenant) {
      return NextResponse.json({ 
        message: '✅ El tenant de prueba ya existe en la base de datos.',
        tenant: existingTenant 
      });
    }

    // 2. Si no existe, lo creamos con los datos de Pretty Witches (o Tienda Demo)
    const newTenant = await TenantModel.create({
      nombre: 'Pretty Witches (Demo)',
      subdomain: 'localhost', // Usamos 'localhost' para que funcione en tu PC local
      email: 'hola.prettywitches@gmail.com',
      plan: 'premium',
      activo: true,
      config: {
        colores: {
          primary: '#3D2B1F',
          secondary: '#C9A961',
        },
        logoUrl: '/img/logo-pretty1-removebg-preview1.png',
        whatsapp: '5491132835127',
        description: 'En Pretty Witches creemos que lo que llevas puesto debe resonar con quien sos. Por eso, creamos cada pieza de bijouterie y macramé no solo por su estética, sino por la intención y la energía que le ponemos al hacerla realidad.',
      },
    });

    return NextResponse.json({ 
      message: '🎉 ¡Tenant creado exitosamente en la base de datos!',
      tenant: newTenant 
    });

  } catch (error) {
    console.error('❌ Error al crear el tenant:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}