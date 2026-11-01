import express from 'express'
import { addToCart, deleteFromCart, getCart, removeAllFromCart } from '../controllers/cart.controller.js'

const router = express.Router()

router.get('/items', getCart)
router.post('/add', addToCart)
router.delete('/item', deleteFromCart)
router.delete('/', removeAllFromCart)

export default router