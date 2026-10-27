import e from 'express'
import { getMyOrders, checkout, getProductsPerCategory, getMyOrder, cancelOrder } from '../controllers/client.controller.js'
import { getProducts } from '../controllers/admin.controller.js'
import { validateToken } from '../lib/validToken.js'
import { checkoutValidator } from '../validators/checkout.validator.js'
import { validate } from '../validators/validate.js'
const route = e.Router()


route.get('/products', getProductsPerCategory)
route.get('/', getProducts)
route.post('/checkout', validateToken, checkoutValidator, validate, checkout) //checkout
route.get('/order/:id', validateToken, getMyOrder)
route.get('/orders', validateToken, getMyOrders)
route.post('/cancel', validateToken, cancelOrder)
export default route