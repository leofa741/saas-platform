import mongoose, { Schema, Document } from 'mongoose';

interface IInsumoUsado {
  insumoId: mongoose.Types.ObjectId;
  cantidadUsada: number;
  nombre?: string;
  costoUnitarioCalculado?: number;
  subtotalCalculado?: number;
}

export interface IProducto extends Document {
  tenantId: mongoose.Types.ObjectId; // 👈 NUEVO CAMPO
  nombre: string;
  descripcion: string;
  categoria: string;
  subcategoria: string;
  stock: number;
  insumos: IInsumoUsado[];
  tiempoManoDeObraMinutos: number;
  valorHoraManoDeObra: number;
  margenGananciaPorcentaje: number;
  precioFinalManual?: number;
  precioMayorista?: number;
  imagen?: string;
  activo: boolean;
  destacado: boolean;
  nuevo: boolean;
  costoTotalInsumos: number;
  costoManoObra: number;
  costoTotalProduccion: number;
  precioSugerido: number;
  estaEnPerdida: boolean;
  creadoPor: string;
}

const ProductoSchema = new Schema<IProducto>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true }, // 👈 NUEVO
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, required: true },
    categoria: { type: String, required: true },
    subcategoria: { type: String, default: '' },
    insumos: [{
      insumoId: { type: Schema.Types.ObjectId, ref: 'Insumo', required: true },
      cantidadUsada: { type: Number, required: true, min: 0.01 },
      nombre: { type: String },
      costoUnitarioCalculado: { type: Number },
      subtotalCalculado: { type: Number }
    }],
    stock: { type: Number, default: 0 },
    tiempoManoDeObraMinutos: { type: Number, default: 0 },
    valorHoraManoDeObra: { type: Number, default: 0 },
    margenGananciaPorcentaje: { type: Number, required: true, min: 0 },
    precioFinalManual: { type: Number },
    precioMayorista: { type: Number },
    imagen: { type: String, default: '' },
    activo: { type: Boolean, default: true },
    destacado: { type: Boolean, default: false },
    nuevo: { type: Boolean, default: false },
    costoTotalInsumos: { type: Number, default: 0 },
    costoManoObra: { type: Number, default: 0 },
    costoTotalProduccion: { type: Number, default: 0 },
    precioSugerido: { type: Number, default: 0 },
    estaEnPerdida: { type: Boolean, default: false },
    creadoPor: { type: String, required: true }
  },
  { timestamps: true }
);

// Índice compuesto para búsquedas rápidas por tenant + categoría
ProductoSchema.index({ tenantId: 1, categoria: 1, activo: 1 });

export default mongoose.models.Producto || mongoose.model<IProducto>('Producto', ProductoSchema);