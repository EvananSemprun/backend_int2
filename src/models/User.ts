import mongoose, { Document, Schema } from 'mongoose';
import AdminBalance from './admin_balance';

export interface IUser extends Document {
  handle: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'vendedor' | 'cliente' | 'master';
  saldo: number;
  rango: 'ultrap' | 'diamante' | 'oro' | 'bronce';
}

const userSchema = new Schema({
  handle: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'vendedor', 'cliente', 'master'],
    required: true
  },
  saldo: {
    type: Number,
    min: 100,
    default: 100,
    set: (v: any) => parseFloat((parseFloat(v)).toFixed(2)),
    validate: {
      validator: async function (value: number) {
        if (this.role === 'cliente' || this.role === 'admin') {
          return value >= 100;
        } else if (['vendedor', 'master'].includes(this.role)) {
          const adminBalance = await AdminBalance.findOne().sort({ created_at: -1 }).limit(1);
          return adminBalance && value === adminBalance.saldo;
        }
        return true;
      },
      message: 'El saldo debe ser al menos 100 para clientes y administradores, o igual al saldo del administrador para vendedores y masters.'
    }
  },
  rango: {
    type: String,
    enum: ['ultrap', 'diamante', 'oro', 'bronce'],
    required: true
  }
});

userSchema.index({ handle: 1, email: 1 }, { unique: true });

const User = mongoose.model<IUser>('User', userSchema);

export default User;