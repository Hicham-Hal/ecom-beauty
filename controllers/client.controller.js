import mongoose from "mongoose"
import { createChargilyCheckout } from "../lib/chargily.js"
import Order from "../models/Order.model.js"
import Product from "../models/Product.model.js"
import User from "../models/User.model.js"
import Cart from "../models/Cart.model.js"

export const getProductsPerCategory = async(req, res) => {
    const { cat } = req.query
    if(!cat) return res.status(400).json({ message: 'cat parameter required' })
    try{
        const products = await Product.find({ category: cat })
        return res.status(200).json(products)
    }catch(err){
        console.log(err)
        return res.status(500).json({ error: 'Something went wrong'})
    }
}


export const checkout = async (req, res) => {
    const { firstName, lastName, phone, wilaya, commune, deliveryType, paymentMethod = 'cod' } = req.body
    const cartId = req.headers['x-cart-id']

    try {
        // 1. validate the customer data
        if (!firstName || !lastName || !phone || !wilaya || !commune || !deliveryType) {
            return res.status(400).json({ message: 'All delivery fields are required' })
        }
        if (!['home', 'stopdesk'].includes(deliveryType)) {
            return res.status(400).json({ message: 'Invalid delivery type' })
        }
        if (!['cod', 'chargily'].includes(paymentMethod)) {
            return res.status(400).json({ message: 'Invalid payment method' })
        }
        // Algerian mobile numbers: 05/06/07 + 8 digits
        if (!/^0[567]\d{8}$/.test(phone)) {
            return res.status(400).json({ message: 'Invalid phone number' })
        }

        // 2. load the cart
        if (!cartId || !mongoose.isValidObjectId(cartId)) {
            return res.status(400).json({ message: 'Cart is empty' })
        }
        const cart = await Cart.findById(cartId)
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: 'Cart is empty' })
        }

        // 3. build the order items using prices from the DATABASE (never from the client)
        const items = []
        let totalAmount = 0
        for (const cartItem of cart.items) {
            const product = await Product.findById(cartItem.product)
            if (!product) continue // product was deleted
            if (product.quantity < cartItem.quantity) {
                return res.status(400).json({ message: `Not enough stock for ${product.title}` })
            }
            items.push({
                product: product._id,
                title: product.title,
                price: product.price,
                quantity: cartItem.quantity,
                image: product.image
            })
            totalAmount += cartItem.quantity * product.price
        }

        if (items.length === 0) {
            return res.status(400).json({ message: 'None of the products in your cart are available anymore' })
        }

        const orderData = {
            customer: { firstName, lastName, phone },
            shippingAddress: { wilaya, commune, deliveryType },
            items,
            totalAmount,
            paymentMethod,
            cartId: cart._id
        }

        // 4a. Cash on delivery: reserve stock, save the order, clear the cart
        if (paymentMethod === 'cod') {
            
            const newOrder = await Order.create(orderData)

            cart.items = []
            cart.updatedAt = Date.now()
            await cart.save()

            return res.status(201).json({ order: newOrder })
        }

        // 4b. Online payment: save the order as pending and create the Chargily checkout.
        // Stock and the cart are handled later, when the payment is confirmed (webhook).
        const newOrder = await Order.create(orderData)

        const chargilyCheckout = await createChargilyCheckout({
            totalAmount,
            orderId: newOrder._id
        })

        newOrder.chargilyCheckoutId = chargilyCheckout.id
        await newOrder.save()

        return res.status(201).json({ order: newOrder, checkout_url: chargilyCheckout.checkout_url })

    } catch (err) {
        console.log(err)
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

export const getMyOrder = async(req, res) => {
    const {id} = req.params
    try{
        const order = await Order.findOne({ _id: id })
        if(!order) return res.status(404).json({ message: 'Order not found' })
        if(order.user.toString() !== req.user.id) return res.status(401).json({ message: 'You can\' access another user\'s order' })
        return res.status(200).json(order)    
    }catch(err){
        console.log(err)
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

export const getMyOrders = async (req, res) => {
    try{
        const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 })
        return res.status(200).json(orders)
    }catch(err){
        console.log(err)
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

export const cancelOrder = async(req, res) => {
    const {id} = req.body
    try{
        const order = await Order.findOne({ _id: id, user: req.user.id })
        if(order.orderStatus !== 'pending'){
            return res.status(400).json({ message: `Order can no longer be cancelled` })
        }
        order.orderStatus = 'cancelled'
        await order.save()

        //restore stock
        for (const item of order.items){
            await Product.findByIdAndUpdate(item.product, {
                $inc: { quantity: +item.quantity }
            })
        }

        return res.status(200).json({message: 'Order cancelled', order})
    }catch(err){
        console.log(err)
        return res.status(500).json({ error: 'Something went wrong' })
    }
}