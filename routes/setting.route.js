import e from 'express'
import Setting from '../models/Setting.model.js'
import { validateToken } from '../lib/validToken.js'
import { isAdmin } from '../lib/isAdmin.js'
import { WILAYA_CODES, loadDeliveryPrices } from '../lib/deliveryPrices.js'

const route = e.Router()

const serverError = (res, err) => {
    console.log(err)
    return res.status(500).json({ message: 'Something went wrong' })
}

/* ---------- store open / closed ---------- */

// GET /store/status   (public)   -> { open: true|false }   (open until the seller closes it)
route.get('/store/status', async (req, res) => {
    try {
        const setting = await Setting.findOne({ key: 'storeOpen' })
        return res.json({ open: setting ? setting.value === true : true })
    } catch (err) {
        return serverError(res, err)
    }
})

// PUT /store/status   { open: true|false }   (admin)
route.put('/store/status', validateToken, isAdmin, async (req, res) => {
    try {
        if (typeof req.body.open !== 'boolean') return res.status(400).json({ message: 'open must be true or false' })
        await Setting.findOneAndUpdate({ key: 'storeOpen' }, { value: req.body.open }, { upsert: true })
        return res.json({ open: req.body.open })
    } catch (err) {
        return serverError(res, err)
    }
})

/* ---------- delivery prices ---------- */

// "850" or 850 -> 850. "" / null / undefined -> null (= no price). Anything else is refused.
const toPrice = (value, code) => {
    if (value === '' || value === null || value === undefined) return null
    const valid = typeof value === 'number' || (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value.trim()))
    const n = valid ? Number(value) : NaN
    if (!Number.isFinite(n) || n < 0 || n > 100000) {
        throw Object.assign(new Error(`Invalid price for wilaya ${code}`), { status: 400 })
    }
    return Math.round(n)
}

// GET /delivery-prices   (public)   -> { "05": { home, stopdesk }, ... }   ({} until the seller saves)
route.get('/delivery-prices', async (req, res) => {
    try {
        return res.json(await loadDeliveryPrices())
    } catch (err) {
        return serverError(res, err)
    }
})

// PUT /delivery-prices   the WHOLE table   (admin)
// A missing/empty price means "no delivery of that type to that wilaya". 0 means free delivery.
route.put('/delivery-prices', validateToken, isAdmin, async (req, res) => {
    try {
        const body = req.body
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return res.status(400).json({ message: 'Invalid prices' })
        }

        const clean = {}
        for (const [code, entry] of Object.entries(body)) {
            if (!WILAYA_CODES.includes(code)) return res.status(400).json({ message: `Unknown wilaya code "${code}"` })
            if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
                return res.status(400).json({ message: `Invalid prices for wilaya ${code}` })
            }
            const home = toPrice(entry.home, code)
            const stopdesk = toPrice(entry.stopdesk, code)
            if (home === null && stopdesk === null) continue          // nothing set: dropped
            clean[code] = {}
            if (home !== null) clean[code].home = home
            if (stopdesk !== null) clean[code].stopdesk = stopdesk
        }

        await Setting.findOneAndUpdate({ key: 'deliveryPrices' }, { value: clean }, { upsert: true })
        return res.json(clean)
    } catch (err) {
        if (err.status === 400) return res.status(400).json({ message: err.message })
        return serverError(res, err)
    }
})

export default route