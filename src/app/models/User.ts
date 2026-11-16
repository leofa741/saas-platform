import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUser extends Document {
    tenantId: mongoose.Types.ObjectId; // 👈 NUEVO CAMPO
    name: string;
    lastName: string;
    phone: string;
    address: String;
    city: String;
    zipCode: String;
    img: string;
    google: string;
    email: string;
    password: string;
    role: string;
    resetPasswordToken: string;
    resetPasswordExpires: number;
    comparePassword: (password: string) => Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true }, // 👈 NUEVO
    name: { type: String, default: '' },
    lastName: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    zipCode: { type: String, default: '' },
    phone: { type: String, default: '' },
    img: { type: String, default: '' },
    google: { type: String, default: '' },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Number },
    role: { type: String, default: 'user' },
});

UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
    return await bcrypt.compare(password, this.password);
};

const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;