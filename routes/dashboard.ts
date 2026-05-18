import express, { Request, Response } from 'express'
const router = express.Router()

import token from '../middleware/userToken'
import AdminOnly from '../middleware/adminOnly'
import User from '../models/user'
import Event from '../models/event'
import Attendance from '../models/attendance'


// ======================== OVERVIEW ========================
// POST /dashboard/overview
// Returns platform-wide stats: users, events by status, attendance breakdown, recent activity
router.post('/overview', token, AdminOnly, async (req: Request, res: Response) => {
    try {
        const now = new Date()

        // ---- USER STATS ----
        const [totalUsers, verifiedUsers, unverifiedUsers, totalAdmins] = await Promise.all([
            User.countDocuments({ role: 'User' }),
            User.countDocuments({ role: 'User', isVerified: true }),
            User.countDocuments({ role: 'User', isVerified: false }),
            User.countDocuments({ role: 'Admin' }),
        ])

        // ---- EVENT STATS ----
        // Upcoming  : not cancelled, hasn't started yet
        // Ongoing   : not cancelled, started but endDate is in the future
        // Completed : not cancelled, endDate has passed (or no endDate but startDate passed)
        // Cancelled : isCancelled === true
        const [
            totalEvents,
            upcomingEvents,
            ongoingEvents,
            completedEvents,
            cancelledEvents,
            publicEvents,
            privateEvents,
        ] = await Promise.all([
            Event.countDocuments(),
            Event.countDocuments({ isCancelled: false, startDate: { $gt: now } }),
            Event.countDocuments({
                isCancelled: false,
                startDate: { $lte: now },
                $or: [
                    { endDate: { $gt: now } },
                    { endDate: { $exists: false } },
                    { endDate: null }           // handle explicitly null-stored endDates
                ]
            }),
            Event.countDocuments({ isCancelled: false, endDate: { $lte: now } }),
            Event.countDocuments({ isCancelled: true }),
            Event.countDocuments({ isCancelled: false, isPublic: true }),
            Event.countDocuments({ isCancelled: false, isPublic: false }),
        ])

        // ---- ATTENDANCE STATS ----
        const [totalAttendance, goingCount, maybeCount, declinedCount] = await Promise.all([
            Attendance.countDocuments(),
            Attendance.countDocuments({ status: 'going' }),
            Attendance.countDocuments({ status: 'maybe' }),
            Attendance.countDocuments({ status: 'declined' }),
        ])

        // ---- EVENTS BY CATEGORY ----
        const eventsByCategory = await Event.aggregate([
            { $match: { isCancelled: false } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            {
                $lookup: {
                    from: 'categories',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'categoryInfo',
                }
            },
            {
                $project: {
                    _id: 0,
                    category: { $arrayElemAt: ['$categoryInfo.name', 0] },
                    count: 1,
                }
            },
            { $sort: { count: -1 } },
        ])

        // ---- RECENT USERS (last 5) ----
        const recentUsers = await User.find({ role: 'User' })
            .select('firstname lastname username email isVerified createdAt')
            .sort({ createdAt: -1 })
            .limit(5)
            .lean()

        // ---- RECENT EVENTS (last 5) ----
        const recentEvents = await Event.find()
            .select('title startDate endDate isCancelled isPublic attendeesCount category organizer')
            .populate('category', 'name colorCode')
            .populate('organizer', 'firstname lastname username')
            .sort({ createdAt: -1 })
            .limit(5)
            .lean()

        return res.status(200).send({
            status: 'ok',
            msg: 'Dashboard overview fetched successfully',
            data: {
                users: {
                    total: totalUsers,
                    verified: verifiedUsers,
                    unverified: unverifiedUsers,
                    admins: totalAdmins,
                },
                events: {
                    total: totalEvents,
                    upcoming: upcomingEvents,
                    ongoing: ongoingEvents,
                    completed: completedEvents,
                    cancelled: cancelledEvents,
                    public: publicEvents,
                    private: privateEvents,
                    byCategory: eventsByCategory,
                },
                attendance: {
                    total: totalAttendance,
                    going: goingCount,
                    maybe: maybeCount,
                    declined: declinedCount,
                },
                recent: {
                    users: recentUsers,
                    events: recentEvents,
                },
            },
        })
    } catch (error: any) {
        console.error('Dashboard Overview Error:', error)
        return res.status(500).send({ status: 'error', msg: 'Internal Server Error' })
    }
})


// ======================== ATTENDEES PER EVENT ========================
// POST /dashboard/event-attendees
// Body: { eventId, page?, limit? }
// Returns paginated list of attendees for a specific event
router.post('/event-attendees', token, AdminOnly, async (req: Request, res: Response) => {
    try {
        const { eventId } = req.body

        // Sanitize and validate pagination inputs
        const page  = Math.max(1, parseInt(req.body.page)  || 1)
        const limit = Math.min(Math.max(1, parseInt(req.body.limit) || 10), 100) // cap at 100

        if (!eventId) {
            return res.status(400).send({ status: 'error', msg: 'eventId is required' })
        }

        const event = await Event.findById(eventId)
            .select('title startDate endDate isCancelled isPublic attendeesCount capacity organizer')
            .populate('organizer', 'firstname lastname username')
            .lean()

        if (!event) {
            return res.status(404).send({ status: 'error', msg: 'Event not found' })
        }

        const skip = (page - 1) * limit

        const [total, attendees, statusBreakdown] = await Promise.all([
            Attendance.countDocuments({ event: eventId }),
            Attendance.find({ event: eventId })
                .populate('user', 'firstname lastname username email profile_img_url')
                .select('user status createdAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            // Breakdown by status for this specific event
            // Uses event._id (already fetched & validated above) — avoids a redundant DB call
            Attendance.aggregate([
                { $match: { event: event._id } },
                { $group: { _id: '$status', count: { $sum: 1 } } },
                { $project: { _id: 0, status: '$_id', count: 1 } },
            ]),
        ])

        return res.status(200).send({
            status: 'ok',
            msg: 'success',
            event,
            statusBreakdown,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            count: attendees.length,
            attendees,
        })
    } catch (error: any) {
        console.error('Event Attendees Error:', error)
        if (error.name === 'CastError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid event ID format' })
        }
        return res.status(500).send({ status: 'error', msg: 'Internal Server Error' })
    }
})


