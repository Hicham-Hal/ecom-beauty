import mongoose from 'mongoose'

const itemSchema = new mongoose.Schema(
    {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        name: { fr: { type: String, default: '' }, ar: { type: String, default: '' } },
        image: { type: String, default: '' },
        price: { type: Number, required: true, min: 0 },
        prepDays: { type: Number, default: 0 },
        size: { type: String, default: '' },
        color: { type: String, default: '' },
        quantity: { type: Number, required: true, min: 1 },
        bodyNote: { type: String, default: '' },
    },
    { _id: false }
)

const orderSchema = new mongoose.Schema(
    {
        orderNumber: { type: String, required: true, unique: true },
        items: { type: [itemSchema], validate: [(a) => a.length > 0, 'Order needs items'] },
        customer: {
            firstName: { type: String, required: true, trim: true },
            lastName: { type: String, required: true, trim: true },
            phone: { type: String, required: true, trim: true },
            wilaya: { type: String, required: true, trim: true },
            wilayaCode: { type: String, required: true },
            commune: { type: String, required: true, trim: true },
            deliveryType: { type: String, enum: ['home', 'stopdesk'], required: true },
        },
        deliveryCompany: { type: String, default: 'Yalidine' },
        productsTotal: { type: Number, required: true, min: 0 },
        deliveryPrice: { type: Number, required: true, min: 0 },
        totalDue: { type: Number, required: true, min: 0 },
        status: { type: String, enum: ['unpaid', 'pending', 'confirmed', 'refused'], default: 'unpaid', index: true },
        paid: { type: Boolean, default: false },
        paymentMethod: { type: String, enum: ['online', 'post', null], default: null },
        deposit: { type: Number, default: null },
        receiptImage: { type: String, default: null },
        paidAt: { type: Date, default: null },
        chargilyCheckoutId: { type: String, default: null },
    },
    { timestamps: true }
)

orderSchema.set('toJSON', {
    versionKey: false,
    transform: (doc, ret) => {
        ret.id = String(ret._id)
        delete ret._id
        ret.createdAt = new Date(ret.createdAt).getTime()
        ret.paidAt = ret.paidAt ? new Date(ret.paidAt).getTime() : null
        delete ret.updatedAt
        delete ret.chargilyCheckoutId
        ret.items = (ret.items || []).map((it) => ({
            ...it,
            productId: String(it.productId),
            key: `${it.productId}__${it.size}__${it.color}__`,
        }))
        return ret
    },
})

export default mongoose.model('Order', orderSchema)