import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs/promises'

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
})

// Upload a multer file to Cloudinary, return { url, type }, then delete the temp file
export const uploadToCloud = async (file, folder = 'products') => {
    const isVideo = file.mimetype.startsWith('video/')
    try {
        const options = { folder, resource_type: isVideo ? 'video' : 'image' }
        const result = isVideo
            ? await cloudinary.uploader.upload_large(file.path, { ...options, chunk_size: 6_000_000 })
            : await cloudinary.uploader.upload(file.path, {
                  ...options,
                  quality: 'auto',
                  fetch_format: 'auto',
              })
        return { url: result.secure_url, type: isVideo ? 'video' : 'image' }
    } finally {
        await fs.unlink(file.path).catch(() => {}) // always clean the temp file
    }
}

// Delete a file from Cloudinary using its URL
export const deleteFromCloud = async (url) => {
    if (!url || !url.includes('res.cloudinary.com')) return
    const resourceType = url.includes('/video/upload/') ? 'video' : 'image'
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^./]+$/)
    if (!match) return
    await cloudinary.uploader.destroy(match[1], { resource_type: resourceType }).catch(() => {})
}