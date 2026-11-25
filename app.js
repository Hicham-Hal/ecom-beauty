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
import orderRoute from './routes/order.route.js'


configDotenv()

const app = e()

// behind a reverse proxy (Render, Railway, Nginx...) set TRUST_PROXY=1 so rate limits see the real client IP
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1)

app.use(cors({ origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map((u) => u.trim()) : true }))

// The Chargily webhook needs the RAW body to verify its signature: it MUST be mounted BEFORE express.json()
app.use('/api/payment', paymentRoute)

app.use(e.json({ limit: '1mb' }))

app.get('/api/health', (req, res) => res.json({ ok: true }))
app.use('/api/auth', authRoute)
app.use('/api', uploadRoute)
app.use('/api', productRoute)
app.use('/api', categoryRoute)
app.use('/api', galleryRoute)
app.use('/api', settingsRoute)      // store open/closed + delivery prices
app.use('/api', orderRoute)         // orders + payment step

app.use('/api', (req, res) => res.status(404).json({ message: 'Route not found' }))

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: `File too large (max ${req.isAdmin ? 100 : 5}MB)` })
        }
        return res.status(400).json({ message: err.message })
    }
    if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON' })
    if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request too large' })
    if (err.status && err.status < 500) return res.status(err.status).json({ message: err.message })
    console.error(err)
    return res.status(500).json({ message: 'Something went wrong' })
})

export default app