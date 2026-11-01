import User from "../models/User.model.js"
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

export const login = async(req, res) => {
    const {email, password} = req.body
    try{
        const user = await User.findOne({ email })
        if(!user) return res.status(401).json({ message: 'wrong credentials, Please try again' })
        const comparedPwd = await bcrypt.compare(password, user.password)
        if(!comparedPwd) return res.status(401).json({ message: 'wrong credentials, please try again' })
        const accessToken = jwt.sign({ id: user._id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '2h' })
        const refreshToken = jwt.sign({id: user._id}, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' })
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,  
            secure: true,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        })
        return res.status(200).json({ user, accessToken })
    }catch(err){
        console.log(err)
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

export const register = async(req, res) => {
    const {name, email, password, role} = req.body
    try{
        const user = await User.findOne({ email })
        if(user) return res.status(401).json({ message: 'Email already exist' })
        const salt = await bcrypt.genSaltSync(12)
        const hashedPwd = await bcrypt.hashSync(password, salt)
        const newUser = new User({
            name,
            email,
            password: hashedPwd,
            role: role ? role : 'customer'
        })
        await newUser.save()
        const accessToken = jwt.sign({ id: newUser._id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '2h' })
        const refreshToken = jwt.sign({id: newUser._id}, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' })
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,  
            secure: true,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        })
        return res.status(201).json({ message: 'User created successfully', accessToken: accessToken })
    }catch(err){
        console.log(err)
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

export const logout = async(req, res) => {
    try{
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: true,
            sameSite: 'strict'
        })
        return res.status(200).json({ message: 'logged out successfully' })
    }catch(err){
        console.log(err)
        return res.status(500).json({ error: 'Something went wrong' })
    }
}

export const refreshToken = async(req, res) => {

    try{
        const token = req.cookies.refreshToken
        const decode = await jwt.verify(token, process.env.REFRESH_TOKEN_SECRET)
        const accessToken = jwt.sign({ id: decode.id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '2h' })
        return res.status(200).json({ accessToken })
    }catch(err){
        console.log(err)
        return res.status(500).json({ error: 'Something went wrong' })
    }
}