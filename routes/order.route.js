import e from 'express'
import rateLimit from 'express-rate-limit'
import {
    createOrder, payOrder, getOrders, updateOrderStatus,
    getDeliveryPrices, saveDeliveryPrices,
} from '../controllers/order.controller.js'
import { validateToken } from '../lib/validToken.js'
import { isAdmin } from '../lib/isAdmin.js'

const route = e.Router()

// public endpoints that create data: limit abuse (per IP)
const orderLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, try again later' },
})

// orders
route.post('/orders', orderLimiter, createOrder)                    // public
route.post('/orders/:id/payment', orderLimiter, payOrder)           // public
route.get('/orders', validateToken, isAdmin, getOrders)             // admin
route.patch('/orders/:id', validateToken, isAdmin, updateOrderStatus) // admin

// delivery prices
route.get('/delivery-prices', getDeliveryPrices)                          // public
route.put('/delivery-prices', validateToken, isAdmin, saveDeliveryPrices) // admin

export default route
