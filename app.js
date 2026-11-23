import e, { urlencoded } from 'express'
import { configDotenv } from 'dotenv'
import authRoute from './routes/auth.route.js'
import cookieParser from 'cookie-parser';
import paymentRoute from './routes/payment.route.js'
import productRoute from './routes/product.route.js'
import categoryRoute from './routes/Category.route.js'
import galleryRoute from './routes/Gallery.route.js'
import cors from 'cors'
import settingsRoute from './routes/setting.route.js'
import uploadRoute from './routes/upload.route.js'
import multer from 'multer'

configDotenv()

const app = e()

app.use(cors({ origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(",") : true }))
app.use(e.json({ limit: '1mb' }))
app.use(cookieParser())
app.use(e.urlencoded({ extended: false }))

app.use('/api/health', (req, res)=> res.json({ ok: true }))
app.use('/api/payment', paymentRoute)
app.use('/api/auth', authRoute)
app.use('/api', uploadRoute)
app.use('/api', galleryRoute)
app.use('/api', productRoute)
app.use('/api', categoryRoute)
app.use('/api', settingsRoute)


app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: `File too large (max ${req.isAdmin ? 100 : 5}MB)` })
        }
        return res.status(400).json({ message: err.message })
    }
    if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON' })
    if (err.status && err.status < 500) return res.status(err.status).json({ message: err.message })
    console.error(err)
    return res.status(500).json({ message: 'Something went wrong' })
})



export default app