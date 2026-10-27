import mongoose from 'mongoose'


const orderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    title: {type: String, required: true},
    price: {type: Number, required: true},
    quantity: {type: Number, required: true, min: 1},
    image: {type: String}
}, {_id : false})

const orderSchema = new mongoose.Schema({
    customer: {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        phone: { type: String, required: true }
    },
    items: [orderItemSchema],
    shippingAddress: {
        wilaya: { type: String, required: true },
        commune: { type: String, required: true },
        deliveryType: { type: String, enum: ['home', 'stopdesk'], required: true }
    },
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        title: String,
        price: Number,
        quantity: Number,
        image: String
    }],
    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['cod', 'chargily'], default: 'cod' },
    status: { type: String, enum: ['pending', 'paid', 'confirmed', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
    cartId: { type: mongoose.Schema.Types.ObjectId },   // needed so the webhook can clear the cart later
    chargilyCheckoutId: String
}, { timestamps: true })

const Order = mongoose.model('Order', orderSchema)

export default Order