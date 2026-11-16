import mongoose, { Schema, model, models, Document } from 'mongoose';

export interface IInsumoPresupuesto {
  id: string;
  nombre: string;
  unidadMedida: string;
  costoUnitario: number;
  cantidad: number;
  subtotal: number;
  esPersonalizado: boolean;
}

export interface IPresupuestoInterno extends Document {
  tenantId: mongoose.Types.ObjectId; // 👈 NUEVO
  nombreProyecto: string;
  notasInternas?: string;
  insumos: IInsumoPresupuesto[];
  tiempoManoDeObraMinutos: number;
  valorHoraManoDeObra: number;
  margenGananciaPorcentaje: number;
  precioFinalEstimado: number;
  costoTotal: number;
  creadoPor: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InsumoPresupuestoSchema = new Schema<IInsumoPresupuesto>({
  id: { type: String, required: true },
  nombre: { type: String, required: true },
  unidadMedida: { type: String, required: true },
  costoUnitario: { type: Number, required: true },
  cantidad: { type: Number, required: true },
  subtotal: { type: Number, required: true },
  esPersonalizado: { type: Boolean, default: false }
}, { _id: false });

const PresupuestoInternoSchema = new Schema<IPresupuestoInterno>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true }, // 👈 NUEVO
  nombreProyecto: { type: String, required: true, trim: true },
  notasInternas: { type: String, default: '' },
  insumos: { type: [InsumoPresupuestoSchema], required: true },
  tiempoManoDeObraMinutos: { type: Number, default: 0 },
  valorHoraManoDeObra: { type: Number, default: 0 },
  margenGananciaPorcentaje: { type: Number, default: 0 },
  precioFinalEstimado: { type: Number, required: true },
  costoTotal: { type: Number, required: true },
  creadoPor: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { 
  timestamps: true 
});

PresupuestoInternoSchema.index({ tenantId: 1, creadoPor: 1, createdAt: -1 });

const PresupuestoInterno = models.PresupuestoInterno || model<IPresupuestoInterno>('PresupuestoInterno', PresupuestoInternoSchema);
export default PresupuestoInterno;