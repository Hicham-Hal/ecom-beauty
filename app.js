import e, { urlencoded } from 'express'
import { configDotenv } from 'dotenv'
import authRoute from './routes/auth.route.js'
import adminRoute from './routes/admin.route.js'
import clientRoute from './routes/client.route.js'
import cookieParser from 'cookie-parser';
import paymentRoute from './routes/payment.route.js'
import cartRoute from './routes/cart.route.js'
import cors from 'cors'
import multer from 'multer'

const app = e()

app.use(cors())

app.use('/payment', paymentRoute)
app.use(e.json())
app.use(cookieParser())
app.use(e.urlencoded({ extended: false }))
app.use('/', authRoute)
app.use('/dashboard', adminRoute)
app.use('/', clientRoute)
app.use('/cart', cartRoute)


app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File too large (max 100MB)' })
        }
        return res.status(400).json({ message: err.message })
    }
    if (err.message === 'Only image or video files are allowed') {
        return res.status(400).json({ message: err.message })
    }
    next(err)
})

export default app