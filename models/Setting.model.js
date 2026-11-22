import mongoose from 'mongoose'

const settingSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },   // "storeOpen" or "deliveryPrices"
    value: { type: mongoose.Schema.Types.Mixed },
})

export default mongoose.model('Setting', settingSchema)