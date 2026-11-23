import e from 'express'
import mongoose from 'mongoose'
import Gallery from '../models/Gallery.model.js'
import { validateToken } from '../lib/validToken.js'
import { isAdmin } from '../lib/isAdmin.js'
import { deleteFromCloud } from '../lib/cloudinary.js'

const route = e.Router()

const PLACEMENTS = ['home', 'best', 'new', 'about']

const serverError = (res, err) => {
    console.log(err)
    return res.status(500).json({ message: 'Something went wrong' })
}

// GET /gallery?placement=home|best|new|about   (public, placement optional)
route.get('/gallery', async (req, res) => {
    try {
        const { placement } = req.query
        if (placement !== undefined && !PLACEMENTS.includes(placement)) {
            return res.status(400).json({ message: 'Invalid placement' })
        }
        const filter = placement ? { placement } : {}
        return res.json(await Gallery.find(filter).sort({ createdAt: -1 }))
    } catch (err) {
        return serverError(res, err)
    }
})

// POST /gallery   { url, type, placement }   (admin)
route.post('/gallery', validateToken, isAdmin, async (req, res) => {
    try {
        const { url, type = 'image', placement = 'home' } = req.body
        if (typeof url !== 'string' || !/^https?:\/\/\S+$/.test(url) || url.length > 1000) {
            return res.status(400).json({ message: 'A valid photo or video link is required' })
        }
        if (!['image', 'video'].includes(type)) return res.status(400).json({ message: 'Invalid type' })
        if (!PLACEMENTS.includes(placement)) return res.status(400).json({ message: 'Invalid placement' })

        const item = await Gallery.create({ url, type, placement })
        return res.status(201).json(item)
    } catch (err) {
        return serverError(res, err)
    }
})

// DELETE /gallery/:id   (admin)   also deletes the file from Cloudinary
route.delete('/gallery/:id', validateToken, isAdmin, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Item not found' })
        const item = await Gallery.findById(req.params.id)
        if (!item) return res.status(404).json({ message: 'Item not found' })

        await item.deleteOne()
        await deleteFromCloud(item.url)
        return res.status(204).send()
    } catch (err) {
        return serverError(res, err)
    }
})

export default route