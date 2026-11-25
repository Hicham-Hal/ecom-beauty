import mongoose from 'mongoose'
import Order from '../models/Order.model.js'
import Counter from '../models/Counter.model.js'
import Product from '../models/Product.model.js'
import Setting from '../models/Setting.model.js'
import { WILAYA_CODES, loadDeliveryPrices } from '../lib/deliveryPrices.js'
import { createChargilyCheckout, getChargilyCheckout } from '../lib/chargily.js'
import { DEPOSITS, confirmOnlinePayment, paidAmountIsValid } from '../lib/onlinePayment.js'

const STATUSES = ['unpaid', 'pending', 'confirmed', 'refused']
const DELIVERY_COMPANY = 'Yalidine'

class HttpError extends Error {
    constructor(status, message) {
        super(message)
        this.status = status
    }
}
const bad = (message) => { throw new HttpError(400, message) }

const str = (v, max = 120) => String(v ?? '').trim().slice(0, max)

const send = (res, err) => {
    if (err instanceof HttpError) return res.status(err.status).json({ message: err.message })
    console.log(err)
    return res.status(500).json({ message: 'Something went wrong' })
}

/* ---------- building an order ---------- */

const cleanCustomer = (c) => {
    if (!c || typeof c !== 'object') bad('Customer information is required')
    const firstName = str(c.firstName)
    const lastName = str(c.lastName)
    const wilaya = str(c.wilaya)
    const commune = str(c.commune)
    const wilayaCode = str(c.wilayaCode, 2)
    const phone = str(c.phone, 20).replace(/[\s.-]/g, '')
    const deliveryType = c.deliveryType

    if (!firstName || !lastName || !wilaya || !commune) bad('Customer information is incomplete')
    if (!WILAYA_CODES.includes(wilayaCode)) bad('Invalid wilaya')
    if (!/^(0|\+213)[567]\d{8}$/.test(phone)) bad('Invalid phone number')
    if (!['home', 'stopdesk'].includes(deliveryType)) bad('Invalid delivery type')

    return { firstName, lastName, phone, wilaya, wilayaCode, commune, deliveryType }
}

// Every item is rebuilt from the DATABASE: the browser only says which product, size, color and quantity.
const buildItems = async (rawItems) => {
    if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 30) bad('Cart is empty or too large')
    for (const it of rawItems) {
        if (!it || typeof it !== 'object' || typeof it.productId !== 'string' || !mongoose.isValidObjectId(it.productId)) {
            bad('Invalid product in the cart, please empty your cart and try again')
        }
    }

    const ids = [...new Set(rawItems.map((i) => i.productId))]
    const products = await Product.find({ _id: { $in: ids } })
    const byId = new Map(products.map((p) => [String(p._id), p]))

    return rawItems.map((it) => {
        const product = byId.get(it.productId)
        if (!product) bad('A product in your cart no longer exists')
        if (!product.inStock) bad(`"${product.name.fr}" is out of stock`)

        const quantity = Number(it.quantity)
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) bad('Invalid quantity')

        const size = str(it.size, 20)
        if (product.sizes.length > 0 && !product.sizes.includes(size)) bad(`Invalid size for "${product.name.fr}"`)

        const color = str(it.color, 60)
        const colorObj = product.colors.find((c) => c.name === color)
        if (product.colors.length > 0 && !colorObj) bad(`Invalid color for "${product.name.fr}"`)

        const image =
            colorObj && colorObj.mediaType === 'image' && colorObj.mediaUrl
                ? colorObj.mediaUrl
                : product.images[0] || ''

        return {
            productId: product._id,
            name: { fr: product.name.fr, ar: product.name.ar || product.name.fr },
            image,
            price: product.price,                          // the database price, never the browser's
            prepDays: product.preparationDays,
            size: product.sizes.length > 0 ? size : '',
            color: colorObj ? colorObj.name : '',
            quantity,
            bodyNote: str(it.bodyNote, 1000),
        }
    })
}

