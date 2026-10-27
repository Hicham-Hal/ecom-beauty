import e, { urlencoded } from 'express'
import { configDotenv } from 'dotenv'
import authRoute from './routes/auth.route.js'
import adminRoute from './routes/admin.route.js'
import clientRoute from './routes/client.route.js'
import cookieParser from 'cookie-parser';
import paymentRoute from './routes/payment.route.js'
import cartRoute from './routes/cart.route.js'

const app = e()


app.use('/payment', paymentRoute)
app.use(e.json())
app.use(cookieParser())
app.use(e.urlencoded({ extended: false }))
app.use('/', authRoute)
app.use('/dashboard', adminRoute)
app.use('/', clientRoute)
app.use('/cart', cartRoute)

export default app