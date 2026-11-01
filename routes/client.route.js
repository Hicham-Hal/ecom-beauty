import e from 'express'
import { getMyOrders, checkout, getProductsPerCategory, getMyOrder, cancelOrder } from '../controllers/client.controller.js'
import { getProducts } from '../controllers/admin.controller.js'
import { validateToken } from '../lib/validToken.js'
import { checkoutValidator } from '../validators/checkout.validator.js'
import { validate } from '../validators/validate.js'
const route = e.Router()


route.get('/products', getProductsPerCategory)
route.get('/', getProducts)
route.post('/checkout', checkout) //checkout
export default route