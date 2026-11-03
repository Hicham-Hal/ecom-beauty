import mongoose from 'mongoose'

const gallerySchema = new mongoose.Schema({
    url: { type: String, requried: true },
    type: { type: String, enum: ['image', 'video'], default: 'image' },
    placement: { type: String, enum: ['home', 'best', 'new', 'about'], default: 'home' }
}, { timestamps: true })



gallerySchema.set('toJSON', {
    versionKey: false,
    transform: (doc, ret) => {
        ret.id = ret._id
        ret.createdAt = new Date(ret.createdAt).getTime()
        delete ret._id
        delete ret.updatedAt
        return ret
    }
})

export default mongoose.model('Gallery', gallerySchema)