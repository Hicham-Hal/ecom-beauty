import e from 'express'
import { addProduct, deleteProduct, getAllOrder, getProducts, getSingleProduct, updateOrderStatus, updateProduct } from '../controllers/admin.controller.js'
import { validateToken } from '../lib/validToken.js'
import { isAdmin } from '../lib/isAdmin.js'
import { deleteProductValidator } from '../validators/product.validator.js'
import { validate } from '../validators/validate.js'
import upload from '../middlewares/uploads.js'

const route = e.Router()

const productUploads = upload.fields([
    { name: 'images', maxCount: 10 },      // product photos (first = main)
    { name: 'video', maxCount: 1 },        // optional product video
    { name: 'colorMedia', maxCount: 20 },  // photo/video for each color
])

route.post('/add-product', validateToken, isAdmin, productUploads, addProduct)
route.put('/product/:id', validateToken, isAdmin, productUploads, updateProduct)
route.get('/product/:id', validateToken, isAdmin, getSingleProduct)
route.get('/products', validateToken, isAdmin, getProducts)
route.delete('/product/:id', validateToken, isAdmin, deleteProductValidator, validate, deleteProduct)
route.get('/orders', validateToken, isAdmin, getAllOrder)
route.put('/order/:id', validateToken, isAdmin, updateOrderStatus)

export default route