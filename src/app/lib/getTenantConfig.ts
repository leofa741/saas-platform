// src/lib/getTenantConfig.ts
import connectDB from '@/app/lib/mongoose'; // Asegúrate de que esta ruta sea correcta a tu archivo de conexión a MongoDB
import TenantModel from '@/app/models/Tenant';

export async function getTenantConfig(subdomain: string) {
  try {
    // 1. Conectar a la base de datos
    await connectDB();

    // 2. Buscar el tenant por su subdominio (ej: "prettywitches" o "localhost")
    // Nota: En localhost, el subdominio será "localhost", así que buscamos también por defecto
    const tenant = await TenantModel.findOne({ 
      $or: [
        { subdomain: subdomain, activo: true },
        { subdomain: 'localhost', activo: true } // Para que funcione en tu PC local
      ] 
    });

    if (tenant) {
      // 3. Si existe en la BD, devolvemos sus datos dinámicos
      return {
        nombre: tenant.nombre,
        description: tenant.config.description,
        whatsapp: tenant.config.whatsapp,
        logoUrl: tenant.config.logoUrl,
        colores: tenant.config.colores,
        id: tenant._id,
      };
    }

    // 4. FALLBACK (Respaldo): Si no hay tenant en la BD aún, usamos los datos de Pretty Witches
    // Esto evita que la app se rompa en desarrollo mientras migramos al SaaS
    return {
      nombre: 'Pretty Witches',
      description: 'En Pretty Witches creemos que lo que llevas puesto debe resonar con quien sos. Por eso, creamos cada pieza de bijouterie y macramé no solo por su estética, sino por la intención y la energía que le ponemos al hacerla realidad.',
      whatsapp: '5491132835127',
      logoUrl: '/img/logo-pretty1-removebg-preview1.png',
      colores: { primary: '#3D2B1F', secondary: '#C9A961' },
      id: null,
    };

  } catch (error) {
    console.error('❌ Error obteniendo config del tenant:', error);
    
    // 5. Fallback de emergencia por si falla la conexión a la BD
    return {
      nombre: 'EmprendeFácil',
      description: 'Tu tienda online de productos personalizados',
      whatsapp: '',
      logoUrl: '/favicon.ico',
      colores: { primary: '#3D2B1F', secondary: '#C9A961' },
      id: null,
    };
  }
}