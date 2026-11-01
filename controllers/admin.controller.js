import Order from "../models/Order.model.js";
import Product from "../models/Product.model.js";

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
const buildColors = (rawColors, files = []) => {
    let i = 0
    return rawColors.map((c) => {
        if (!c.name) throw new Error('Each color needs a name')
        if (c.hasFile) {
            const file = files[i++]
            if (!file) throw new Error(`Missing file for color "${c.name}"`)
            return { name: c.name, mediaUrl: fileUrl(file), mediaType: mediaTypeOf(file) }
        }
        if (!c.mediaUrl) throw new Error(`Color "${c.name}" needs a photo or video`)
        const color = { name: c.name, mediaUrl: c.mediaUrl, mediaType: c.mediaType || 'image' }
        if (c._id) color._id = c._id // keep the id of existing colors
        return color
    })
}

/* ---------- products ---------- */

export const addProduct = async (req, res) => {
    const {
        nameFr, nameAr, category, price, preparationDays,
        sizes, descriptionFr, descriptionAr,
        isBestSeller, isNewArrival, inStock,
    } = req.body

    if (!nameFr || !nameAr || !category || price === undefined || preparationDays === undefined) {
        return res.status(400).json({ message: 'Fields are required' })
    }

    const imageFiles = req.files?.images || []
    const pastedImages = parseJSON(req.body.imageLinks, []) // optional pasted links
    const images = [...imageFiles.map(fileUrl), ...pastedImages]
    if (images.length === 0) {
        return res.status(400).json({ message: 'At least one photo is required' })
    }

    try {
        const videoFile = req.files?.video?.[0]
        const colors = buildColors(parseJSON(req.body.colors, []), req.files?.colorMedia)

        const product = new Product({
            name: { fr: nameFr, ar: nameAr },
            category,
            price,
            preparationDays,
            sizes: parseList(sizes),
            images,
            video: videoFile ? fileUrl(videoFile) : (req.body.videoLink || ''),
            colors,
            description: { fr: descriptionFr || '', ar: descriptionAr || '' },
            isBestSeller: toBool(isBestSeller),
            isNewArrival: toBool(isNewArrival),
            inStock: inStock === undefined ? true : toBool(inStock),
        })

        await product.save()
        return res.status(201).json(product)
    } catch (err) {
        console.log(err)
        if (err.name === 'ValidationError' || err.message?.startsWith('Missing') || err.message?.startsWith('Color') || err.message?.startsWith('Each')) {
            return res.status(400).json({ message: err.message })
        }
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

export const updateProduct = async (req, res) => {
    const { id } = req.params
    const {
        nameFr, nameAr, category, price, preparationDays,
        sizes, descriptionFr, descriptionAr,
        isBestSeller, isNewArrival, inStock,
    } = req.body

    try {
        const product = await Product.findById(id)
        if (!product) return res.status(404).json({ message: 'Product not found' })

        if (nameFr) product.name.fr = nameFr
        if (nameAr) product.name.ar = nameAr
        if (category) product.category = category
        if (price !== undefined) product.price = price
        if (preparationDays !== undefined) product.preparationDays = preparationDays
        if (sizes !== undefined) product.sizes = parseList(sizes)
        if (descriptionFr !== undefined) product.description.fr = descriptionFr
        if (descriptionAr !== undefined) product.description.ar = descriptionAr
        if (isBestSeller !== undefined) product.isBestSeller = toBool(isBestSeller)
        if (isNewArrival !== undefined) product.isNewArrival = toBool(isNewArrival)
        if (inStock !== undefined) product.inStock = toBool(inStock)

        // Images: "keepImages" = existing URLs to keep, plus any newly uploaded files
        const newImages = (req.files?.images || []).map(fileUrl)
        if (req.body.keepImages !== undefined || newImages.length > 0) {
            const keep = parseJSON(req.body.keepImages, product.images)
            product.images = [...keep, ...newImages]
        }

        // Video: replace, remove, or leave as is
        const videoFile = req.files?.video?.[0]
        if (videoFile) product.video = fileUrl(videoFile)
        else if (toBool(req.body.removeVideo)) product.video = ''

        // Colors: send the full list each time (existing + new)
        if (req.body.colors !== undefined) {
            product.colors = buildColors(parseJSON(req.body.colors, []), req.files?.colorMedia)
        }

        await product.save()
        return res.status(200).json(product)
    } catch (err) {
        console.log(err)
        if (err.name === 'ValidationError') {
            return res.status(400).json({ message: err.message })
        }
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

export const deleteProduct = async (req, res) => {
    const { id } = req.params
    try {
        const product = await Product.findById(id)
        if (!product) return res.status(404).json({ message: 'product not found' })
        await product.deleteOne()
        return res.status(204).send()
    } catch (err) {
        console.log(err)
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

export const getProducts = async (req, res) => {
    try {
        const { category, inStock, isBestSeller, isNewArrival } = req.query
        const filter = {}
        if (category) filter.category = category
        if (inStock !== undefined) filter.inStock = toBool(inStock)
        if (isBestSeller !== undefined) filter.isBestSeller = toBool(isBestSeller)
        if (isNewArrival !== undefined) filter.isNewArrival = toBool(isNewArrival)

        const products = await Product.find(filter).sort({ createdAt: -1 })
        return res.status(200).json(products)
    } catch (err) {
        console.log(err)
        return res.status(500).json({ message: 'Something went wrong' })
    }
}

export const getSingleProduct = async (req, res) => {
    const { id } = req.params
    try {
        const product = await Product.findById(id)
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