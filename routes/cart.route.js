import express from 'express'
import { addToCart, deleteFromCart, getCart, removeAllFromCart } from '../controllers/cart.controller.js'

const router = express.Router()

router.get('/cart', getCart)
router.post('/cart', addToCart)
router.delete('/cart/item', deleteFromCart)
router.delete('/cart', removeAllFromCart)

export default router