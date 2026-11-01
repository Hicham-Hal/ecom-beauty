import Order from "../models/Order.model.js";
import Product from "../models/Product.model.js";

export const addProduct = async(req, res) => {
    const { title, description, price, category, quantity } = req.body;
    if(!title || !description || !price || !category){
        return res.status(400).json({ message: 'Fields are required' })
    }
    if(!req.file){
        return res.status(400).json({ message: 'Image is required' })
    }
    try{
        const product = new Product({
            title,
            description,
            price,
            image: `/uploads/products/${req.file.filename}`,
            category,
        })
        await product.save()
        return res.status(201).json(product)
    }catch(err){
        console.log(err)
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

export const updateProduct = async(req, res) => {
    const { id } = req.params
    const { title, description, price, category } = req.body;
    try{
        const product = await Product.findById(id)
        if(!product) return res.status(404).json({ message: 'Product not found' })
        product.title = title ? title : product.title
        product.description = description? description : product.description;
        product.category = category? category: product.category;
        product.price = price? price : product.price;
        product.image = req.file ? req.file.filename : product.image

        await product.save()
        return res.status(200).json(product)
    }catch(err){
        console.log(err)
        return res.status(500).json({ error: 'Something went wrongs' })
    }
}

export const deleteProduct = async(req, res) => {
    const { id } = req.params
    try{
        const product = await Product.findById(id)
        if(!product) return res.status(404).json({ message: 'product not found' })
        await product.deleteOne()
        return res.status(204).send()
    }catch(err){
        console.log(err)
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

export const getProducts = async(req, res) => {
    try{
        const products = await Product.find();
        if(!products) return res.status(400).json({ message: 'Can\' get products' })
        return res.status(200).json(products)
    }catch(err){
        console.log(err)
        return res.status(500).json({ message: 'Something went wrong' })
    }
}

export const getSingleProduct = async(req, res) => {
    const { id } = req.params
    try{
        const product = await Product.findById(id)
        if(!product) return res.status(404).json({ message: 'Product not found' })
        return res.status(200).json(product)
    }catch(err){
        console.log(err)
        return res.status(500).json({ message: 'Something went wrong' })
    }
}

export const getAllOrder = async(req, res) => {
    try{
        const orders = await Order.find();
        return res.status(200).json(orders)
    }catch(err){
        console.log(err)
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

export const updateOrderStatus = async(req, res) => {
    const {orderStatus} = req.body
    const {id} = req.params
    try{
        const order = await Order.findById(id)
        if(!order) return res.status(404).json({ message: 'Order not found' })
        if(!orderStatus) return res.status(401).json({ message: 'You should provide the new order status' })
        order.status = orderStatus
        await order.save()
        return res.status(200).json(order)
    }catch(err){
        console.log(err)
        return res.status(500).json({ error: 'Something went wrong' })
    }
}