import express, { Request, Response } from 'express'
const router = express.Router()

import token from '../middleware/userToken'
import User from '../models/user'
import cloudinary from '../utils/cloudinary'
import uploader from '../utils/multer'


// ======================== TYPES ========================
type UpdateProfileBody = {
  firstname?: string
  middlename?: string
  lastname?: string
  username?: string
  email?: string
  bio?: string
  interests?: 'Tech' | 'Music' | 'Sports'
}

// ======================== VIEW PROFILE ========================
router.post('/view', token, async (req: Request, res: Response) => {
    try {
        const user = await User.findById((req as any).user._id).lean()

        if (!user) {
            return res.status(200).send({ status: 'ok', msg: 'No User Found', user})
        }

        return res.status(200).send({ status: 'ok', msg: 'success', user})
    } catch (error: any) {
        console.log(error)
        if (error.name == 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid token'})
        }
        return res.status(500).send({ status: 'error', msg: 'Error occurred'})
    }
})


// ======================== UPDATE PROFILE ========================
router.post('/update', uploader.any(), token, async (req: Request, res: Response) => {
    try {
        const { firstname, middlename, lastname, username, email, bio, interests} = req.body as UpdateProfileBody

        let user: any = await User.findById((req as any).user._id)

        if (!user) {
            return res.status(404).send({ status: 'error', msg: 'User not found'})
        }

        // Find the uploaded file
        const files = (req as any).files

        // Image handling
        if (files && files.length > 0) {
            const file = files[0]
            
            // delete old image if exists
            if (user.profile_img_id) {
                try {
                    await cloudinary.uploader.destroy(user.profile_img_id)
                } catch (err) {
                    console.error('Cloudinary delete error:', err)

                }
            }
    
            // upload new image to cloudinary
            const upload = await cloudinary.uploader.upload(file.path, {
                folder: 'profile_photo'
            })

            user.profile_img_id = upload.public_id
            user.profile_img_url = upload.secure_url
        }

        // Update user fields
        user.firstname = firstname || user.firstname
        user.middlename = middlename || user.middlename
        user.lastname = lastname || user.lastname
        user.username = username || user.username
        user.email = email || user.email
        user.bio = bio || user.bio
        user.interests = interests || user.interests

        await user.save()

        return res.status(200).send({ status: 'ok', msg: 'success', user})
    } catch (error: any) {
        console.log(error)
        if (error.name == 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid token'})
        }
        return res.status(500).send({ status: 'error', msg: 'Error occurred'})

    }
})

export default router