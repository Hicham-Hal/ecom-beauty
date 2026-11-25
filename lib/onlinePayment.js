import Order from '../models/Order.model.js'

// The only deposits a customer can pay
export const DEPOSITS = [1000, 1500, 2000]

// Marks an order as paid by card. Atomic and safe to repeat (webhook + return page can both call it):
// only an order that is still unpaid/pending changes; a refused order stays refused.
// `amount` is what Chargily really received; it becomes the deposit of the order.
export const confirmOnlinePayment = (orderId, amount) =>
    Order.findOneAndUpdate(
        { _id: orderId, status: { $in: ['unpaid', 'pending'] } },
        { $set: { paid: true, status: 'confirmed', paymentMethod: 'online', deposit: amount, paidAt: new Date() } },
        { returnDocument: 'after' }
    )

// A paid Chargily checkout counts only when the amount is one of the allowed deposits and not above the order total
export const paidAmountIsValid = (order, amount) => DEPOSITS.includes(amount) && amount <= order.totalDue
