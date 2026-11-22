import e from 'express'
import Gallery from '../models/Gallery.model.js'
import { validateToken } from '../lib/validToken.js'
import { isAdmin } from '../lib/isAdmin.js'
import { deleteFromCloud } from '../lib/cloudinary.js'

const route = e.Router()

const PLACEMENTS = ['home', 'best', 'new', 'about']

// GET /gallery?placement=home|best|new|about   (public, placement optional)
route.get('/gallery', async (req, res) => {
    try {
        const filter = {}
        if (req.query.placement) filter.placement = req.query.placement
        const items = await Gallery.find(filter).sort({ createdAt: -1 })
        return res.json(items)
    } catch (err) {
        console.log(err)
        return res.status(500).json({ message: 'Something went wrong' })
    }
})

// POST /gallery   { url, type, placement }   (admin)
route.post('/gallery', validateToken, isAdmin, async (req, res) => {
    try {
        const { url, type, placement } = req.body
        if (!url) return res.status(400).json({ message: 'Media is required' })
        if (placement && !PLACEMENTS.includes(placement)) {
            return res.status(400).json({ message: 'Invalid placement' })
        }
        const item = await Gallery.create({
            url,
            type: type === 'video' ? 'video' : 'image',
            placement: placement || 'home',
        })
        return res.status(201).json(item)
    } catch (err) {
        console.log(err)
        return res.status(500).json({ message: 'Something went wrong' })
    }
})

// DELETE /gallery/:id   (admin)
route.delete('/gallery/:id', validateToken, isAdmin, async (req, res) => {
    try {
        const item = await Gallery.findById(req.params.id)
        if (!item) return res.status(404).json({ message: 'Item not found' })
        await deleteFromCloud(item.url)
        await item.deleteOne()
        return res.status(204).send()
    } catch (err) {
        console.log(err)
        return res.status(500).json({ message: 'Something went wrong' })
    }
})

export default route
