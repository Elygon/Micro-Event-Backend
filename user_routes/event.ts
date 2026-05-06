import express, { Request, Response } from 'express'
const router = express.Router()

import token from '../middleware/userToken'
import Event from '../models/event'
import cloudinary from '../utils/cloudinary'
import multer from '../utils/multer'


// ======================== TYPES ========================
type CreateEventBody = {
    title: string
    description: string
    address: string
    startDate: Date
    endDate?: Date
    capacity?: number
    category: string
    isPublic: boolean
    lng: number
    lat: number
}

// ======================== CREATE EVENT ========================
router.post('/create', multer.single('image'), token, async (req: Request, res: Response) => {
    try {
        const { 
            title, description, address, startDate, endDate, capacity, category, isPublic, lng, lat 
        } = req.body as CreateEventBody

        let imgId = ''
        let imgUrl = ''

        // Image upload
        if ((req as any).file) {
            const upload = await cloudinary.uploader.upload((req as any).file.path, {
                folder: 'event_images'
            })

            imgId = upload.public_id
            imgUrl = upload.secure_url
        }

        const event = await Event.create({
            title,
            description,
            address,
            startDate,
            endDate,
            capacity,
            category,
            isPublic,
            organizer: (req as any).user_id,
            location: {
                type: 'Point',
                coordinates: [Number(lng), Number(lat)]
            },
            imgId,
            imgUrl
        })

        return res.status(201).send({ status: 'ok', msg: 'success', event })
    } catch (error: any) {
        console.log(error)
        if (error.name == 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid token' })
        }
        return res.status(500).send({ status: 'error', msg: 'Internal server error' })
    }
})


// ======================== GET ALL EVENTS ========================
router.post('/all', token, async (req: Request, res: Response) => {
    try {
        const events = await Event.find({ isCancelled: false}).populate('category').populate('organizer').sort({ createdAt: -1})
        
        return res.status(200).send({ status: 'ok', msg: 'success', events })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ status: 'error', msg: 'Internal server error' })
    }
})


// ======================== GET NEARBY EVENTS ========================
router.post('/nearby', token, async (req: Request, res: Response) => {
    try {
        const { lng, lat, radius = 5000 } = req.body as { lng: number, lat: number, radius: number }

        if (!lng || !lat) {
            return res.status(400).send({ status: 'error', msg: 'longitude and latitude are required' })
        }

        const events = await Event.find({
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [Number(lng), Number(lat)]
                    },
                    $maxDistance: Number(radius)
                }
            },
            isCancelled: false
        }).populate('category').populate('organizer')

        return res.status(200).send({ status: 'ok', msg: 'success', events})
    } catch (error) {
        return res.status(500).send({ status: 'error', msg: 'Internal server error' })
    }
})


// ======================== GET SINGLE EVENT ========================
router.post('/single', token, async (req: Request, res: Response) => {
    try {
        const event = await Event.findById((req as any).user._id).populate('category').populate('organizer')

        if (!event) {
            return res.status(404).send({ status: 'error', msg: 'Event not found' })
        }

        return res.status(200).send({ status: 'ok', msg: 'success', event })
    } catch (error) {
        return res.status(500).send({ status: 'error', msg: 'Internal server error' })
    }
})


// ======================== UPDATE EVENT ========================
router.post('/update', multer.single('image'), token, async (req: Request, res: Response) => {
    try {
        const event: any = await Event.findById((req as any).user._id)

        if (!event) {
            return res.status(404).send({ status: 'error', msg: 'Event not found' })
        }
    }
})

// ======================== GET NEARBY EVENTS ========================

// ======================== GET NEARBY EVENTS ========================
export default router