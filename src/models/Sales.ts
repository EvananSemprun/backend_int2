import mongoose, { Document, Schema } from 'mongoose';

export interface ISale extends Document {
    user?: {
        id: mongoose.Types.ObjectId;
        handle: string;
        name: string;
        email: string;
    };
    quantity: number;
    product: string;
    status: string;
    order_id: string;
    pins: { serial: string; key: string }[];
    created_at: Date;
}

const saleSchema = new Schema({
    user: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
        handle: { type: String, required: false },
        name: { type: String, required: false },
        email: { type: String, required: false }
    },
    quantity: { type: Number, required: true },
    product: { type: String, required: true },
    productName: { type: String, required: true },  
    totalPrice: { type: Number, required: true },   
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

const Sale = mongoose.model<ISale>('Sale', saleSchema);


export default Sale;
