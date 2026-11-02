import e from 'express'
import { getAllOrder, updateOrderStatus } from '../controllers/admin.controller.js'
import { validateToken } from '../lib/validToken.js'
import { isAdmin } from '../lib/isAdmin.js'

const route = e.Router()

route.get('/orders', validateToken, isAdmin, getAllOrder)
route.put('/order/:id', validateToken, isAdmin, updateOrderStatus)

export default route