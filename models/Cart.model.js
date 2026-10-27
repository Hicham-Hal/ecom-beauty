import mongoose from 'mongoose'
import Product from './Product.model.js'

const cartSchema = new mongoose.Schema({
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true, min: 1, default: 1 }
    }],

    updatedAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 }
}, { timestamps: false })

const Cart = mongoose.model('Cart', cartSchema)

export default Cart