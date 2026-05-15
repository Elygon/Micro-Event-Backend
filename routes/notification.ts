import express, { Request, Response } from 'express'
const router = express.Router()

import token from '../middleware/userToken'
import adminOnly from '../middleware/adminOnly'
import Notification from '../models/notification'
import User from '../models/user'

// ======================== GET MY NOTIFICATIONS ========================
router.post('/all', token, async(req: Request, res: Response) => {
    try {
        const { page = 1, limit = 20 } = req.body
        const skip = (page - 1) * limit

        const query = { user: (req as any).user._id }

        const totalCount = await Notification.countDocuments(query)
        const notifications = await Notification.find(query).populate('event')
        .populate('fromUser', 'firstname lastname username profile_img_url')
        .sort({ createdAt: -1 }).skip(skip).limit(limit)

        return res.status(200).send({
            status: 'ok', msg: 'success', page, limit, totalCount, totalPages: Math.ceil(totalCount / limit),
            count: notifications.length, notifications
        })
    } catch (error: any) {
        console.log(error)

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).send({status: 'error', msg: 'Invalid token' })
        }

        return res.status(500).send({ status: 'error', msg: 'Internal server error' })
    }
})


// ======================== MARK SINGLE NOTIFICATION AS READ ========================
router.post('/read', token, async(req: Request, res: Response) => {
    try {
        const { notificationId } = req.body

        if (!notificationId) {
            return res.status(400).send({ status: 'error', msg: 'Notification ID is required' })
        }

        const notification: any = await Notification.findById(notificationId)
        if (!notification) {
            return res.status(404).send({ status: 'error', msg: 'Notification not found' })
        }

        if (notification.user.toString() !== (req as any).user._id) {
            return res.status(403).send({ status: 'error', msg: 'Unauthorized' })
        }

        notification.isRead = true
        await notification.save()

        return res.status(200).send({ status: 'ok', msg: 'success' })
    } catch (error: any) {
        console.error('Notification Read Error:', error)
        if (error.name === 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid token' })
        }
        return res.status(500).send({ status: 'error', msg: 'Internal Server Error' })
    }
})


// ======================== MARK ALL AS READ ========================
router.post('/read_all', token, async(req: Request, res: Response) => {
    try {
        await Notification.updateMany(
            { user: (req as any).user._id, isRead: false },
            { $set: { isRead: true }}
        )

        return res.status(200).send({ status: 'ok', msg: 'success' })
    } catch (error: any) {
        console.error('Notification Read Error:', error)
        if (error.name === 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid token' })
        }
        return res.status(500).send({ status: 'error', msg: 'Internal Server Error' })
    }
})


// ======================== DELETE SINGLE NOTIFICATION ========================
router.post('/delete', token, async(req: Request, res: Response) => {
    try {
        const { notificationId } = req.body
        if (notificationId) {
            return res.status(400).send({ status: 'error', msg: 'Notification ID is required' })
        }

        const notification: any = await Notification.findById(notificationId)
        if (!notification) {
            return res.status(404).send({ status: 'error', msg: 'Notification not found'})
        }

        if (notification.user.toString() !== (req as any).user._id) {
            return res.status(403).send({ status: 'error', msg: 'Unauthorized' })
        }

        await Notification.deleteOne()
        
        return res.status(200).send({ status: 'ok', msg: 'success' })
    } catch (error: any) {
        console.error('Notification Delete Error:', error)
        if (error.name === 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid token' })
        }
        return res.status(500).send({ status: 'error', msg: 'Internal Server Error' })
    }
})


// ======================== CLEAR ALL NOTIFICATION ========================
router.post('/clear', token, async(req: Request, res: Response) => {
    try {
        await Notification.deleteMany({ user: (req as any).user._id })
        
        return res.status(200).send({ status: 'ok', msg: 'success' })
    } catch (error: any) {
        console.error('Notification Clear Error:', error)
        if (error.name === 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid token' })
        }
        return res.status(500).send({ status: 'error', msg: 'Internal Server Error' })
    }
})


// ======================== UNREAD COUNT NOTIFICATIONS ========================
router.post('/unread_count', token, async(req: Request, res: Response) => {
    try {
        const count = await Notification.countDocuments({ user: (req as any).user._id, isRead: false })
        
        return res.status(200).send({ status: 'ok', unreadCount: count })
    } catch (error: any) {
        console.error('Notification Count Error:', error)
        if (error.name === 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid token' })
        }
        return res.status(500).send({ status: 'error', msg: 'Internal Server Error' })
    }
})


// ======================== SYSTEM NOTIFICATIONS (ADMIN ONLY) ========================
router.post('/system', token, adminOnly, async(req: Request, res: Response) => {
    try {
        const { page = 1, limit = 20, type } = req.body
        const skip = (page - 1) * limit

        // Optional filter by notification type
        const filter: any = {}
        if (type) {
            filter.type = type
        }

        const totalCount = await Notification.countDocuments(filter)

        const notifications = await Notification.find(filter)
        .populate({
            path: 'user', select: 'firstname lastname username profile_img_url role'
        })
        .populate({
            path: 'fromUser', select: 'firstname lastname username profile_img_url'
        })
        .populate({
            path: 'event', select: 'title address startDate isCancelled'
        })
        .sort({ createdAt: -1 }).skip(skip).limit(limit)

        return res.status(200).send({
            status: 'ok', msg: 'success', page, limit, totalCount, totalPages: Math.ceil(totalCount / limit),
            count: notifications.length, notifications
        })
    } catch (error: any) {
        console.error('Notification System Error:', error)
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).send({status: 'error', msg: 'Invalid token' })
        }

        return res.status(500).send({ status: 'error', msg: 'Internal server error' })
    }
})


// ======================== SAVE DEVICE TOKEN ========================
router.post('/save_token', token, async(req: Request, res: Response) => {
    try {
        const { deviceToken } = req.body
        if (!deviceToken) {
            return res.status(400).send({ status: 'error', msg: 'Device token is required' })
        }

        await User.findByIdAndUpdate( (req as any).user._id, { deviceToken } )

        return res.status(200).send({ status: 'ok', msg: 'Device token saved' })
    } catch (error: any) {
        console.error('Device Token Error:', error)
        if (error.name === 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid token' })
        }
        return res.status(500).send({ status: 'error', msg: 'Internal Server Error' })
    }
})
export default router