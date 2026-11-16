// src/app/models/Tenant.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ITenant extends Document {
  nombre: string;
  subdomain: string;
  email: string;
  plan: 'free' | 'basic' | 'premium';
  activo: boolean;
  config: {
    colores: {
      primary: string;
      secondary: string;
    };
    logoUrl: string;
    whatsapp: string;
    description: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const tenantSchema = new Schema<ITenant>({
  nombre: { type: String, required: true },
  subdomain: { type: String, required: true, unique: true, lowercase: true, trim: true },
  email: { type: String, required: true, unique: true },
  plan: { type: String, enum: ['free', 'basic', 'premium'], default: 'free' },
  activo: { type: Boolean, default: true },
  config: {
    colores: {
      primary: { type: String, default: '#3D2B1F' },
      secondary: { type: String, default: '#C9A961' },
    },
    logoUrl: { type: String, default: '' },
    whatsapp: { type: String, default: '' },
    description: { type: String, default: '' },
  },
}, {
  timestamps: true,
});

// Esta línea evita errores de recompilación en Next.js (dev mode)
export default mongoose.models.Tenant || mongoose.model<ITenant>('Tenant', tenantSchema);