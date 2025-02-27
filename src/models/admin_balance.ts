import mongoose, { Document, Schema } from 'mongoose';

export interface IAdminBalance extends Document {
    saldo: number;
    currentSaldo: number;
    created_at: Date;
}

const adminBalanceSchema = new Schema({
    saldo: {
        type: Number,
        required: true,
        set: (v: any) => parseFloat(v), 
    },
    currentSaldo: { 
        type: Number,
        required: true,
        set: (v: any) => parseFloat(v),
        default: 0,
    },
    created_at: {
        type: Date,
        default: Date.now, 
    }
});

adminBalanceSchema.pre('save', function (next) {
    if (!this.currentSaldo && this.saldo !== undefined) {
        this.currentSaldo = this.saldo;
    }
    next();
});

const AdminBalance = mongoose.model<IAdminBalance>('AdminBalance', adminBalanceSchema);

export default AdminBalance;
