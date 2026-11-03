import Order from "../models/Order.model.js"
import Product from "../models/Product.model.js"
import { deleteFromCloud } from '../lib/cloudinary.js'

/* ---------- products ---------- */

// Only take the fields the model has (productMapper.toApi already uses these names)
const pickProductData = (b) => {
    const allowed = [
        'name', 'category', 'categoryName', 'price', 'preparationDays', 'sizes',
        'images', 'video', 'colors', 'description',
        'isBestSeller', 'isNewArrival', 'inStock',
    ]
    const data = {}
    for (const key of allowed) if (b[key] !== undefined) data[key] = b[key]
    return data
}

// every media URL used by a product (to delete them from Cloudinary)
const mediaOf = (p) => [...p.images, p.video, ...p.colors.map((c) => c.mediaUrl)].filter(Boolean)

export const addProduct = async (req, res) => {
    try {
        const data = pickProductData(req.body)
        if (!data.name?.fr || !data.category || data.price === undefined) {
            return res.status(400).json({ message: 'Fields are required' })
        }
        const hasPhoto = data.images?.length > 0 || data.colors?.some((c) => c.mediaUrl)
        if (!hasPhoto) return res.status(400).json({ message: 'At least one photo is required' })

        const product = await Product.create(data)
        return res.status(201).json(product)
    } catch (err) {
        console.log(err)
        if (err.name === 'ValidationError') return res.status(400).json({ message: err.message })
        return res.status(500).json({ message: 'Something went wrong' })
    }
}

export const updateProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
        if (!product) return res.status(404).json({ message: 'Product not found' })

        const before = mediaOf(product)
        product.set(pickProductData(req.body))
        await product.save()

        // delete from Cloudinary whatever is no longer used
        const after = new Set(mediaOf(product))
        await Promise.all(before.filter((u) => !after.has(u)).map(deleteFromCloud))

        return res.status(200).json(product)
    } catch (err) {
        console.log(err)
        if (err.name === 'ValidationError') return res.status(400).json({ message: err.message })
        return res.status(500).json({ message: 'Something went wrong' })
    }
}

export const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
        if (!product) return res.status(404).json({ message: 'Product not found' })
        await Promise.all(mediaOf(product).map(deleteFromCloud))
        await product.deleteOne()
        return res.status(204).send()
    } catch (err) {
        console.log(err)
        return res.status(500).json({ message: 'Something went wrong' })
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
        const orders = await Order.find()
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