import { Schema, model, models, Document } from 'mongoose';

export interface IDisenoPersonalizado extends Document {
  tenantId: Schema.Types.ObjectId; // 👈 NUEVO
  cliente: Schema.Types.ObjectId;
  nombreCliente: string;
  emailCliente: string;
  telefonoCliente?: string;
  titulo: string;
  tipoProducto: string;
  descripcion: string;
  colores?: string;
  textoDeseado?: string;
  cantidad: number;
  fechaLimite?: Date;
  presupuestoEstimado?: number;
  imagenesReferencia?: string[];
  estado: string;
  mensajes: any[];
  pedidoGenerado?: Schema.Types.ObjectId;
  precioFinal?: number;
  fechaRespuestaAdmin?: Date;
  fechaAprobacionCliente?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MensajeSchema = new Schema({
  autor: { type: String, required: true },
  nombreAutor: { type: String, required: true },
  contenido: { type: String, required: true },
  imagen: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const DisenoPersonalizadoSchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true }, // 👈 NUEVO
  cliente: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  nombreCliente: { type: String, required: true },
  emailCliente: { type: String, required: true },
  telefonoCliente: { type: String },
  titulo: { type: String, required: true, trim: true },
  tipoProducto: { 
    type: String, 
    required: true,
    enum: [
      'collar_piedras', 'pulsera_macrame', 'aros_colgantes', 'decoracion_pared',
      'set_regalo', 'taza', 'remera', 'llavero_3d', 'figura_3d', 
      'sublimacion', 'candy', 'decoracion', 'otro'
    ]
  },
  descripcion: { type: String, required: true },
  colores: { type: String },
  textoDeseado: { type: String },
  cantidad: { type: Number, default: 1 },
  fechaLimite: { type: Date },
  presupuestoEstimado: { type: Number },
  imagenesReferencia: [{ type: String }],
  estado: {
    type: String,
    enum: [
      'pendiente', 'en_revision', 'consulta', 'vista_previa_enviada',
      'aprobado', 'en_produccion', 'completado', 'rechazado'
    ],
    default: 'pendiente'
  },
  mensajes: [MensajeSchema],
  pedidoGenerado: { type: Schema.Types.ObjectId, ref: 'Pedido' },
  precioFinal: { type: Number },
  fechaRespuestaAdmin: { type: Date },
  fechaAprobacionCliente: { type: Date }
}, {
  timestamps: true
});

DisenoPersonalizadoSchema.index({ tenantId: 1, cliente: 1, createdAt: -1 });
DisenoPersonalizadoSchema.index({ tenantId: 1, estado: 1 });

const DisenoPersonalizado = models.DisenoPersonalizado || model<IDisenoPersonalizado>('DisenoPersonalizado', DisenoPersonalizadoSchema);
export default DisenoPersonalizado;