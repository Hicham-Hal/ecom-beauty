import e from 'express'
import { addProduct, deleteProduct, getProducts, getSingleProduct, updateProduct } from '../controllers/product.controller.js'
import { validateToken } from '../lib/validToken.js'
import { isAdmin } from '../lib/isAdmin.js'

const route = e.Router()

// public (the customer site)
route.get('/products', getProducts)
route.get('/products/:id', getSingleProduct)

// admin only (the dashboard)
route.post('/products', validateToken, isAdmin, addProduct)
route.put('/products/:id', validateToken, isAdmin, updateProduct)
route.delete('/products/:id', validateToken, isAdmin, deleteProduct)

export default route