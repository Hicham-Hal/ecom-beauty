import crypto from 'crypto'
import { configDotenv } from 'dotenv'

configDotenv()

const apiUrl = () => process.env.CHARGILY_API_URL || 'https://pay.chargily.net/test/api/v2'
const clean = (u) => String(u || '').split(',')[0].trim().replace(/\/$/, '')

const headers = () => ({
    'Authorization': `Bearer ${process.env.CHARGILY_SECRET_KEY}`,
    'Content-Type': 'application/json',
})

// Creates the hosted Chargily payment page for the deposit. Throws if Chargily refuses.
export async function createChargilyCheckout({ amount, orderId, orderNumber }){
    const frontend = clean(process.env.FRONTEND_URL)
    const backend = clean(process.env.BACKEND_URL || process.env.APP_BASE_URL)
    if(!process.env.CHARGILY_SECRET_KEY) throw new Error('CHARGILY_SECRET_KEY is not set')
    if(!frontend) throw new Error('FRONTEND_URL is not set (the customer is sent back there after paying)')
    if(!backend) throw new Error('BACKEND_URL is not set (public URL of this API, needed for the webhook)')

    const res = await fetch(`${apiUrl()}/checkouts`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
            amount,
            currency: 'dzd',
            locale: 'fr',
            description: `Acompte commande ${orderNumber}`,
            success_url: `${frontend}/commande/confirmation/${orderNumber}?paid=1`,
            failure_url: `${frontend}/commande/paiement/${orderNumber}?failed=1`,
            webhook_endpoint: `${backend}/api/payment/webhook`,
            metadata: { orderId: String(orderId) },
        }),
    })
    const data = await res.json().catch(() => ({}))
    if(!res.ok) throw new Error(data.message || 'Chargily checkout creation failed')
    return data
}

// Asks Chargily (server to server, with our secret key) what happened to a checkout.
// This is how we confirm a payment even when the webhook cannot reach us (local development).
export async function getChargilyCheckout(checkoutId){
    if(!process.env.CHARGILY_SECRET_KEY) throw new Error('CHARGILY_SECRET_KEY is not set')
    const res = await fetch(`${apiUrl()}/checkouts/${encodeURIComponent(checkoutId)}`, { headers: headers() })
    const data = await res.json().catch(() => ({}))
    if(!res.ok) throw new Error(data.message || 'Chargily checkout lookup failed')
    return data
}

// Chargily signs the RAW request body with the secret key (HMAC SHA256)
export function verifyChargilySignature(rawBody, signature){
    if(!signature || !Buffer.isBuffer(rawBody) || !process.env.CHARGILY_SECRET_KEY) return false
    const computed = crypto
        .createHmac('sha256', process.env.CHARGILY_SECRET_KEY)
        .update(rawBody)
        .digest('hex')
    const a = Buffer.from(String(signature))
    const b = Buffer.from(computed)
    return a.length === b.length && crypto.timingSafeEqual(a, b)
}
