/* eslint-disable */
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { NextAuthOptions } from 'next-auth';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

import connectDB from './mongoose';
import UserModel from '../models/User';
import ClienteModel from '../models/Cliente';
import AlertaModel from '../models/Alerta';
import LogModel from '../models/LogLogin';
import { emailTransporter } from './emails/transporter';
import { getLoginAlertTemplate } from './emails/templates/loginAlert';
import { getWelcomeEmailTemplate } from './emails/templates/welcomeEmail';
import TenantModel from '../models/Tenant'; // 👈 Agrega esta línea junto a los otros imports

// ✅ 1. SALVAGUARDAS "BUILD-SAFE" (Sin throws que rompan Render/Vercel)
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'fallback_secret_para_build';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'fallback_id';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'fallback_secret';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_jwt_secret';
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || 'localhost'; // Para usuarios nuevos de Google

connectDB();

export interface DecodedToken {
  id: string;
  email: string;
  role: string;
  tenantId: string; // 👈 NUEVO: El tenant del usuario
}

type ExtendedUser = {
  id: string;
  email: string;
  role: string;
  name: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  zipCode: string;
  image: string;
  token: string;
  tenantId: string; // 👈 NUEVO: El tenant del usuario
};

// ✅ Función para normalizar teléfono
function normalizeTelefono(text?: string): string | null {
  if (!text) return null;
  const normalized = text.trim().replace(/\s+/g, '').replace(/[^0-9+]/g, '');
  return normalized || null;
}

// ✅ Función para normalizar razón social
function normalizeRazonSocial(text: string): string {
  if (!text) return '';
  return text.trim().toLowerCase().replace(/\s+/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

// ✅ Función para crear cliente automáticamente (E-commerce)
// 👈 NUEVO: Ahora requiere tenantId
async function crearClienteAutomatico(userData: {
  name: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zipCode: string;
  img?: string;
  tenantId: string; // 👈 NUEVO
}) {
  try {
    // 👈 NUEVO: Buscar cliente dentro del mismo tenant
    const clienteExistente = await ClienteModel.findOne({
      email: userData.email,
      tenantId: userData.tenantId
    });
    if (clienteExistente) return clienteExistente;

    const nombreRaw = (userData.name || 'Cliente').trim();
    const apellidoRaw = (userData.lastName || '').trim();
    const nombre = nombreRaw || 'Cliente';
    const apellido = apellidoRaw || 'Cliente';

    const razonSocial = `${nombre} ${apellido} ${userData.email}`.trim();
    const razonSocialNormalized = normalizeRazonSocial(razonSocial);

    let telefono: string | null = null;
    let telefonoNormalized: string | null = null;

    const phoneTrimmed = userData.phone?.trim();
    if (phoneTrimmed && phoneTrimmed !== '00000000' && /[\d+]/.test(phoneTrimmed)) {
      telefono = phoneTrimmed;
      telefonoNormalized = normalizeTelefono(phoneTrimmed);

      // 👈 NUEVO: Buscar duplicados solo dentro del mismo tenant
      const yaExiste = await ClienteModel.findOne({
        telefonoNormalized,
        tenantId: userData.tenantId
      });
      if (yaExiste) {
        telefono = null;
        telefonoNormalized = null;
      }
    }

    const telefonoFinal = telefono || `SIN_TELEFONO_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const clienteData: any = {
      tenantId: userData.tenantId, // 👈 NUEVO: Asignar al tenant
      razonSocial,
      razonSocialNormalized,
      nombre,
      apellido,
      email: userData.email,
      direccion: userData.address || '',
      ciudad: userData.city || 'Buenos Aires',
      provincia: 'Buenos Aires',
      formaPago: 'transferencia',
      activo: true,
      origen: 'registro_automatico',
      telefono: telefonoFinal,
      telefonoNormalized: telefonoNormalized
    };

    const nuevoCliente = new ClienteModel(clienteData);
    return await nuevoCliente.save();

  } catch (error: any) {
    console.error('❌ Error creando cliente automático:', error);
    if (error.code === 11000 || error.statusCode === 409) {
      try {
        const nombre = (userData.name || 'Cliente').trim();
        const apellido = (userData.lastName || '').trim();
        const razonSocial = `${nombre} ${apellido} ${userData.email}`.trim();

        return await ClienteModel.create({
          tenantId: userData.tenantId, // 👈 NUEVO
          razonSocial,
          razonSocialNormalized: normalizeRazonSocial(razonSocial),
          nombre,
          apellido,
          email: userData.email,
          telefono: `SIN_TELEFONO_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          telefonoNormalized: null,
          direccion: userData.address || '',
          ciudad: userData.city || 'Buenos Aires',
          provincia: 'Buenos Aires',
          formaPago: 'transferencia',
          activo: true,
          origen: 'registro_automatico_fallback'
        });
      } catch (fallbackError) {
        console.error('❌ Fallback también falló:', fallbackError);
        throw fallbackError;
      }
    }
    throw error;
  }
}

