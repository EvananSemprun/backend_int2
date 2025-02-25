import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  product_group: string;
  name: string;
  code: string;
  type: string;
  price: number;
  special_price?: number;
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
  special_price: {
    type: Number,
    set: (v: any) => v != null ? parseFloat(v) : v 
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
