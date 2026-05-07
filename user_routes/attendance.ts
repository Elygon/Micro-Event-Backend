import express, { Request, Response } from 'express'
const router = express.Router()

import Attendance from '../models/attendance'
import token from '../middleware/userToken'
import Event from '../models/event'
//import User from '../models/user'

// ======================== ATTEND AN EVENT ========================
router.post('/attend', token, async(req: Request, res: Response) => {
    try {
        const { eventId, status } = req.body

        if ( !eventId || !status ) {
            return res.status(400).send({ status: 'error', msg: 'All fields are required' })
        }

        // Validate status
        if (!['going', 'maybe', 'declined'].includes(status)) {
            return res.status(400).send({ status: 'error', msg: 'Invalid attendance status' })
        }

        // Check if event exists
        const event: any = await Event.findById(eventId)

        if (!event) {
            return res.status(404).send({ status: 'error', msg: 'Event not found' })
        }

        // Prevent attending cancelled events
        if (event.isCancelled) {
            return res.status(400).send({ status: 'error', msg: 'Cancelled event cannot be attended' })
        }

        // Check if already attending
        const existingAttendance = await Attendance.findOne({ user: (req as any).user._id, event: eventId })

        if (existingAttendance) {
            return res.status(400).send({ status: 'error', msg: 'Attendance already exists' })
        }

        // Capacity enforcement
        if (status === 'going' && event.capacity && event.attendeesCount >= event.capacity) {
            return res.status(400).send({ status: 'error', msg: 'Event is already at full capacity' })
        }

        const attendance = await Attendance.create({ user: (req as any).user._id, event: eventId, status })

        // Increment attendees count
        if (status === 'going') {
            event.attendeesCount += 1

            await event.save()
        }

        return res.status(201).send({ status: 'success', attendance })

    } catch (error: any) {
        console.log(error)
        if (error.name === 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid token' })
        }
        return res.status(500).send({ status: 'error', msg: 'Internal server error' })
    }
})


// ======================== UPDATE ATTENDANCE STATUS ========================
router.post('/update', token, async(req: Request, res: Response) => {
    try {
        const { eventId, status } = req.body

        if (!eventId || !status) {
            return res.status(400).send({ status: 'error', msg: 'All fields are required' })
        }

        // Validate status
        if (!['going', 'maybe', 'declined'].includes(status)) {
            return res.status(400).send({ status: 'error', msg: 'Invalid attendance status' })
        }

        // Check if event exists
        const event: any = await Event.findById(eventId)

        if (!event) {
            return res.status(404).send({ status: 'error', msg: 'Event not found' })
        }

        // Check if user has an existing attendance record
        const attendance: any = await Attendance.findOne({ user: (req as any).user._id, event: eventId })

        if (!attendance) {
            return res.status(404).send({ status: 'error', msg: 'Attendance record not found' })
        }

        // Prevent updating to the same status
        if (attendance.status === status) {
            return res.status(400).send({ status: 'error', msg: 'Attendance status already set' })
        }

        // Capacity enforcement
        if ( attendance.status !== 'going' && 
            status === 'going' && event.capacity && event.attendeesCount >= event.capacity
        ) {
            return res.status(400).send({ status: 'error', msg: 'Event is already at full capacity' })
        }

        // Increment attendees count
        if ( attendance.status !== 'going' && status === 'going' ) {
            event.attendeesCount += 1
        }

        // Decrement attendees count
        if (attendance.status === 'going' && status !== 'going') {
            event.attendeesCount -= 1
        }
        
        // Update attendance status
        attendance.status = status

        await attendance.save()
        await event.save()

        return res.status(200).send({ status: 'success', attendance })

    } catch (error: any) {
        console.log(error)
        if (error.name === 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid token' })
        }
        return res.status(500).send({ status: 'error', msg: 'Internal server error' })
    }
})


// ======================== REMOVE ATTENDANCE ========================
router.post('/remove', token, async(req: Request, res: Response) => {
    try {
        const { eventId } = req.body

        if (!eventId) {
            return res.status(400).send({ status: 'error', msg: 'Event ID is required' })
        }

        // Check if user has an existing attendance record
        const attendance: any = await Attendance.findOne({ user: (req as any).user._id, event: eventId })

        if (!attendance) {
            return res.status(404).send({ status: 'error', msg: 'Attendance not found' })
        }

        // Decrement attendees count
        if (attendance.status === 'going') {
            const event: any = await Event.findById(eventId)

            if (event && event.attendeesCount > 0) {
                event.attendeesCount -= 1
                await event.save()
            }
        }

        await attendance.deleteOne()

        return res.status(200).send({ status: 'success', msg: 'Attendance removed' })

    } catch (error: any) {
        console.log(error)
        if (error.name === 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid token' })
        }
        return res.status(500).send({ status: 'error', msg: 'Internal server error' })
    }
})


// ======================== VIEW EVENT ATTENDEES ========================
router.post('/attendees', token, async(req: Request, res: Response) => {
    try {
        const { eventId } = req.body

        if (!eventId) {
            return res.status(400).send({ status: 'error', msg: 'Event ID is required' })
        }

        const attendees = await Attendance.find({ event: eventId, status: 'going' })
        .populate('user').sort({ createdAt: -1 })

        return res.status(200).send({ status: 'ok', msg: 'success', attendees })

    } catch (error: any) {
        console.log(error)
        if (error.name === 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid token' })
        }
        return res.status(500).send({ status: 'error', msg: 'Internal server error' })
    }
})


// ======================== MY ATTENDANCE ========================
router.post('/my_attendance', token, async(req: Request, res: Response) => {
    try {
        const attendance = await Attendance.find({ user: (req as any).user._id }).populate({
            path: 'event', populate: [
                { path: 'category' }, { path: 'organizer' }
            ]
        }).sort({ createdAt: -1 })

        return res.status(200).send({ status: 'ok', msg: 'success', attendance })

    } catch (error: any) {
        console.log(error)
        if (error.name === 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid token' })
        }
        return res.status(500).send({ status: 'error', msg: 'Internal server error' })
    }
})


// ======================== CHECK ATTENDANCE STATUS ========================
router.post('/check', token, async(req: Request, res: Response) => {
    try {
        const { eventId } = req.body

        if (!eventId) {
            return res.status(400).send({ status: 'error', msg: 'Event ID is required' })
        }

        const attendance =await Attendance.findOne({ user: (req as any).user._id, event: eventId })

        if (!attendance) {
            return res.status(200).send({ status: 'ok', attending: false })
        }

        return res.status(200).send({ status: 'ok', attending: true, attendanceStatus: attendance.status })
    } catch (error: any) {
        console.log(error)
        if (error.name === 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid token' })
        }
        return res.status(500).send({ status: 'error', msg: 'Internal server error' })
    }
})

export default router