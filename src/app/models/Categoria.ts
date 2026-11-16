import mongoose, { Schema, Document } from 'mongoose';

export interface ICategoria extends Document {
  tenantId: mongoose.Types.ObjectId; // 👈 NUEVO
  nombre: string;
  slug: string;
  parentId: mongoose.Types.ObjectId | null;
  activo: boolean;
}

const CategoriaSchema = new Schema<ICategoria>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true }, // 👈 NUEVO
    nombre: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'Categoria', default: null },
    activo: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Índice compuesto: slug único DENTRO de cada tenant (no global)
CategoriaSchema.index({ tenantId: 1, slug: 1 }, { unique: true });

export default mongoose.models.Categoria || mongoose.model<ICategoria>('Categoria', CategoriaSchema);