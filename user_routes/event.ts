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
    const { page = 1, limit = 10 } = req.body

    const skip = (page - 1) * limit

    try {
        const total = await Event.countDocuments({ isCancelled: false })

        const events = await Event.find({ isCancelled: false})
        .populate('category')
        .populate({
            path: 'organizer', 
            select: 
            '-bio -interests -email -location -password -isVerified -profile_img_id -isOnline -createdAt -updatedAt -__v -deletionRequested -deletionRequestedAt -scheduledDeletionAt -verificationOTP -otpExpiresAt' 
        })
        .sort({ createdAt: -1}).skip(skip).limit(limit)
        
        return res.status(200).send({ 
            status: 'ok', msg: 'success', page, limit, total,
            totalPages: Math.ceil(total / limit), count: events.length, events 
        })
    } catch (error) {
        console.log(error)
        return res.status(500).send({ status: 'error', msg: 'Internal server error' })
    }
})


// ======================== GET NEARBY EVENTS ========================
router.post('/nearby', token, async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10 } = req.body
        const { lng, lat, radius = 5000 } = req.body as { lng: number, lat: number, radius: number }

        if (lng === undefined || lat === undefined) {
            return res.status(400).send({ status: 'error', msg: 'longitude and latitude are required' })
        }

        const skip = (page - 1) * limit

        const centerCoordinates = [lng, lat]

        // convert radius from meters to radians for $centerSphere (Earth's radius is approx 6378.1 km)
        const radiusInRadians = radius / 6378100

        // 1. Query for Counting (Uses $geoWithin to avoid the sorting error)
        const countQuery = {
            location: {
                $geoWithin: {
                    $centerSphere: [centerCoordinates, radiusInRadians]
                }
            },
            isCancelled: false
        }

        // 2. Query for Data (Uses $near to provide distance-based sorting)
        const dataQuery = {
            location: {
                $near: {
                    $geometry: { type: 'Point', coordinates: centerCoordinates },
                    $maxDistance: radius
                }
            },
            isCancelled: false
        }
        
        // Execute both
        const totalCount = await Event.countDocuments(countQuery)
        const events = await Event.find(dataQuery).populate('category')
        .populate({
            path: 'organizer', 
            select: 
            '-bio -interests -email -location -password -isVerified -profile_img_id -isOnline -createdAt -updatedAt -__v -deletionRequested -deletionRequestedAt -scheduledDeletionAt -verificationOTP -otpExpiresAt' 
        }).skip(skip).limit(limit)

        return res.status(200).send({ 
            status: 'ok', msg: 'success', count: events.length, totalCount, page, limit, 
            totalPages: Math.ceil(totalCount / limit), events 
        })
    } catch (error: any) {
        // Log the error to see what's happening
        console.error('Nearby Error:', error)
        
        return res.status(500).send({ status: 'error', msg: 'Internal server error' })
    }
})


// ======================== GET SINGLE EVENT ========================
router.post('/single', token, async (req: Request, res: Response) => {
    try {
        const { eventId } = req.body
        
        const event = await Event.findById(eventId).populate('category')
        .populate({
            path: 'organizer', 
            select: 
            '-bio -interests -email -location -password -isVerified -profile_img_id -isOnline -createdAt -updatedAt -__v -deletionRequested -deletionRequestedAt -scheduledDeletionAt -verificationOTP -otpExpiresAt' 
        })

        if (!event) {
            return res.status(404).send({ status: 'error', msg: 'Event not found' })
        }

        return res.status(200).send({ status: 'ok', msg: 'success', event })
    } catch (error: any) {
        // Log the error to see what's happening
        console.error("Single Event Fetch Error:", error.message)
        
        return res.status(500).send({ status: 'error', msg: 'Internal server error' })
    }
})


// ======================== MY EVENTS ========================
router.post('/my_events', token, async(req: Request, res: Response) => {
    try {
        const { page = 1 , limit = 10 } = req.body
        const skip = (page - 1) * limit

        const query = { organizer: (req as any).user._id }
        const totalCount = await Event.countDocuments(query)

        const events = await Event.find(query)
        .populate('category')
        .populate({ path: 'organizer', select: '-password -deletionRequested -deletionRequestedAt -scheduledDeletionAt -verificationOTP -otpExpiresAt' })
        .sort({ createdAt: -1 }).skip(skip).limit(limit)

        return res.status(200).send({ status: 'ok', msg: 'success', count: events.length, totalCount, page, limit, 
            totalPages: Math.ceil(totalCount / limit), events
        })
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
/*router.post('/cancel', token, async(req: Request, res: Response) => {
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


// ======================== RESTORE EVENT ========================
router.post('/restore', token, async(req: Request, res: Response) => {
    try {
        const { eventId } = req.body
        const event: any = await Event.findById(eventId)

        if (!event) {
            return res.status(404).send({ status: 'error', msg: 'Event not found' })
        }

        const userId = (req as any).user._id

        if(!event.organizer.equals(userId)) {
            return res.status(403).send({ status: 'error', msg: 'Unauthorized' })
        }

        event.isCancelled = false
        await event.save()

        return res.status(200).send({ status: 'ok', msg: 'success' })
    } catch(error: any) {
        console.error('Restore Event Error:', error)
        if (error.name == 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid token'})
        }
        return res.status(500).send({ status: 'error', msg: 'Internal Error'})
    }
})*/


// ======================== TOGGLE CANCEL ========================
router.post('/toggle_cancel', token, async(req: Request, res: Response) => {
    try {
        const { eventId } = req.body

        const event: any = await Event.findById(eventId)

        if (!event) {
            return res.status(404).send({ status: 'error', msg: 'Event not found' })
        }

        const userId = (req as any).user._id

        if(!event.organizer.equals(userId)){
            return res.status(403).send({ status: 'error', msg: 'Unauthorized'})
        }

        event.isCancelled =!event.isCancelled
        await event.save()

        return res.status(200).send({
            status: 'ok', msg: event.isCancelled ? 'Event cancelled' : 'Event restored', event
        })
    } catch (error: any) {
        console.log('Toggle Cancel Error:', error)
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

        const userId = (req as any).user._id

        if (!event.organizer.equals(userId)) {
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