import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import User from '@/app/models/User';
import connectDB from '@/app/lib/mongoose';

// 👈 NUEVO SAAS: Agregamos tenantId a la interfaz del token
interface DecodedToken {
    id: string;
    tenantId: string; 
}

connectDB();

function getTokenFromRequest(req: NextRequest): string | null {
    return req.headers.get('Authorization')?.split(' ')[1] || null;
}

export async function POST(req: NextRequest) {
    try {
        const token = getTokenFromRequest(req);
        if (!token) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        let decoded: DecodedToken;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
        } catch (error) {
            console.error('Error al decodificar el token:', error);
            return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 });
        }

        const body = await req.json();
        const { name, lastName, address, city, zipCode, phone } = body;

        if (!name || !lastName || !address || !city || !zipCode || !phone) {
            return NextResponse.json(
                { error: 'Todos los campos son obligatorios' },
                { status: 400 }
            );
        }

        // 🎯 LA CLAVE: Actualizar SOLO si el ID y el tenantId coinciden.
        // Esto hace la operación atómica, segura y elimina la necesidad de markModified.
        const updatedUser = await User.findOneAndUpdate(
            { _id: decoded.id, tenantId: decoded.tenantId }, // 👈 Filtro de seguridad estricto
            { 
                $set: { 
                    name: name.trim(),
                    lastName: lastName.trim(),
                    address: address.trim(),
                    city: city.trim(),
                    zipCode: zipCode.trim(),
                    phone: phone.trim()
                } 
            },
            { new: true, runValidators: true }
        ).select('-password -resetPasswordToken -resetPasswordExpires'); // Nunca devolvemos datos sensibles

        if (!updatedUser) {
            return NextResponse.json(
                { error: 'Usuario no encontrado o no tienes permiso para actualizar estos datos' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { message: 'Datos guardados correctamente', user: updatedUser },
            { status: 200 }
        );
    } catch (error) {
        console.error('❌ Error al guardar los datos:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}