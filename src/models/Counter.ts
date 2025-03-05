import mongoose, { Schema } from 'mongoose';

const counterSchema = new Schema({
    name: { type: String, required: true, unique: true },
    value: { type: Number, default: 1 }
});

const Counter = mongoose.model('Counter', counterSchema);

export default Counter;
