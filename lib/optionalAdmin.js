import jwt from 'jsonwebtoken'
import User from '../models/User.model.js'

// Never blocks. It only sets req.isAdmin (true when a valid admin token is sent).
export const optionalAdmin = async(req, res, next) => {
    req.isAdmin = false
    try{
        const token = req.headers['authorization']?.split(' ')[1]
        if(token){
            const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
            const user = await User.findById(payload.id).select('role')
            req.isAdmin = user?.role === 'admin'
        }
    }catch{
        // invalid token = treated as a customer
    }
    next()
}