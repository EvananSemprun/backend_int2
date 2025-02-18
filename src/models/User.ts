import mongoose, { Document, Schema } from 'mongoose';
import AdminBalance from './admin_balance';

export interface IUser extends Document {
    handle: string;
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'vendedor' | 'cliente'; 
    saldo: number; 
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
      enum: ['admin', 'vendedor', 'cliente'],
      required: true
    },
    saldo: {
      type: Number,
      min: 100,
      default: 100,
      validate: {
        validator: async function(value) {
          if (this.role === 'cliente') {
            return value >= 100;
          } else if (this.role === 'admin' || this.role === 'vendedor') {
            const adminBalance = await AdminBalance.findOne({});
            return adminBalance && value === adminBalance.saldo;
          }
          return true;
        },
        message: 'El saldo debe ser al menos 100 o el mismo saldo que el administrador para los roles admin y vendedor.'
      }
    }
  });
  
userSchema.index({ handle: 1, email: 1 }, { unique: true });

const User = mongoose.model<IUser>('User', userSchema);

export default User;
