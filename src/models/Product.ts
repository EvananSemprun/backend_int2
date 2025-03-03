import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  product_group: string;
  name: string;
  code: string;
  type: string;
  price: number;
  price_oro: number;
  price_plata: number;
  price_bronce: number;
  available: boolean;
  created_at: Date;
}

const productSchema = new Schema({
  product_group: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    set: (v: any) => parseFloat(v)
  },
  price_oro: {
    type: Number,
    required: true,
    set: (v: any) => parseFloat(v)
  },
  price_plata: {
    type: Number,
    required: true,
    set: (v: any) => parseFloat(v)
  },
  price_bronce: {
    type: Number,
    required: true,
    set: (v: any) => parseFloat(v)
  },
  available: {
    type: Boolean,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

const Product = mongoose.model<IProduct>('Product', productSchema);

export default Product;