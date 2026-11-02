import e from 'express'
import { addProduct, deleteProduct, getProducts, getSingleProduct, updateProduct } from '../controllers/admin.controller.js'
import { validateToken } from '../lib/validToken.js'
import { isAdmin } from '../lib/isAdmin.js'
import { deleteProductValidator } from '../validators/product.validator.js'
import { validate } from '../validators/validate.js'
import upload from '../middlewares/uploads.js'
import { uploadToCloud } from '../lib/cloudinary.js'

const route = e.Router()

route.get('/products', getProducts)                 // public
route.get('/products/:id', getSingleProduct)        // public
route.post('/products', validateToken, isAdmin, addProduct)
route.put('/products/:id', validateToken, isAdmin, updateProduct)
route.delete('/products/:id', validateToken, isAdmin, deleteProductValidator, validate, deleteProduct)

route.post('/uploads', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'File is required' })
    try {
        const { url } = await uploadToCloud(req.file, 'products')
        return res.status(201).json({ url })
    } catch (err) {
        console.log(err)
        return res.status(500).json({ message: 'Upload failed' })
    }
})

export default route