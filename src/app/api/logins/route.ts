import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/app/lib/mongoose";
import LogModel from "@/app/models/LogLogin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";

export async function GET(req: NextRequest) {
  await connectDB();
  
  const session = await getServerSession(authOptions);

  // 1. 🔒 Verificar autenticación y rol
  if (!session || !["admin", "superadmin"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // 2. 🏢 NUEVO SAAS: Extraer rol y tenantId para aplicar aislamiento
  const isSuperAdmin = session.user.role === "superadmin";
  const tenantId = (session.user as any).tenantId;

  const { searchParams } = new URL(req.url);

  const email = searchParams.get("email");
  const provider = searchParams.get("provider");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // 3. 🛡️ NUEVO SAAS: Construir filtros con aislamiento estricto
  let filters: any = {};

  // Si NO es superadmin, FORZAMOS el filtro por su tenantId
  if (!isSuperAdmin) {
    filters.tenantId = tenantId;
  }

  // Aplicar filtros adicionales de búsqueda (siempre dentro del contexto del tenant, a menos que sea superadmin)
  if (email) filters.email = { $regex: email, $options: "i" };
  if (provider) filters.provider = provider;
  
  if (from || to) {
    filters.timestamp = {};
    if (from) filters.timestamp.$gte = new Date(from);
    if (to) filters.timestamp.$lte = new Date(to);
  }

  // 4. Ejecutar consulta
  const logs = await LogModel.find(filters).sort({ timestamp: -1 });

  return NextResponse.json(logs);
}