const nextOrderNumber = async () => {
    const counter = await Counter.findOneAndUpdate({ _id: 'order' }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' })
    return `JB-${1000 + counter.seq}`
}

// The receipt must be a file uploaded to OUR Cloudinary account (the seller opens this link)
const receiptUrlOk = (url) => {
    if (!/^https:\/\/\S+$/.test(url) || url.length > 500) return false
    const cloud = process.env.CLOUDINARY_CLOUD_NAME
    return cloud ? url.startsWith(`https://res.cloudinary.com/${cloud}/`) : true
}

/* ---------- POST /orders   (public: the customer has no account) ---------- */

export const createOrder = async (req, res) => {
    try {
        const storeOpen = await Setting.findOne({ key: 'storeOpen' })
        if (storeOpen && storeOpen.value === false) throw new HttpError(403, 'The store is closed')

        const customer = cleanCustomer(req.body.customer)
        const items = await buildItems(req.body.items)

        // delivery price: only what the seller saved. No price = no delivery.
        const prices = await loadDeliveryPrices()
        const deliveryPrice = prices?.[customer.wilayaCode]?.[customer.deliveryType]
        if (!Number.isFinite(deliveryPrice)) bad('Delivery is not available for this wilaya')

        const productsTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

        // status, paid, totals, orderNumber are NEVER taken from the request
        const order = await Order.create({
            orderNumber: await nextOrderNumber(),
            items,
            customer,
            deliveryCompany: DELIVERY_COMPANY,
            productsTotal,
            deliveryPrice,
            totalDue: productsTotal + deliveryPrice,
            status: 'unpaid',
            paid: false,
        })
        return res.status(201).json(order)
    } catch (err) {
        return send(res, err)
    }
}

/* ---------- POST /orders/:id/payment   (public) ----------
   { paymentMethod: 'post' | 'online', deposit: 1000 | 1500 | 2000, receiptImage? }
   - post   : a receipt photo is required. The order becomes "pending": the seller checks the receipt.
   - online : with ONLINE_PAYMENT_PROVIDER=chargily the response has { checkoutUrl } and the webhook confirms
              the payment. Without a provider it also stays "pending" (anyone can call this endpoint, so it can
              never be trusted). TRUST_ONLINE_PAYMENT=true confirms it directly: DEMO ONLY. */
export const payOrder = async (req, res) => {
    try {
        const { id } = req.params
        if (!mongoose.isValidObjectId(id)) throw new HttpError(404, 'Order not found')

        const { paymentMethod } = req.body
        const deposit = Number(req.body.deposit)
        if (!['online', 'post'].includes(paymentMethod)) bad('Invalid payment method')
        if (!DEPOSITS.includes(deposit)) bad('Invalid deposit')

        let receipt = null
        if (paymentMethod === 'post') {
            receipt = str(req.body.receiptImage, 500)
            if (!receiptUrlOk(receipt)) bad('A receipt photo is required')
        }

        const order = await Order.findById(id)
        if (!order) throw new HttpError(404, 'Order not found')
        if (order.status !== 'unpaid') throw new HttpError(409, 'Order already paid')
        if (deposit > order.totalDue) bad('The deposit is higher than the order total')

        // online payment through Chargily: the order stays "unpaid" until the webhook confirms it
        if (paymentMethod === 'online' && process.env.ONLINE_PAYMENT_PROVIDER === 'chargily') {
            let checkout
            try {
                checkout = await createChargilyCheckout({ amount: deposit, orderId: order._id, orderNumber: order.orderNumber })
            } catch (err) {
                console.log(err)
                throw new HttpError(502, 'Online payment is unavailable right now')
            }
            order.paymentMethod = 'online'
            order.deposit = deposit
            order.chargilyCheckoutId = checkout.id || null
            await order.save()
            return res.json({ ...order.toJSON(), checkoutUrl: checkout.checkout_url })
        }

        const trusted = paymentMethod === 'online' && process.env.TRUST_ONLINE_PAYMENT === 'true'

        // atomic: only an order that is still unpaid can be paid, and only once
        const paid = await Order.findOneAndUpdate(
            { _id: id, status: 'unpaid' },
            {
                $set: {
                    paymentMethod,
                    deposit,
                    receiptImage: receipt,
                    paid: trusted,
                    status: trusted ? 'confirmed' : 'pending',
                    paidAt: new Date(),
                },
            },
            { returnDocument: 'after' }
        )
        if (!paid) throw new HttpError(409, 'Order already paid')
        return res.json(paid)
    } catch (err) {
        return send(res, err)
    }
}

/* ---------- GET /orders/:id/status   (public) ----------
   The confirmation page asks this after the customer comes back from Chargily.
   It returns NO personal data (no name, phone, address, receipt).
   An online order that is still unpaid is checked directly with Chargily (server to server), so the
   order is confirmed even when the webhook cannot reach this server (local development). */
export const getOrderStatus = async (req, res) => {
    try {
        const { id } = req.params
        if (!mongoose.isValidObjectId(id)) throw new HttpError(404, 'Order not found')
        let order = await Order.findById(id)
        if (!order) throw new HttpError(404, 'Order not found')

        const canCheck =
            order.status === 'unpaid' &&
            order.paymentMethod === 'online' &&
            order.chargilyCheckoutId &&
            process.env.ONLINE_PAYMENT_PROVIDER === 'chargily'

        if (canCheck) {
            try {
                const checkout = await getChargilyCheckout(order.chargilyCheckoutId)
                const amount = Number(checkout.amount)
                if (checkout.status === 'paid' && paidAmountIsValid(order, amount)) {
                    order = (await confirmOnlinePayment(order._id, amount)) || (await Order.findById(id))
                }
            } catch (err) {
                console.log('Chargily status check failed:', err.message)   // not fatal: the webhook may still confirm it
            }
        }

        return res.json({
            id: String(order._id),
            orderNumber: order.orderNumber,
            status: order.status,
            paid: order.paid,
            paymentMethod: order.paymentMethod,
            deposit: order.deposit,
            totalDue: order.totalDue,
        })
    } catch (err) {
        return send(res, err)
    }
}

/* ---------- seller (admin) ---------- */

// GET /orders
export const getOrders = async (req, res) => {
    try {
        return res.json(await Order.find().sort({ createdAt: -1 }))
    } catch (err) {
        return send(res, err)
    }
}

// PATCH /orders/:id   { status: 'unpaid' | 'pending' | 'confirmed' | 'refused' }
export const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params
        if (!mongoose.isValidObjectId(id)) throw new HttpError(404, 'Order not found')
        if (!STATUSES.includes(req.body.status)) bad('Invalid status')

        const order = await Order.findByIdAndUpdate(id, { status: req.body.status }, { returnDocument: 'after' })
        if (!order) throw new HttpError(404, 'Order not found')
        return res.json(order)
    } catch (err) {
        return send(res, err)
    }
}
