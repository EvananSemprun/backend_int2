import mongoose, { Document, Schema } from 'mongoose';

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  amount: number;
  previousBalance: number;
  type: 'recarga' | 'retiro';
  created_at: Date;
}

const transactionSchema = new Schema({
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

const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);

export default Transaction;
