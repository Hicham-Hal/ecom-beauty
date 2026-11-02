import Order from "../models/Order.model.js";
import Product from "../models/Product.model.js";
import { uploadToCloud, deleteFromCloud } from '../lib/cloudinary.js'


/* ---------- helpers ---------- */

const toBool = (v) => v === true || v === 'true'

const parseJSON = (v, fallback) => {
    if (v === undefined) return fallback
    if (typeof v !== 'string') return v
    try { return JSON.parse(v) } catch { return fallback }
}

const parseList = (v) =>
    Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : []

const fileUrl = (file) => `/uploads/products/${file.filename}`

const mediaTypeOf = (file) => (file.mimetype.startsWith('video') ? 'video' : 'image')

// colors = JSON array: [{ name, hasFile: true }, { name, mediaUrl, mediaType }]
// Entries with hasFile:true take the next uploaded file from "colorMedia", in order.
const buildColors = async (rawColors, files = []) => {
    let i = 0
    const colors = []
    for (const c of rawColors) {
        if (!c.name) throw new Error('Each color needs a name')
        if (c.hasFile) {
            const file = files[i++]
            if (!file) throw new Error(`Missing file for color "${c.name}"`)
            const { url, type } = await uploadToCloud(file, 'products/colors')
            colors.push({ name: c.name, mediaUrl: url, mediaType: type })
        } else {
            if (!c.mediaUrl) throw new Error(`Color "${c.name}" needs a photo or video`)
            const color = { name: c.name, mediaUrl: c.mediaUrl, mediaType: c.mediaType || 'image' }
            if (c._id) color._id = c._id
            colors.push(color)
        }
    }
    return colors
}

// Remove the temp files if the request fails before they were uploaded
const cleanTempFiles = async (files = {}) => {
    const all = Object.values(files).flat()
    await Promise.all(all.map((f) => fs.unlink(f.path).catch(() => {})))
}

/* ---------- products ---------- */

export const getUploadSignature = (req, res) => res.json(signUpload('products'))

// Only take the fields we allow, and map isNew -> isNewArrival
const pickProductData = (b) => {
    const data = {}
    if (b.category !== undefined) data.category = b.category
    if (b.name) data.name = { fr: b.name.fr, ar: b.name.ar || b.name.fr }
    if (b.price !== undefined) data.price = b.price
    if (b.prepDays !== undefined) data.prepDays = b.prepDays
    if (b.sizes !== undefined) data.sizes = b.sizes
    if (b.images !== undefined) data.images = b.images
    if (b.video !== undefined) data.video = b.video
    if (b.colors !== undefined) data.colors = b.colors
    if (b.description) data.description = b.description
    if (b.isBestSeller !== undefined) data.isBestSeller = b.isBestSeller
    if (b.isNew !== undefined) data.isNewArrival = b.isNew
    if (b.stock !== undefined) data.stock = b.stock
    return data
}

// every media URL a product uses
const mediaOf = (p) => [...p.images, p.video, ...p.colors.map((c) => c.url)].filter(Boolean)

export const addProduct = async (req, res) => {
    try {
        const data = pickProductData(req.body)
        if (!data.name?.fr || !data.category || data.price === undefined) {
            return res.status(400).json({ message: 'Fields are required' })
        }
        const hasPhoto = data.images?.length > 0 || data.colors?.some((c) => c.url)
        if (!hasPhoto) return res.status(400).json({ message: 'At least one photo is required' })

        const product = await Product.create(data)
        return res.status(201).json(product)
    } catch (err) {
        console.log(err)
        if (err.name === 'ValidationError') return res.status(400).json({ message: err.message })
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

export const updateProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
        if (!product) return res.status(404).json({ message: 'Product not found' })

        const before = mediaOf(product)
        product.set(pickProductData(req.body))
        await product.save()

        // delete from the cloud whatever is no longer used
        const after = new Set(mediaOf(product))
        await Promise.all(before.filter((u) => !after.has(u)).map(deleteFromCloud))

        return res.status(200).json(product)
    } catch (err) {
        console.log(err)
        if (err.name === 'ValidationError') return res.status(400).json({ message: err.message })
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

export const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
        if (!product) return res.status(404).json({ message: 'product not found' })
        await Promise.all(mediaOf(product).map(deleteFromCloud))
        await product.deleteOne()
        return res.status(204).send()
    } catch (err) {
        console.log(err)
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

export const getProducts = async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 })
        return res.status(200).json(products)
    } catch (err) {
        console.log(err)
        return res.status(500).json({ message: 'Something went wrong' })
    }
}

export const getSingleProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
        if (!product) return res.status(404).json({ message: 'Product not found' })
        return res.status(200).json(product)
    } catch (err) {
        console.log(err)
        return res.status(500).json({ message: 'Something went wrong' })
    }
}
/* ---------- orders (unchanged) ---------- */

export const getAllOrder = async (req, res) => {
    try {
        const orders = await Order.find();
        return res.status(200).json(orders)
    } catch (err) {
        console.log(err)
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

export const updateOrderStatus = async (req, res) => {
    const { orderStatus } = req.body
    const { id } = req.params
    try {
        const order = await Order.findById(id)
        if (!order) return res.status(404).json({ message: 'Order not found' })
        if (!orderStatus) return res.status(400).json({ message: 'You should provide the new order status' })
        order.status = orderStatus
        await order.save()
        return res.status(200).json(order)
    } catch (err) {
        console.log(err)
        return res.status(500).json({ error: 'Something went wrong' })
    }
}