// Usage: npm run delete-user -- email@example.com
import mongoose from 'mongoose'
import User from '../models/User.model.js'
import { mongoURI } from '../lib/connectDB..js'

const email = process.argv[2]?.trim().toLowerCase()
if (!email) {
    console.log('Usage: npm run delete-user -- email@example.com')
    process.exit(1)
}

try {
    await mongoose.connect(mongoURI)
    const user = await User.findOne({ email })
    if (!user) {
        console.log(`No user with the email ${email}`)
        process.exitCode = 1
    } else {
        const admins = await User.countDocuments({ role: 'admin' })
        if (user.role === 'admin' && admins <= 1) {
            console.log('Refused: this is the only admin. Create the new admin first.')
            process.exitCode = 1
        } else {
            await user.deleteOne()
            console.log(`Deleted: ${email}`)
        }
    }
} finally {
    await mongoose.disconnect()
}