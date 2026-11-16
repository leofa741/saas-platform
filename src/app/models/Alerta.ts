import { Schema, model, models } from 'mongoose';

const AlertaSchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true }, // 👈 NUEVO
  usuario: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  cliente: {
    type: Schema.Types.ObjectId,
    ref: 'Cliente',
    index: true
  },
  tipo: {
    type: String,
    enum: ['propiedad', 'busqueda', 'novedades'],
    required: true
  },
  propiedad: {
    type: Schema.Types.ObjectId,
    ref: 'Property',
    index: true
  },
  criterios: {
    tipoOperacion: { type: String, enum: ['venta', 'alquiler', 'ambos'] },
    tipoPropiedad: [String],
    categoria: { type: String, enum: ['residencial', 'comercial', 'industrial', 'inversion'] },
    ubicacion: {
      barrio: [String],
      ciudad: String,
      provincia: String,
      precioMin: Number,
      precioMax: Number,
      metrosMin: Number,
      metrosMax: Number
    }
  },
  activo: { type: Boolean, default: true },
  frecuencia: {
    type: String,
    enum: ['inmediato', 'diario', 'semanal'],
    default: 'diario'
  },
  ultimoEnvio: Date,
  totalEnvios: { type: Number, default: 0 },
  ultimoClick: Date,
  eliminado: { type: Boolean, default: false, index: true }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

AlertaSchema.index({ tenantId: 1, usuario: 1, activo: 1 }, { partialFilterExpression: { eliminado: false } });
AlertaSchema.index({ tenantId: 1, tipo: 1, activo: 1 });
AlertaSchema.index({ tenantId: 1, frecuencia: 1, activo: 1, ultimoEnvio: 1 });

AlertaSchema.pre('save', function (next) {
  if (this.criterios?.tipoPropiedad) {
    this.criterios.tipoPropiedad = this.criterios.tipoPropiedad
      .map((t: string) => t.toLowerCase().trim())
      .filter(Boolean);
  }
  if (this.criterios?.ubicacion?.barrio) {
    this.criterios.ubicacion.barrio = this.criterios.ubicacion.barrio
      .map((b: string) => b.toLowerCase().trim())
      .filter(Boolean);
  }
  next();
});

const Alerta = models.Alerta || model('Alerta', AlertaSchema);
export default Alerta;