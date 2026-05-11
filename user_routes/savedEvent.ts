import express, { Request, Response } from 'express'
const router = express.Router()

import token from '../middleware/userToken'
import Event from '../models/event'
import SavedEvent from '../models/savedEvent'



// ======================== SAVE AN EVENT ========================
router.post('/save', token, async (req: Request, res: Response) => {
    try {
        const { eventId } = req.body
        
        if (!eventId) {
            return res.status(400).send({ status: 'error', msg: 'Event ID is required' })
        }

        // Check if event exists
        const existingEvent = await Event.findById(eventId)

        if (!existingEvent) {
            return res.status(404).send({ status: 'error', msg: 'Event not found' })
        }

        // Prevent saving cancelled events
        if (existingEvent.isCancelled) {
            return res.status(400).send({ status: 'error', msg: 'Cancelled event cannot be saved' })
        }

        // Check if already saved
        const alreadySaved = await SavedEvent.findOne({ user: (req as any).user._id, event: eventId })

        if (alreadySaved) {
            return res.status(400).send({ status: 'error', msg: 'Event already saved' })
        }

        const savedEvent = await SavedEvent.create({
            user: (req as any).user._id,
            event: eventId
        })

        return res.status(201).send({ status: 'ok', msg: 'success', savedEvent })

    } catch (error: any) {
        console.log(error)

        if (error.name === 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: error.message })
        }
        return res.status(500).send({ status: 'error', msg: 'Internal server error' })
    }
})


// ======================== UNSAVE EVENT ========================
router.post('/unsave', token, async (req: Request, res: Response) => {
    try {
        const { eventId } = req.body
        
        if (!eventId) {
            return res.status(400).send({ status: 'error', msg: 'Event ID is required' })
        }

        const savedEvent = await SavedEvent.findOne({ user: (req as any).user._id, event: eventId })

        if (!savedEvent) {
            return res.status(404).send({ status: 'error', msg: 'Saved Event not found' })
        }

        await savedEvent.deleteOne()

        return res.status(200).send({ status: 'ok', msg: 'success' })

    } catch (error: any) {
        console.log(error)

        if (error.name === 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: error.message })
        }
        return res.status(500).send({ status: 'error', msg: 'Internal server error' })
    }
})


// ======================== VIEW SAVED EVENTS ========================
router.post('/saved', token, async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10 } = req.body
        const skip = (page - 1) * limit

        const total = await Event.countDocuments({ isCancelled: false })
        const savedEvents = await SavedEvent.find({ user: (req as any).user._id })
        .populate({ path: 'event', populate: [
            { path: 'category' },
            { path: 'organizer',
                select: '-bio -interests -email -location -password -isVerified -profile_img_id -isOnline -createdAt -updatedAt -__v -deletionRequested -deletionRequestedAt -scheduledDeletionAt -verificationOTP -otpExpiresAt'
            } 
        ]}).sort({ createdAt: -1 }).skip(skip).limit(limit)


        return res.status(200).send({ 
            status: 'ok', msg: 'success', page, limit, total,
            totalPages: Math.ceil(total / limit), count: savedEvents.length, savedEvents
        })

    } catch (error: any) {
        console.log(error)

        if (error.name === 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: error.message })
        }
        return res.status(500).send({ status: 'error', msg: 'Internal server error' })
    }
})

export default router