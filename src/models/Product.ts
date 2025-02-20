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
    required: true
  },
  special_price: {
    type: Number
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
