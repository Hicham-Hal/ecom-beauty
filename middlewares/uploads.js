import multer from 'multer'
import path from 'path'
import fs from 'fs'

const uploadDir = 'uploads/tmp'

// Make sure the folder exists (multer's diskStorage does not create it when you pass a function)
fs.mkdirSync(uploadDir, { recursive: true })

// Storage config - saves to disk with a unique filename
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir)
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
        cb(null, uniqueSuffix + path.extname(file.originalname).toLowerCase())
    },
})

// Accept images and videos
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        cb(null, true)
    } else {
        cb(new Error('Only image or video files are allowed'), false)
    }
}

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB per file
        files: 31,                   // 10 images + 1 video + 20 color files
    },
})

export default upload