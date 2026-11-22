import e from 'express'
import { login, logout, refreshToken } from '../controllers/auth.controller.js'
import { validateToken } from '../lib/validToken.js'
import { loginValidator, registerValidator } from '../validators/auth.validator.js'
import { validate } from '../validators/validate.js'
import rateLimit from 'express-rate-limit'
const route = e.Router()


const loginLimiter = rateLimit({
    window: 15 * 60 * 1000,
    limit: 20,
    skipSuccessfulRequest: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many attempts, try again later' }
})

route.post('/login', loginValidator, validate, login)
route.post('/logout', logout)
route.get('/refresh-token', refreshToken)


export default route