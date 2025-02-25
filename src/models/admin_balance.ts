import mongoose, { Document, Schema } from 'mongoose';

export interface IAdminBalance extends Document {
    api_key: string;
    api_secret: string;
    saldo: number;
    created_at: Date;
}

const adminBalanceSchema = new Schema({
    api_key: {
        type: String,
        required: true,
    },
    api_secret: {
        type: String,
        required: true,
    },
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
