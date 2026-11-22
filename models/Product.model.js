import mongoose from 'mongoose'

const colorSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    mediaUrl: { type: String, default: '' },
    mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
})

const productSchema = new mongoose.Schema(
    {
        name: {
            fr: { type: String, required: true, trim: true },
            ar: { type: String, trim: true, default: '' },
        },
        category: { type: String, required: true, index: true },   // = Category._id
        price: { type: Number, required: true, min: 0 },
        preparationDays: { type: Number, default: 0, min: 0 },
        sizes: { type: [String], default: [] },
        images: { type: [String], default: [] },                   // first = main image
        video: { type: String, default: '' },
        colors: { type: [colorSchema], default: [] },
        description: {
            fr: { type: String, default: '' },
            ar: { type: String, default: '' },
        },
        isBestSeller: { type: Boolean, default: false },
        isNewArrival: { type: Boolean, default: false },
        inStock: { type: Boolean, default: true },
    },
    { timestamps: true }
)

export default mongoose.model('Product', productSchema)