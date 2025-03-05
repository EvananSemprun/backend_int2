import mongoose, { Document, Schema } from 'mongoose';
import Counter from './Counter';

export interface ISale extends Document {
    saleId: number;
    user?: {
        id: mongoose.Types.ObjectId;
        handle: string;
        name: string;
        email: string;
        role: string;
    };
    quantity: number;
    product: string;
    productName: string;
    totalPrice: number;
    moneydisp: number;
    status: string;
    order_id: string;
    pins: { serial: string; key: string }[];
    created_at: Date;
}

const saleSchema = new Schema({
    saleId: { 
        type: Number, 
        unique: true 
    },
    user: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
        handle: { type: String, required: false },
        name: { type: String, required: false },
        email: { type: String, required: false },
        role: { type: String, required: false }
    },
    quantity: { type: Number, required: true },
    product: { type: String, required: true },
    productName: { type: String, required: true },
    totalPrice: { type: Number, required: true },
    moneydisp: { type: Number, required: true }, 
    status: { type: String, required: true },
    order_id: { type: String, required: true },
    pins: [
        {
            serial: { type: String, required: false },
            key: { type: String, required: true }
        }
    ],
    created_at: { type: Date, default: Date.now }
});

saleSchema.pre('save', async function (next) {
    if (!this.isNew) return next(); 

    try {
        const counter = await Counter.findOneAndUpdate(
            { name: 'saleId' },
            { $inc: { value: 1 } },
            { new: true, upsert: true }
        );
        this.saleId = counter.value;
        next();
    } catch (error) {
        next(error);
    }
});

const Sale = mongoose.model<ISale>('Sale', saleSchema);

export default Sale;