// ======================== TOP EVENTS BY ATTENDANCE ========================
// POST /dashboard/top-events
// Returns top 10 events ranked by attendee count
router.post('/top-events', token, AdminOnly, async (req: Request, res: Response) => {
    try {
        const now = new Date()

        const topEvents = await Event.find({ isCancelled: false })
            .select('title startDate endDate attendeesCount capacity isPublic isCancelled organizer category imgUrl')
            .populate('category', 'name colorCode')
            .populate('organizer', 'firstname lastname username')
            .sort({ attendeesCount: -1 })
            .limit(10)
            .lean()

        // Annotate each event with its derived status
        const annotated = topEvents.map(event => {
            let status: string

            if (event.isCancelled) {
                status = 'cancelled'
            } else if (event.startDate > now) {
                status = 'upcoming'
            } else if (!event.endDate || event.endDate > now) {
                status = 'ongoing'
            } else {
                status = 'completed'
            }

            return { ...event, status }
        })

        return res.status(200).send({
            status: 'ok',
            msg: 'success',
            count: annotated.length,
            topEvents: annotated,
        })
    } catch (error: any) {
        console.error('Top Events Error:', error)
        return res.status(500).send({ status: 'error', msg: 'Internal Server Error' })
    }
})


// ======================== USER GROWTH (last 30 days) ========================
// POST /dashboard/user-growth
// Returns daily user signups for the past 30 days
router.post('/user-growth', token, AdminOnly, async (req: Request, res: Response) => {
    try {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const growth = await User.aggregate([
            {
                $match: {
                    role: 'User',
                    createdAt: { $gte: thirtyDaysAgo },
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' },
                    },
                    count: { $sum: 1 },
                }
            },
            {
                $project: {
                    _id: 0,
                    date: {
                        $dateFromParts: {
                            year: '$_id.year',
                            month: '$_id.month',
                            day: '$_id.day',
                        }
                    },
                    count: 1,
                }
            },
            { $sort: { date: 1 } },
        ])

        return res.status(200).send({
            status: 'ok',
            msg: 'success',
            period: '30 days',
            growth,
        })
    } catch (error: any) {
        console.error('User Growth Error:', error)
        return res.status(500).send({ status: 'error', msg: 'Internal Server Error' })
    }
})


// ======================== EVENT GROWTH (last 30 days) ========================
// POST /dashboard/event-growth
// Returns daily event creations for the past 30 days
router.post('/event-growth', token, AdminOnly, async (req: Request, res: Response) => {
    try {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const growth = await Event.aggregate([
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' },
                    },
                    count: { $sum: 1 },
                }
            },
            {
                $project: {
                    _id: 0,
                    date: {
                        $dateFromParts: {
                            year: '$_id.year',
                            month: '$_id.month',
                            day: '$_id.day',
                        }
                    },
                    count: 1,
                }
            },
            { $sort: { date: 1 } },
        ])

        return res.status(200).send({
            status: 'ok',
            msg: 'success',
            period: '30 days',
            growth,
        })
    } catch (error: any) {
        console.error('Event Growth Error:', error)
        return res.status(500).send({ status: 'error', msg: 'Internal Server Error' })
    }
})


export default router