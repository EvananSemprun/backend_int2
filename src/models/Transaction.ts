import mongoose, { Document, Schema } from 'mongoose';
import Counter from './Counter';

export interface ITransaction extends Document {
  transactionId: number;
  userId: mongoose.Types.ObjectId;
  amount: number;
  previousBalance: number;
  type: 'recarga' | 'retiro';
  created_at: Date;
}

const transactionSchema = new Schema({
    transactionId: { 
        type: Number, 
        unique: true 
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        set: (v: any) => parseFloat(v)
    },
    previousBalance: {
        type: Number,
        required: true,
        set: (v: any) => parseFloat(v)
    },
    type: {
        type: String,
        enum: ['recarga', 'retiro'],
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    transactionUserName: {  
        type: String,
        required: true
    },
    userName: {          
        type: String,
        required: true
    },
    userEmail: {         
        type: String,
        required: true
    },
    userRole: {          
        type: String,
        required: true
    },
    userRango: {        
        type: String,
        required: true
    }
});

transactionSchema.pre('save', async function (next) {
    if (!this.isNew) return next();

    try {
        const counter = await Counter.findOneAndUpdate(
            { name: 'transactionId' },
            { $inc: { value: 1 } },
            { new: true, upsert: true }
        );
        this.transactionId = counter.value;
        next();
    } catch (error) {
        next(error);
    }
});

const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);

export default Transaction;
