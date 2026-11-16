import mongoose, { Schema, Document } from 'mongoose';

export interface IInsumo extends Document {
  tenantId: mongoose.Types.ObjectId; // 👈 NUEVO
  nombre: string;
  categoria: string;
  costo: number;
  cantidadPaquete: number;
  unidadMedida: string;
  stockActual: number;
  activo: boolean;
  creadoPor: string;
}

const InsumoSchema = new Schema<IInsumo>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true }, // 👈 NUEVO
    nombre: { type: String, required: true, trim: true },
    categoria: { type: String, required: true, trim: true },
    costo: { type: Number, required: true, min: 0 },
    cantidadPaquete: { type: Number, required: true, min: 0.01 },
    unidadMedida: { type: String, required: true, trim: true },
    stockActual: { type: Number, required: true, default: 0 },
    activo: { type: Boolean, default: true },
    creadoPor: { type: String, required: true }
  },
  { timestamps: true }
);

InsumoSchema.index({ tenantId: 1, nombre: 'text', categoria: 'text' });

export default mongoose.models.Insumo || mongoose.model<IInsumo>('Insumo', InsumoSchema);