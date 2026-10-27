// controllers/cart.js
import Cart from '../models/Cart.model.js'
import Product from '../models/Product.model.js'

// Helper: find the cart from the header, or create a new one
const getOrCreateCart = async (cartId) => {
    let cart = null
    if (cartId && mongoose.isValidObjectId(cartId)) {
        cart = await Cart.findById(cartId)
    }
    if (!cart) cart = new Cart({ items: [] })
    return cart
}

export const addToCart = async (req, res) => {
    const { productId, quantity = 1 } = req.body
    const cartId = req.headers['x-cart-id']

    try {
        if (!productId) {
            return res.status(400).json({ message: 'Product ID is required' })
        }
        if (!Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({ message: 'Quantity must be a whole number of at least 1' })
        }

        const product = await Product.findById(productId)
        if (!product) {
            return res.status(404).json({ message: 'Product not found' })
        }

        const cart = await getOrCreateCart(cartId)

        const existingItem = cart.items.find(item => item.product.toString() === productId)
        if (existingItem) {
            existingItem.quantity += quantity
        } else {
            cart.items.push({ product: productId, quantity })
        }

        cart.updatedAt = Date.now()
        await cart.save()
        await cart.populate('items.product')

        // The client must save this cartId
        return res.status(200).json({ cartId: cart._id, items: cart.items })
    } catch (err) {
        console.log(err)
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

export const getCart = async (req, res) => {
    const cartId = req.headers['x-cart-id']
    try {
        if (!cartId || !mongoose.isValidObjectId(cartId)) {
            return res.status(200).json({ cartId: null, items: [] })
        }
        const cart = await Cart.findById(cartId).populate('items.product')
        if (!cart) return res.status(200).json({ cartId: null, items: [] })
        return res.status(200).json({ cartId: cart._id, items: cart.items })
    } catch (err) {
        console.log(err)
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

export const deleteFromCart = async (req, res) => {
    const { itemId } = req.body
    const cartId = req.headers['x-cart-id']
    try {
        const cart = await Cart.findById(cartId)
        if (!cart) return res.status(404).json({ message: 'Cart not found' })

        const exists = cart.items.some(item => item._id.toString() === itemId)
        if (!exists) return res.status(404).json({ message: 'Cart item not found' })

        cart.items = cart.items.filter(item => item._id.toString() !== itemId)
        cart.updatedAt = Date.now()
        await cart.save()
        await cart.populate('items.product')

        return res.status(200).json({ cartId: cart._id, items: cart.items })
    } catch (err) {
        console.log(err)
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

export const removeAllFromCart = async (req, res) => {
    const cartId = req.headers['x-cart-id']
    try {
        const cart = await Cart.findById(cartId)
        if (!cart) return res.status(404).json({ message: 'Cart not found' })
        if (cart.items.length === 0) {
            return res.status(400).json({ message: 'Cart is already empty' })
        }
        cart.items = []
        cart.updatedAt = Date.now()
        await cart.save()
        return res.status(200).json({ cartId: cart._id, items: [] })
    } catch (err) {
        console.log(err)
        return res.status(500).json({ error: 'Something went wrong' })
    }
}