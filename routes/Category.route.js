import exporess from 'express'
import { isAdmin } from '../lib/isAdmin.js'

const route = express.Router()


route.post('/categories', isAdmin, addCategory)

export default route