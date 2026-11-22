import mongoose from 'mongoose'
import Order from '../models/Order.model.js'
import Counter from '../models/Counter.model.js'
import Product from '../models/Product.model.js'
import Setting from '../models/Setting.model.js'
import { DEFAULT_DELIVERY_PRICES } from '../data/defaultDeliveryPrices.js'

const STATUSES = ['unpaid', 'pending', 'confirmed', 'refused']
const DEPOSITS = [1000, 1500, 2000]
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

/* ---------- delivery prices ---------- */

const loadDeliveryPrices = async () => {
    const s = await Setting.findOne({ key: 'deliveryPrices' })
    return s?.value && Object.keys(s.value).length ? s.value : DEFAULT_DELIVERY_PRICES
}

export const getDeliveryPrices = async (req, res) => {
    try {
        return res.json(await loadDeliveryPrices())
    } catch (err) {
        return send(res, err)
    }
}

export const saveDeliveryPrices = async (req, res) => {
    try {
        const body = req.body
        if (!body || typeof body !== 'object' || Array.isArray(body)) bad('Invalid prices')

        const clean = {}
        for (const [code, v] of Object.entries(body)) {
            if (!/^\d{2}$/.test(code)) bad(`Invalid wilaya code "${code}"`)
            const home = Number(v?.home)
            const stopdesk = Number(v?.stopdesk)
            if (![home, stopdesk].every((n) => Number.isFinite(n) && n >= 0 && n <= 100000)) {
                bad(`Invalid price for wilaya ${code}`)
            }
            clean[code] = { home: Math.round(home), stopdesk: Math.round(stopdesk) }
        }
        if (Object.keys(clean).length === 0) bad('Prices are empty')

        await Setting.findOneAndUpdate({ key: 'deliveryPrices' }, { value: clean }, { upsert: true })
        return res.json(clean)
    } catch (err) {
        return send(res, err)
    }
}

/* ---------- orders ---------- */

const cleanCustomer = (c = {}) => {
    const firstName = str(c.firstName)
    const lastName = str(c.lastName)
    const wilaya = str(c.wilaya)
    const commune = str(c.commune)
    const wilayaCode = str(c.wilayaCode, 2)
    const phone = str(c.phone, 20).replace(/[\s.-]/g, '')
    const deliveryType = c.deliveryType

    if (!firstName || !lastName || !wilaya || !commune) bad('Customer information is incomplete')
    if (!/^\d{2}$/.test(wilayaCode)) bad('Invalid wilaya')
    if (!/^(0|\+213)[567]\d{8}$/.test(phone)) bad('Invalid phone number')
    if (!['home', 'stopdesk'].includes(deliveryType)) bad('Invalid delivery type')

    return { firstName, lastName, phone, wilaya, wilayaCode, commune, deliveryType }
}

// Rebuild every item from the DATABASE: the browser only says which product, size, color, quantity
const buildItems = async (rawItems) => {
    if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 30) bad('Cart is empty or too large')
    for (const it of rawItems) {
        if (!mongoose.isValidObjectId(it?.productId)) bad('Invalid product in cart, please empty your cart and retry')
    }

    const ids = [...new Set(rawItems.map((i) => String(i.productId)))]
    const products = await Product.find({ _id: { $in: ids } })
    const byId = new Map(products.map((p) => [String(p._id), p]))

    return rawItems.map((it) => {
        const product = byId.get(String(it.productId))
        if (!product) bad('A product in your cart no longer exists')
        if (!product.inStock) bad(`"${product.name.fr}" is out of stock`)

        const quantity = Math.floor(Number(it.quantity))
        if (!(quantity >= 1 && quantity <= 10)) bad('Invalid quantity')

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
            price: product.price,                       // server price, never the browser's
            prepDays: product.preparationDays,
            size,
            color: colorObj ? colorObj.name : '',
            quantity,
            bodyNote: str(it.bodyNote, 1000),
        }
    })
}

const nextOrderNumber = async () => {
    const c = await Counter.findOneAndUpdate({ _id: 'order' }, { $inc: { seq: 1 } }, { upsert: true, new: true })
    return `JB-${1000 + c.seq}`
}

// POST /orders   (public)
export const createOrder = async (req, res) => {
    try {
        const open = await Setting.findOne({ key: 'storeOpen' })
        if (open && !open.value) throw new HttpError(403, 'The store is closed')

        const customer = cleanCustomer(req.body.customer)
        const items = await buildItems(req.body.items)

        const prices = await loadDeliveryPrices()
        const deliveryPrice = prices?.[customer.wilayaCode]?.[customer.deliveryType]
        if (!Number.isFinite(deliveryPrice)) bad('Delivery is not available for this wilaya')

        const productsTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

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

// POST /orders/:id/payment   { paymentMethod, deposit, receiptImage? }   (public)
export const payOrder = async (req, res) => {
    try {
        const { id } = req.params
        if (!mongoose.isValidObjectId(id)) throw new HttpError(404, 'Order not found')

        const { paymentMethod, receiptImage } = req.body
        const deposit = Number(req.body.deposit)

        if (!['online', 'post'].includes(paymentMethod)) bad('Invalid payment method')
        if (!DEPOSITS.includes(deposit)) bad('Invalid deposit')

        let receipt = null
        if (paymentMethod === 'post') {
            receipt = str(receiptImage, 500)
            if (!/^https:\/\//.test(receipt)) bad('A receipt photo is required')
        }

        // Online payments are only trusted when a real payment gateway confirms them.
        // Until then they stay "pending" (set TRUST_ONLINE_PAYMENT=true ONLY for demos).
        const trusted = paymentMethod === 'online' && process.env.TRUST_ONLINE_PAYMENT === 'true'

        // Atomic: only an order that is still unpaid can be paid, and only once
        const order = await Order.findOneAndUpdate(
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
            { new: true }
        )
        if (!order) {
            const exists = await Order.exists({ _id: id })
            throw new HttpError(exists ? 409 : 404, exists ? 'Order already paid' : 'Order not found')
        }
        return res.json(order)
    } catch (err) {
        return send(res, err)
    }
}

// GET /orders   (admin)
export const getOrders = async (req, res) => {
    try {
        return res.json(await Order.find().sort({ createdAt: -1 }))
    } catch (err) {
        return send(res, err)
    }
}

// PATCH /orders/:id   { status }   (admin)
export const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params
        const { status } = req.body
        if (!mongoose.isValidObjectId(id)) throw new HttpError(404, 'Order not found')
        if (!STATUSES.includes(status)) bad('Invalid status')

        const order = await Order.findByIdAndUpdate(id, { status }, { new: true })
        if (!order) throw new HttpError(404, 'Order not found')
        return res.json(order)
    } catch (err) {
        return send(res, err)
    }
}
