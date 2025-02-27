import mongoose, { Document, Schema } from 'mongoose';

export interface IAdminBalance extends Document {
    saldo: number;
    created_at: Date;
}

const adminBalanceSchema = new Schema({
    saldo: {
        type: Number,
        required: true,
        set: (v: any) => parseFloat(v), 
    },
    created_at: {
        type: Date,
        default: Date.now,
    }
});

const AdminBalance = mongoose.model<IAdminBalance>('AdminBalance', adminBalanceSchema);

export default AdminBalance;
