import e from 'express'
import Category from '../models/Category.model.js'
import Setting from '../models/Setting.model.js'
import Product from '../models/Product.model.js'
import { validateToken } from '../lib/validToken.js'
import { isAdmin } from '../lib/isAdmin.js'
import { deleteFromCloud } from '../lib/cloudinary.js'

const route = e.Router()

const slugify = (text) =>
    String(text || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

/* ---------- collections (categories) ---------- */

// GET /categories   (public)
route.get('/categories', async (req, res) => {
    try {
        return res.json(await Category.find().sort({ createdAt: 1 }))
    } catch (err) {
        console.log(err)
        return res.status(500).json({ message: 'Something went wrong' })
    }
})

// POST /categories   { fr, ar, image }   (admin)
route.post('/categories', validateToken, isAdmin, async (req, res) => {
    try {
        const { fr, ar, image } = req.body
        if (!fr) return res.status(400).json({ message: 'Name is required' })

        // unique slug id: "robes-de-mariee", "robes-de-mariee-2", ...
        const base = slugify(fr) || 'collection'
        let id = base
        let n = 2
        while (await Category.exists({ _id: id })) id = `${base}-${n++}`

        const category = await Category.create({ _id: id, fr, ar: ar || fr, image: image || '' })
        return res.status(201).json(category)
    } catch (err) {
        console.log(err)
        return res.status(500).json({ message: 'Something went wrong' })
    }
})

// PUT /categories/:id   { fr, ar, image }   (admin)
route.put('/categories/:id', validateToken, isAdmin, async (req, res) => {
    try {
        const category = await Category.findById(req.params.id)
        if (!category) return res.status(404).json({ message: 'Category not found' })

        const { fr, ar, image } = req.body
        const oldImage = category.image
        if (fr) category.fr = fr
        if (ar !== undefined) category.ar = ar || category.fr
        if (image !== undefined) category.image = image
        await category.save()

        if (oldImage && oldImage !== category.image) await deleteFromCloud(oldImage)
        return res.json(category)
    } catch (err) {
        console.log(err)
        return res.status(500).json({ message: 'Something went wrong' })
    }
})

// DELETE /categories/:id   (admin) - 409 while products still use it
route.delete('/categories/:id', validateToken, isAdmin, async (req, res) => {
    try {
        const category = await Category.findById(req.params.id)
        if (!category) return res.status(404).json({ message: 'Category not found' })

        if (await Product.exists({ category: category._id })) {
            return res.status(409).json({ message: 'Products still use this collection' })
        }
        await deleteFromCloud(category.image)
        await category.deleteOne()
        return res.status(204).send()
    } catch (err) {
        console.log(err)
        return res.status(500).json({ message: 'Something went wrong' })
    }
})

/* ---------- store open / closed ---------- */

route.get('/store/status', async (req, res) => {
    try {
        const s = await Setting.findOne({ key: 'storeOpen' })
        return res.json({ open: s ? !!s.value : true })
    } catch (err) {
        console.log(err)
        return res.status(500).json({ message: 'Something went wrong' })
    }
})

route.put('/store/status', validateToken, isAdmin, async (req, res) => {
    try {
        const open = !!req.body.open
        await Setting.findOneAndUpdate({ key: 'storeOpen' }, { value: open }, { upsert: true })
        return res.json({ open })
    } catch (err) {
        console.log(err)
        return res.status(500).json({ message: 'Something went wrong' })
    }
})

export default route
