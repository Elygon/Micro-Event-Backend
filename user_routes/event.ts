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

        if (!title || !description || !address || !category || lng === undefined || lat === undefined) {
            return res.status(400).send({ status: 'error', msg: 'Missing required fields' })
        }

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
            organizer: (req as any).user._id,
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

        if (lng === undefined || lat === undefined) {
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
        const { eventId } = req.body
        
        const event = await Event.findById(eventId).populate('category').populate('organizer')

        if (!event) {
            return res.status(404).send({ status: 'error', msg: 'Event not found' })
        }

        return res.status(200).send({ status: 'ok', msg: 'success', event })
    } catch (error) {
        return res.status(500).send({ status: 'error', msg: 'Internal server error' })
    }
})


// ======================== MY EVENTS ========================
router.post('/my_events', token, async(req: Request, res: Response) => {
    try {
        const events = await Event.find({ organizer: (req as any).user._id })
        .populate('category').populate('organizer').sort({ createdAt: -1 })

        if (events.length === 0) {
            return res.status(200).send({ status: 'error', msg: 'No Events created' })
        }

        return res.status(200).send({ status: 'ok', msg: 'success', events })
    } catch (error: any) {
        console.log(error)
        if (error.name == 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid token' })
        }
        return res.status(500).send({ status: 'error', msg: 'Internal server error' })
    }
})


// ======================== UPDATE EVENT ========================
router.post('/update', multer.single('image'), token, async (req: Request, res: Response) => {
    try {
        const { eventId } = req.body

        const event: any = await Event.findById(eventId)

        if (!event) {
            return res.status(404).send({ status: 'error', msg: 'Event not found' })
        }

        const userId = (req as any).user._id

        if (!event.organizer.equals(userId)) {
            return res.status(403).send({ status: 'error', msg: 'Unauthorized' })
        }

        // Image update
        if ((req as any).file) {
            // delete old image if exists
            if (event.imgId) {
                try {
                    await cloudinary.uploader.destroy(event.imgId)
                } catch (err) {
                    console.error('Cloudinary delete error:', err)
                }
            }

            const upload = await cloudinary.uploader.upload((req as any).file.path, {
                folder: 'event_images'
            })

            event.imgUrl = upload.secure_url
            event.imgId = upload.public_id
        }

        // Update other event fields
        const { title, description, address, startDate, endDate, capacity, category, isPublic } = req.body
        
        event.title = title || event.title
        event.description = description || event.description
        event.address = address || event.address
        event.startDate = startDate || event.startDate
        event.endDate = endDate || event.endDate
        event.capacity = capacity || event.capacity
        event.category = category || event.category
        event.isPublic = isPublic ?? event.isPublic
        
        // Handle location update if provided
        if (req.body.lng !== undefined && req.body.lat !== undefined) {
            event.location = {
                type: 'Point',
                coordinates: [Number(req.body.lng), Number(req.body.lat)]
            }
        }

        await event.save()

        return res.status(200).send({ status: 'ok', msg: 'success', event })
    } catch (error: any) {
        console.log(error)
        if (error.name == 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid token' })
        }
        return res.status(500).send({ status: 'error', msg: 'Internal server error' })
    }
})


// ======================== CANCEL EVENT ========================
router.post('/cancel', token, async(req: Request, res: Response) => {
    try {
        const { eventId } = req.body
        const event: any = await Event.findById(eventId)

        if (!event) {
            return res.status(404).send({ status: 'error', msg: 'Event not found' })
        }

        if (event.organizer.toString() !== (req as any).user._id) {
            return res.status(403).send({ status: 'error', msg: 'Unauthorized' })
        }

        event.isCancelled = true
        await event.save()

        return res.status(200).send({ status: 'ok', msg: 'success' })
    } catch (error: any) {
        console.log(error)
        if (error.name == 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid token' })
        }
        return res.status(500).send({ status: 'error', msg: 'Internal server error' })
    }
})

// ======================== DELETE EVENTS ========================
router.post('/delete', token, async(req: Request, res: Response) => {
    try {
        const { eventId } = req.body
        const event: any = await Event.findById(eventId)

        if (!event) {
            return res.status(404).send({ status: 'error', msg: 'Event not found' })
        }

        if (event.organizer.toString() !== (req as any).user._id) {
            return res.status(403).send({ status: 'error', msg: 'Unauthorized' })
        }

        // delete image from cloudinary
        if (event.imgId) {
            try {
                await cloudinary.uploader.destroy(event.imgId)
            } catch (err) {
                console.error('Cloudinary delete error:', err)
            }
        }

        await event.deleteOne()

        return res.status(200).send({ status: 'ok', msg: 'success' })
    } catch (error: any) {
        console.log(error)
        if (error.name == 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid token' })
        }
        return res.status(500).send({ status: 'error', msg: 'Internal server error' })
    }
})
export default router