// 📧 FUNCIÓN CENTRALIZADA DE ENVÍO DE EMAILS
async function sendEmail({ to, subject, html, text, tenantName }: { to: string; subject: string; html: string; text?: string; tenantName?: string }) {
  try {
    await emailTransporter.sendMail({
      from: `"${tenantName || process.env.BRAND_NAME || 'EmprendeFácil'}" <${process.env.MAILER_EMAIL}>`,
      to,
      subject,
      html,
      text,
    });
    return true;
  } catch (error) {
    console.error("❌ Error enviando email:", error);
    return false;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Contraseña', type: 'password' },
        tenantId: { label: 'Tenant ID', type: 'text' }, // 👈 NUEVO: El frontend debe enviar esto
      },
      async authorize(credentials): Promise<ExtendedUser | null> {
        await connectDB();

        // 👈 NUEVO: Buscar usuario por email Y tenantId (si se proporciona)
        const query: any = { email: credentials?.email };
        if (credentials?.tenantId) {
          query.tenantId = credentials.tenantId;
        }

        const user = await UserModel.findOne(query);
        if (!user) throw new Error('Usuario no encontrado o no pertenece a esta tienda');

        const isMatch = await bcrypt.compare(credentials!.password, user.password);
        if (!isMatch) throw new Error('Contraseña incorrecta');

        if (user.role === 'user' || user.role === 'cliente') {
          await crearClienteAutomatico({
            name: user.name,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            address: user.address,
            city: user.city,
            zipCode: user.zipCode,
            img: user.img,
            tenantId: user.tenantId.toString(), // 👈 NUEVO
          });
        }

        const token = jwt.sign(
          {
            id: user.id.toString(),
            email: user.email,
            role: user.role,
            tenantId: user.tenantId.toString(), // 👈 NUEVO
            name: user.name,
            lastName: user.lastName,
            phone: user.phone,
            address: user.address,
            city: user.city,
            zipCode: user.zipCode
          },
          JWT_SECRET,
          { expiresIn: '30d' }
        );

        return {
          id: user.id.toString(),
          email: user.email,
          role: user.role,
          tenantId: user.tenantId.toString(), // 👈 NUEVO
          name: user.name,
          lastName: user.lastName || '',
          phone: user.phone || '',
          address: user.address || '',
          city: user.city || '',
          zipCode: user.zipCode || '',
          image: user.img,
          token,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      await connectDB();
      let esUsuarioNuevoGoogle = false;

      if (account?.provider === 'google') {
        // 👈 NUEVO: Buscamos por email. En un SaaS maduro, aquí deberíamos validar el tenant 
        // a través del 'state' de OAuth, pero por ahora usamos el primero que encontremos o el default.
        let existingUser = await UserModel.findOne({ email: user.email });

        if (!existingUser) {
          esUsuarioNuevoGoogle = true;

          const fullName = user.name || 'Cliente';
          const nameParts = fullName.split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Cliente';

          existingUser = new UserModel({
            name: firstName,
            lastName: lastName,
            phone: '',
            address: '',
            city: 'Buenos Aires',
            zipCode: '',
            email: user.email,
            img: user.image || '',
            password: await bcrypt.hash('google-auth', 10),
            role: 'user',
            google: true,
            tenantId: DEFAULT_TENANT_ID, // 👈 NUEVO: Asignar tenant por defecto
          });
          await existingUser.save();

          if (existingUser.role === 'user' || existingUser.role === 'cliente') {
            const clienteGuardado = await crearClienteAutomatico({
              name: existingUser.name,
              lastName: existingUser.lastName,
              email: existingUser.email,
              phone: existingUser.phone,
              address: existingUser.address,
              city: existingUser.city,
              zipCode: existingUser.zipCode,
              img: existingUser.img,
              tenantId: DEFAULT_TENANT_ID, // 👈 NUEVO
            });

            if (clienteGuardado?._id) {
              try {
                await AlertaModel.create({
                  tenantId: DEFAULT_TENANT_ID, // 👈 NUEVO
                  usuario: existingUser._id,
                  cliente: clienteGuardado._id,
                  tipo: 'novedades',
                  criterios: { categorias: ['todas'], incluyeOfertas: true, recordatorioCumpleanos: true },
                  frecuencia: 'semanal',
                  activo: true
                });

                const emailData = getWelcomeEmailTemplate(existingUser.name || '', existingUser.email);
                await sendEmail({
                  to: existingUser.email,
                  subject: emailData.subject,
                  html: emailData.html,
                  text: emailData.text,
                  tenantName: process.env.BRAND_NAME // 👈 NUEVO
                });

                console.log(`✅ Email de bienvenida enviado a ${existingUser.email}`);
              } catch (alertError) {
                console.error('⚠️ Error creando alerta o enviando email:', alertError);
              }
            }
          }
        } else {
          // Usuario de Google existente: aseguramos que tenga cliente y alerta
          if (existingUser.role === 'user' || existingUser.role === 'cliente') {
            const clienteGuardado = await crearClienteAutomatico({
              name: existingUser.name,
              lastName: existingUser.lastName,
              email: existingUser.email,
              phone: existingUser.phone,
              address: existingUser.address,
              city: existingUser.city,
              zipCode: existingUser.zipCode,
              img: existingUser.img,
              tenantId: existingUser.tenantId.toString(), // 👈 NUEVO
            });

            if (clienteGuardado?._id) {
              try {
                const yaTieneAlertas = await AlertaModel.findOne({
                  tenantId: existingUser.tenantId, // 👈 NUEVO
                  usuario: existingUser._id,
                  tipo: 'novedades',
                  activo: true
                });
                if (!yaTieneAlertas) {
                  await AlertaModel.create({
                    tenantId: existingUser.tenantId, // 👈 NUEVO
                    usuario: existingUser._id,
                    cliente: clienteGuardado._id,
                    tipo: 'novedades',
                    criterios: { categorias: ['todas'], incluyeOfertas: true },
                    frecuencia: 'semanal',
                    activo: true
                  });
                  console.log(`✅ Alerta de novedades creada para usuario existente: ${existingUser.email}`);
                }
              } catch (alertError) {
                console.error('⚠️ Error creando alerta para usuario existente:', alertError);
              }
            }
          }
        }

        const token = jwt.sign(
          {
            id: existingUser.id.toString(),
            email: existingUser.email,
            role: existingUser.role,
            tenantId: existingUser.tenantId.toString(), // 👈 NUEVO
            name: existingUser.name,
            lastName: existingUser.lastName,
            phone: existingUser.phone,
            address: existingUser.address,
            city: existingUser.city,
            zipCode: existingUser.zipCode,
          },
          JWT_SECRET,
          { expiresIn: '30d' }
        );

        const u = user as ExtendedUser;
        u.id = existingUser.id.toString();
        u.role = existingUser.role;
        u.tenantId = existingUser.tenantId.toString(); // 👈 NUEVO
        u.token = token;
        u.lastName = existingUser.lastName || '';
        u.phone = existingUser.phone || '';
        u.address = existingUser.address || '';
        u.city = existingUser.city || '';
        u.zipCode = existingUser.zipCode || '';
        u.image = existingUser.img || '';
        u.name = existingUser.name || '';
      }

      try {
        const role = (user as any).role || (account?.provider === 'google' ? (await UserModel.findOne({ email: user.email }))?.role : null);
        if (role === 'admin' || role === 'superadmin' || role === 'vendedor') {
          await LogModel.create({
            email: user.email,
            provider: account?.provider || 'credentials',
            timestamp: new Date(),
          });
        }
      } catch (error) {
        console.error("Error guardando bitácora:", error);
      }

    

      if (!esUsuarioNuevoGoogle) {
        // 1. Obtenemos el tenantId del usuario que acaba de iniciar sesión
        const currentTenantId = (user as any).tenantId;

        // 2. Buscamos el nombre real de su tienda en la BD (con fallback por seguridad)
        let dynamicBrandName = process.env.BRAND_NAME || 'EmprendeFácil';

        if (currentTenantId) {
          const tenant = await TenantModel.findById(currentTenantId);
          if (tenant && tenant.nombre) {
            dynamicBrandName = tenant.nombre; // 👈 ¡Aquí está la magia!
          }
        }

        // 3. Generamos la plantilla pasándole el nombre DINÁMICO
        const loginEmailData = getLoginAlertTemplate(user.email as string, dynamicBrandName);

        // 4. Enviamos el correo usando ese nombre dinámico tanto en el contenido como en el "From"
        await sendEmail({
          to: user.email as string,
          subject: loginEmailData.subject,
          html: loginEmailData.html,
          tenantName: dynamicBrandName // 👈 Esto hace que el remitente diga "Maktub" en vez de "Pretty Witches"
        });
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        const u = user as ExtendedUser;
        token.id = u.id;
        token.email = u.email;
        token.role = u.role;
        token.tenantId = u.tenantId; // 👈 NUEVO
        token.name = u.name;
        token.lastName = u.lastName;
        token.phone = u.phone;
        token.address = u.address;
        token.city = u.city;
        token.zipCode = u.zipCode;
        token.image = u.image;
        token.token = u.token;
      }
      return token;
    },

    async session({ session, token }) {
      const t = token as any;
      session.user.id = t.id;
      session.user.email = t.email;
      session.user.role = t.role;
      session.user.tenantId = t.tenantId; // 👈 NUEVO: Ahora está disponible en session.user.tenantId
      session.user.lastName = t.lastName;
      session.user.phone = t.phone;
      session.user.address = t.address;
      session.user.city = t.city;
      session.user.zipCode = t.zipCode;
      session.user.name = t.name;
      session.user.token = t.token || t.accessToken;
      return session;
    },
  },

  secret: NEXTAUTH_SECRET,
};

// Helpers de admin
export const verifyAdmin = async (req: NextRequest): Promise<DecodedToken | null> => {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    return ['admin', 'superadmin', 'vendedor'].includes(decoded.role) ? decoded : null;
  } catch {
    return null;
  }
};

export const verifyAdminToken = (token: string): DecodedToken | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    return ['admin', 'superadmin', 'vendedor'].includes(decoded.role) ? decoded : null;
  } catch {
    return null;
  }
};