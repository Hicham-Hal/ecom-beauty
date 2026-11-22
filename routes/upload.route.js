import e from 'express'
import rateLimit from 'express-rate-limit'
import { optionalAdmin } from '../lib/optionalAdmin.js'
import { chooseUpload } from '../middlewares/uploads.js'
import { uploadToCloud } from '../lib/cloudinary.js'

const route = e.Router()

// customers: 20 receipt uploads per hour per IP. The admin is not limited.
const customerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 20,
    skip: (req) => req.isAdmin,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many uploads, try again later' },
})

// POST /uploads   multipart field "file"  ->  { url, type }
route.post('/uploads', optionalAdmin, customerLimiter, chooseUpload, async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'File is required' })
    try {
        const { url, type } = await uploadToCloud(req.file, req.isAdmin ? 'products' : 'receipts')
        return res.status(201).json({ url, type })
    } catch (err) {
        console.log(err)
        return res.status(500).json({ message: 'Upload failed' })
    }
})

export default route