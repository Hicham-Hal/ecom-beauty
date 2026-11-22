import mongoose from 'mongoose'

const categorySchema = new mongoose.Schema(
    {
        _id: { type: String },                        // readable id: "caftans"
        fr: { type: String, required: true, trim: true },
        ar: { type: String, default: '', trim: true },
        image: { type: String, default: '' },
    },
    { timestamps: true }
)

categorySchema.set('toJSON', {
    versionKey: false,
    transform: (doc, ret) => {
        ret.id = ret._id
        delete ret._id
        delete ret.createdAt
        delete ret.updatedAt
        return ret
    },
})

export default mongoose.model('Category', categorySchema)