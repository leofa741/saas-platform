import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { getToken } from 'next-auth/jwt'; // 👈 NUEVO SAAS: Para verificar autenticación

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function POST(req: NextRequest) {
  try {
    // 1. 🔒 SEGURIDAD: Verificar que el usuario esté autenticado
    const token = await getToken({ req });
    if (!token || !token.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. 🏢 SAAS: Extraer el tenantId para aislar las carpetas en Cloudinary
    // Si por alguna razón no existe (ej: usuario global), usamos 'global' como fallback
    const tenantId = (token as any).tenantId || 'global';

    const formData = await req.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó ninguna imagen.' }, { status: 400 });
    }

    // 3. 🛡️ VALIDACIÓN EXTRA: Asegurar que sea realmente una imagen
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'El archivo debe ser una imagen válida.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 4. 📁 SAAS: Definir la ruta de la carpeta específica del tenant
    const folderPath = `tenants/${tenantId}/assets`;

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { 
            folder: folderPath,
            resource_type: 'auto' // Permite imágenes de cualquier formato (jpg, png, webp)
          }, 
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        )
        .end(buffer);
    });

    return NextResponse.json({ 
      url: (result as any).secure_url,
      public_id: (result as any).public_id // Útil si en el futuro quieres permitir borrar la imagen
    });

  } catch (error) {
    console.error('❌ Error al subir imagen:', error);
    return NextResponse.json({ error: 'Error interno al subir la imagen.' }, { status: 500 });
  }
}