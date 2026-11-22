// Usage: npm run create-admin -- "Name" email@example.com "Password123"
import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import User from '../models/User.model.js'
import { mongoURI } from '../lib/connectDB..js'


const [name, emailArg, password] = process.argv.slice(2)
if (!name || !emailArg || !password) {
    console.log('Usage: npm run create-admin -- "Name" email@example.com "Password123"')
    process.exit(1)
}
if (password.length < 8 || !/\d/.test(password)) {
    console.log('Password must have at least 8 characters and one number')
    process.exit(1)
}

const email = emailArg.trim().toLowerCase()
try {
    await mongoose.connect(mongoURI)
    const hashed = await bcrypt.hash(password, 12)
    const existing = await User.findOne({ email })
    if (existing) {
        existing.name = name.trim()
        existing.password = hashed
        existing.role = 'admin'
        await existing.save()
        console.log(`Existing user updated: ${email}`)
    } else {
        await User.create({ name: name.trim(), email, password: hashed, role: 'admin' })
        console.log(`Admin created: ${email}`)
    }
} finally {
    await mongoose.disconnect()
}