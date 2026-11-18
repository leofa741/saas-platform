import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import cloudinary from '@/app/lib/cloudinary';
import User from '@/app/models/User';
import connectDB from '@/app/lib/mongoose';

// 👈 NUEVO SAAS: Agregamos tenantId al token decodificado
interface DecodedToken {
  id: string;
  role: string;
  tenantId: string; 
}

interface CloudinaryUploadResult {
  secure_url: string;
}

connectDB();

function getTokenFromRequest(req: NextRequest): string | null {
  return req.headers.get('Authorization')?.split(' ')[1] || null;
}

// ✅ GET - Obtener usuarios (Solo admin/superadmin de ESTE tenant)
export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    
    // Permitimos admin o superadmin
    if (!['admin', 'superadmin'].includes(decoded.role)) {
      return NextResponse.json({ message: 'Acceso no autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    // 👈 NUEVO SAAS: Definimos el filtro base. 
    // Si es superadmin, puede ver todos. Si es admin, solo los de su tenant.
    const tenantFilter = decoded.role === 'superadmin' ? {} : { tenantId: decoded.tenantId };

    if (id) {
      // 👈 NUEVO SAAS: Buscamos por ID Y por tenant (a menos que sea superadmin)
      const user = await User.findOne({ _id: id, ...tenantFilter }).select('-password');
      if (!user) {
        return NextResponse.json({ message: 'Usuario no encontrado o no pertenece a tu tienda' }, { status: 404 });
      }
      return NextResponse.json(user);
    }

    // 👈 NUEVO SAAS: Listamos solo los usuarios de este tenant
    const users = await User.find(tenantFilter).select('-password').sort({ createdAt: -1 });
    return NextResponse.json(users);
    
  } catch (error) {
    console.error('Error en GET:', error);
    return NextResponse.json({ message: 'Error al obtener los usuarios' }, { status: 500 });
  }
}

// ✅ PUT - Actualizar un usuario (Solo admin/superadmin)
export async function PUT(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    if (!['admin', 'superadmin'].includes(decoded.role)) {
      return NextResponse.json({ message: 'Acceso denegado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ message: 'ID de usuario requerido' }, { status: 400 });

    // 👈 NUEVO SAAS: Verificamos que el usuario a modificar pertenezca a este tenant
    const tenantFilter = decoded.role === 'superadmin' ? {} : { tenantId: decoded.tenantId };
    const userExists = await User.findOne({ _id: id, ...tenantFilter });
    
    if (!userExists) {
      return NextResponse.json({ message: 'Usuario no encontrado o no tienes permiso para editarlo' }, { status: 404 });
    }

    const formData = await req.formData();
    const name = formData.get('name')?.toString().trim() || '';
    const lastName = formData.get('lastName')?.toString().trim() || '';
    const address = formData.get('address')?.toString().trim() || '';
    const city = formData.get('city')?.toString().trim() || '';
    const zipCode = formData.get('zipCode')?.toString().trim() || '';
    const phone = formData.get('phone')?.toString().trim() || '';
    const role = formData.get('role')?.toString().trim() || '';
    const imgFile = formData.get('img') as File | null;

    let imgUrl = userExists.img; // Mantenemos la imagen actual por defecto

    if (imgFile && imgFile.size > 0) {
      const arrayBuffer = await imgFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // 👈 NUEVO SAAS: Organizamos las imágenes por tenant en Cloudinary
      const cloudinaryFolder = decoded.role === 'superadmin' ? 'saas_global/users' : `tenants/${decoded.tenantId}/users`;

      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { resource_type: 'image', folder: cloudinaryFolder },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        ).end(buffer);
      });
      imgUrl = (result as CloudinaryUploadResult).secure_url;
    }

    const updateData: any = {
      name,
      lastName,
      address,
      city,
      zipCode,
      phone,
      role,
      img: imgUrl,
    };

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error en PUT:', error);
    return NextResponse.json({ message: 'Error al actualizar el usuario' }, { status: 500 });
  }
}

// ✅ DELETE - Eliminar un usuario (Solo admin/superadmin)
export async function DELETE(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    if (!['admin', 'superadmin'].includes(decoded.role)) {
      return NextResponse.json({ message: 'Acceso denegado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ message: 'ID requerido' }, { status: 400 });

    // 👈 NUEVO SAAS: Verificamos propiedad antes de eliminar (Previene borrado cruzado de tenants)
    const tenantFilter = decoded.role === 'superadmin' ? {} : { tenantId: decoded.tenantId };
    const userExists = await User.findOne({ _id: id, ...tenantFilter });

    if (!userExists) {
      return NextResponse.json({ message: 'Usuario no encontrado o no tienes permiso para eliminarlo' }, { status: 404 });
    }

    await User.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error en DELETE:', error);
    return NextResponse.json({ message: 'Error al eliminar el usuario' }, { status: 500 });
  }
}