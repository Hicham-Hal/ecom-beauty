import mongoose from "mongoose"
import Product from "../models/Product.model.js"
import Category from "../models/Category.model.js"
import Order from "../models/Order.model.js"
import { deleteFromCloud } from '../lib/cloudinary.js'

// Only these fields can be set from the request (nothing else gets through)
const pickProductData = (b) => {
    const allowed = [
        'name', 'category', 'price', 'preparationDays', 'sizes',
        'images', 'video', 'colors', 'description',
        'isBestSeller', 'isNewArrival', 'inStock',
    ]
    const data = {}
    for (const key of allowed) if (b[key] !== undefined) data[key] = b[key]
    return data
}

// The collection is created automatically the first time a product uses it
const ensureCategory = async (id, name) => {
    if (!id) return
    const fr = name?.fr || id
    await Category.updateOne(
        { _id: id },
        { $setOnInsert: { fr, ar: name?.ar || fr, image: '' } },
        { upsert: true }
    )
}

// Delete files from Cloudinary, except the ones an old order still displays (orders keep a snapshot)
const cleanCloud = async (urls) => {
    for (const url of urls) {
        if (!url) continue
        if (await Order.exists({ 'items.image': url })) continue
        await deleteFromCloud(url)
    }
}

// every media file used by a product
const mediaOf = (p) => [...p.images, p.video, ...p.colors.map((c) => c.mediaUrl)].filter(Boolean)

const notFound = (res) => res.status(404).json({ message: 'Product not found' })
const serverError = (res, err) => {
    console.log(err)
    return res.status(500).json({ message: 'Something went wrong' })
}

// GET /products            (public)   optional filter: /products?category=caftans
export const getProducts = async (req, res) => {
    try {
        const filter = req.query.category ? { category: String(req.query.category) } : {}
        return res.status(200).json(await Product.find(filter).sort({ createdAt: -1 }))
    } catch (err) {
        return serverError(res, err)
    }
}

// GET /products/:id        (public)
export const getSingleProduct = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return notFound(res)
        const product = await Product.findById(req.params.id)
        if (!product) return notFound(res)
        return res.status(200).json(product)
    } catch (err) {
        return serverError(res, err)
    }
}

// POST /products           (admin)
export const addProduct = async (req, res) => {
    try {
        const data = pickProductData(req.body)
        if (!data.name?.fr || !data.category || data.price === undefined) {
            return res.status(400).json({ message: 'Fields are required' })
        }
        const hasPhoto = data.images?.length > 0 || data.colors?.some((c) => c.mediaUrl)
        if (!hasPhoto) return res.status(400).json({ message: 'At least one photo is required' })

        await ensureCategory(data.category, req.body.categoryName)
        const product = await Product.create(data)
        return res.status(201).json(product)
    } catch (err) {
        if (err.name === 'ValidationError') return res.status(400).json({ message: err.message })
        return serverError(res, err)
    }
}

// PUT /products/:id        (admin)
export const updateProduct = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return notFound(res)
        const product = await Product.findById(req.params.id)
        if (!product) return notFound(res)

        const data = pickProductData(req.body)
        if (data.category) await ensureCategory(data.category, req.body.categoryName)

        const before = mediaOf(product)
        product.set(data)
        await product.save()

        // delete from Cloudinary whatever the product no longer uses
        const after = new Set(mediaOf(product))
        await cleanCloud(before.filter((u) => !after.has(u)))

        return res.status(200).json(product)
    } catch (err) {
        if (err.name === 'ValidationError') return res.status(400).json({ message: err.message })
        return serverError(res, err)
    }
}

// DELETE /products/:id     (admin)
export const deleteProduct = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return notFound(res)
        const product = await Product.findById(req.params.id)
        if (!product) return notFound(res)

        await product.deleteOne()
        await cleanCloud(mediaOf(product))
        return res.status(204).send()
    } catch (err) {
        return serverError(res, err)
    }
}