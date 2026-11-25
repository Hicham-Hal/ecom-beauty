import e from 'express'
import rateLimit from 'express-rate-limit'
import { createOrder, payOrder, getOrderStatus, getOrders, updateOrderStatus } from '../controllers/order.controller.js'
import { validateToken } from '../lib/validToken.js'
import { isAdmin } from '../lib/isAdmin.js'

const route = e.Router()

// customers have no account: limit what a single IP can create (30 per hour by default)
const customerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: Number(process.env.ORDER_RATE_LIMIT) || 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, try again later' },
})

// the confirmation page asks this a few times after the card payment (120 per 15 minutes per IP)
const statusLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, try again later' },
})

// customers (public)
route.post('/orders', customerLimiter, createOrder)
route.post('/orders/:id/payment', customerLimiter, payOrder)
route.get('/orders/:id/status', statusLimiter, getOrderStatus)

// seller (admin)
route.get('/orders', validateToken, isAdmin, getOrders)
route.patch('/orders/:id', validateToken, isAdmin, updateOrderStatus)

export default route
