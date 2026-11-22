import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadDir = path.join(__dirname, '..', 'uploads', 'tmp')   // temporary, files go to Cloudinary
fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
        cb(null, unique + path.extname(file.originalname).toLowerCase())
    },
})

const invalidType = (message) => Object.assign(new Error(message), { status: 400 })

const make = ({ maxMB, allowVideo }) =>
    multer({
        storage,
        fileFilter: (req, file, cb) => {
            const ok = file.mimetype.startsWith('image/') || (allowVideo && file.mimetype.startsWith('video/'))
            ok ? cb(null, true) : cb(invalidType(allowVideo ? 'Only image or video files are allowed' : 'Only image files are allowed'), false)
        },
        limits: { fileSize: maxMB * 1024 * 1024 * 2, files: 1 },
    })

const adminUpload = make({ maxMB: 100, allowVideo: true })    // admin: photos + videos
const receiptUpload = make({ maxMB: 5, allowVideo: false })   // customers: receipt photo only

// use after optionalAdmin
export const chooseUpload = (req, res, next) =>
    (req.isAdmin ? adminUpload : receiptUpload).single('file')(req, res, next)