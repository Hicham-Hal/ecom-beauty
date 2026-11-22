import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },                    // bcrypt hash, never plain text
    role: { type: String, enum: ['admin'], default: 'admin' },
}, { timestamps: true })

// never send the password hash to the browser
userSchema.set('toJSON', {
    versionKey: false,
    transform: (doc, ret) => {
        delete ret.password
        return ret
    },
})

export default mongoose.model('User', userSchema)