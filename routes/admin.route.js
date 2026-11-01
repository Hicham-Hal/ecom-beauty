import e from 'express'
import { addProduct, deleteProduct, getAllOrder, getProducts, getSingleProduct, updateOrderStatus, updateProduct } from '../controllers/admin.controller.js'
import multer from 'multer'
import { validateToken } from '../lib/validToken.js'
import { isAdmin } from '../lib/isAdmin.js'
import { addProductValidator, deleteProductValidator, updateProductValidator } from '../validators/product.validator.js'
import { validate } from '../validators/validate.js'
import upload from '../middlewares/uploads.js'

const route = e.Router()

route.post('/add-product', validateToken, isAdmin, upload.single('product'), addProduct)
route.put('/product/:id', validateToken, isAdmin, upload.single('product'), updateProduct)
route.get('/product/:id', validateToken, isAdmin, getSingleProduct)
route.get('/products', validateToken, isAdmin, getProducts)
route.delete('/product/:id', validateToken, isAdmin, deleteProductValidator, validate, deleteProduct)
route.get('/orders', validateToken, isAdmin, getAllOrder)
route.put('/order/:id', validateToken, isAdmin, updateOrderStatus)
export default route