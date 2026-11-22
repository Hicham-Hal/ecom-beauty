import 'dotenv/config'
import fs from 'fs'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
})

// Videos are sent in chunks. The SDK function takes a callback and returns a stream (not a promise),
// so it is wrapped here: this resolves only when the upload is finished.
const uploadVideo = (filePath, options) =>
    new Promise((resolve, reject) => {
        const chunker = cloudinary.uploader.upload_chunked_stream(
            { ...options, chunk_size: 6_000_000, disable_promises: true },
            (error, result) => (error ? reject(error) : resolve(result))
        )
        const reader = fs.createReadStream(filePath)
        reader.on('error', reject)
        chunker.on('error', reject)
        reader.pipe(chunker)
    })

// Upload a multer file to Cloudinary, return { url, type }, then delete the temp file
export const uploadToCloud = async (file, folder = 'products') => {
    const isVideo = file.mimetype.startsWith('video/')
    try {
        const options = { folder, resource_type: isVideo ? 'video' : 'image' }
        const result = isVideo
            ? await uploadVideo(file.path, options)
            : await cloudinary.uploader.upload(file.path, options)
        return { url: result.secure_url, type: isVideo ? 'video' : 'image' }
    } finally {
        await fs.promises.unlink(file.path).catch(() => {})
    }
}

// Delete a file from Cloudinary using its URL. Never throws.
export const deleteFromCloud = async (url) => {
    try {
        if (!url || !url.includes('res.cloudinary.com')) return
        const resourceType = url.includes('/video/upload/') ? 'video' : 'image'
        const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^./]+$/)
        if (!match) return
        await cloudinary.uploader.destroy(match[1], { resource_type: resourceType })
    } catch (err) {
        console.log('Cloudinary delete failed:', err.message)
    }
}