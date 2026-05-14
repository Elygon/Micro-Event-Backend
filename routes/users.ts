import express, { Request, Response } from 'express'
const router = express.Router()

import token from '../middleware/userToken'
import AdminOnly from '../middleware/adminOnly'
import User from '../models/user'

// ======================== TYPES ========================


// ======================== ALL USERS ========================
router.post('/all', token, AdminOnly, async(req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10 } = req.body
        const skip = (page - 1) * limit

        const total = await User.countDocuments({ role: 'User' })
        const users = await User.find({ role: 'User' }).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit)

        return res.status(200).send({ 
            status: 'ok', msg: 'success', total, totalPages: Math.ceil(total / limit), count: users.length, users })
    } catch(error: any) {
        console.error('Users Error:', error)
        if (error.name === 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid Token' })
        }
        return res.status(500).send({ status: 'error', msg: 'Internal Server Error' })
    }
})



// ======================== GET SINGLE USER ========================
router.post('/single', token, AdminOnly, async (req: Request, res: Response) => {
    try {
        const { userId } = req.body

        if (!userId) {
            return res.status(400).send({ status: 'error', msg: 'User ID is required' })
        }

        const user = await User.findById(userId).select('-password')

        if (!user) {
            return res.status(404).send({ status: 'error', msg: 'User not found' })
        }

        return res.status(200).send({ status: 'ok', msg: 'success', user })

    } catch (error: any) {
        console.log(error)

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).send({ status: 'error', msg: 'Invalid token' })
        }

        return res.status(500).send({ status: 'error', msg: 'Internal server error' })
    }
})

// ======================== PROMOTE TO ADMIN ========================
router.post('/make_admin', token, AdminOnly, async(req: Request, res: Response) => {
    try {
        const { userId } = req.body

        const user = await User.findById(userId)

        if(!user) {
            return res.status(404).send({ status: 'error', msg: 'User not found' })
        }

        user.role = 'Admin'
        await user.save()

        return res.status(200).send({ status: 'ok', msg: 'User promoted to admin'})
    } catch (error) {
        return res.status(500).send({ status: 'error', msg: 'Internal Server Error' })
    }
})

export default router