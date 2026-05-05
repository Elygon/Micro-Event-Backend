import multer, { FileFilterCallback } from 'multer'
import path from 'path'
import { Request } from 'express'

// 1. Storage config (you can customize destination if needed)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/') // make sure this folder exists
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + path.extname(file.originalname)
    cb(null, uniqueName)
  }
})

// 2. File filter
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase()

  if (!['.jpg', '.jpeg', '.png', '.gif', '.mp4'].includes(ext)) {
    return cb(new Error('File type is not supported'))
  }

  cb(null, true)
}

// 3. Multer instance
const upload = multer({
  storage,
  fileFilter
})

export default upload