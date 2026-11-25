import mongoose from 'mongoose'
import { verifyChargilySignature } from "../lib/chargily.js"
import { confirmOnlinePayment, paidAmountIsValid } from "../lib/onlinePayment.js"
import Order from "../models/Order.model.js"

// POST /api/payment/webhook   (called by Chargily; the body is RAW json so the signature can be verified)
export const chargilyWebhook = async(req, res) => {
    try{
        if(!verifyChargilySignature(req.body, req.headers['signature'])){
            return res.status(403).json({ message: 'Invalid signature' })
        }

        const event = JSON.parse(req.body.toString('utf8'))
        const checkout = event.data || {}

        // find the order: by the id we put in the metadata, otherwise by the checkout id we saved
        let order = null
        if(mongoose.isValidObjectId(checkout.metadata?.orderId)) order = await Order.findById(checkout.metadata.orderId)
        if(!order && typeof checkout.id === 'string') order = await Order.findOne({ chargilyCheckoutId: checkout.id })

        // unknown order: acknowledge so Chargily stops retrying
        if(!order) return res.status(200).json({ received: true })

        if(event.type === 'checkout.paid'){
            const amount = Number(checkout.amount)
            if(!paidAmountIsValid(order, amount)){
                console.log(`Chargily: unexpected amount ${checkout.amount} for ${order.orderNumber}`)
                return res.status(200).json({ received: true })
            }
            await confirmOnlinePayment(order._id, amount)
        }
        // checkout.failed / checkout.canceled / checkout.expired: the order stays "unpaid", the customer can try again

        return res.status(200).json({ received: true })
    }catch(err){
        console.log(err)
        return res.status(500).json({ message: 'Something went wrong' })
    }
}
