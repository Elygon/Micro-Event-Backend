import express, { Request, Response } from 'express'
const router = express.Router()

import Comment from '../models/comment'
import token from '../middleware/userToken'
import Event from '../models/event'


// ======================== COMMENT ON AN EVENT ========================
router.post('/comment', token, async(req: Request, res: Response) => {
    try {
        const { eventId, text } = req.body

        if ( !eventId || !text?.trim() ) {
            return res.status(400).send({ status: 'error', msg: 'All fields are required'})
        }

        // Check if event exists
        const event: any = await Event.findById(eventId)

        if ( !event ) {
            return res.status(404).send({ status: 'error', msg: 'Event not found'})
        }

        // Prevent comments on cancelled events
        if ( event.isCancelled ) {
            return res.status(400).send({ status: 'error', msg: 'Cannot comment on cancelled event'})
        }

        const comment = await Comment.create({ event: eventId, user: (req as any).user._id, text})

        return res.status(201).send({ status: 'ok', msg: 'success', comment })

    } catch (error: any) {
        console.log(error)
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).send({ status: 'error', msg: 'Invalid token' })
        }
        return res.status(500).send({ status: 'error', msg: 'Server error' })
    }
})


// ======================== REPLY TO COMMENT ========================
router.post('/reply', token, async(req: Request, res: Response) => {
    try {
        const { eventId, parentCommentId, text } = req.body

        if ( !eventId || !parentCommentId || !text?.trim() ) {
            return res.status(400).send({ status: 'error', msg: 'All fields are required'})
        }

        // Check if event exists
        const event: any = await Event.findById(eventId)

        if ( !event ) {
            return res.status(404).send({ status: 'error', msg: 'Event not found'})
        }

        // Check if parent comment exists
        const parentComment = await Comment.findById(parentCommentId)

        if ( !parentComment ) {
            return res.status(404).send({ status: 'error', msg: 'Parent comment not found'})
        }

        // Prevent replies on cancelled events
        if ( event.isCancelled ) {
            return res.status(400).send({ status: 'error', msg: 'Cannot reply to comments on cancelled event'})
        }

        const reply = await Comment.create({ 
            event: eventId, user: (req as any).user._id, text, parentComment: parentCommentId 
        })

        return res.status(201).send({ status: 'ok', msg: 'success', reply })

    } catch (error: any) {
        console.log(error)
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).send({ status: 'error', msg: 'Invalid token' })
        }
        return res.status(500).send({ status: 'error', msg: 'Server error' })
    }
})


// ======================== VIEW EVENT COMMENTS ========================
router.post('/comments', token, async(req: Request, res: Response) => {
    try {
        const { eventId } = req.body

        if ( !eventId ) {
            return res.status(400).send({ status: 'error', msg: 'Event ID is required'})
        }

        const comments = await Comment.find({ event: eventId, parentComment: null })
        .populate('user').sort({ createdAt: -1 })

        return res.status(200).send({ status: 'ok', msg: 'success', comments })

    } catch (error: any) {
        console.log(error)
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).send({ status: 'error', msg: 'Invalid token' })
        }
        return res.status(500).send({ status: 'error', msg: 'Server error' })
    }
})


// ======================== VIEW COMMENT REPLIES ========================
router.post('/replies', token, async(req: Request, res: Response) => {
    try {
        const { commentId } = req.body

        if ( !commentId ) {
            return res.status(400).send({ status: 'error', msg: 'Comment ID is required'})
        }

        const replies = await Comment.find({ parentComment: commentId }).populate('user').sort({ createdAt: -1 })

        return res.status(200).send({ status: 'ok', msg: 'success', replies })

    } catch (error: any) {
        console.log(error)
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).send({ status: 'error', msg: 'Invalid token' })
        }
        return res.status(500).send({ status: 'error', msg: 'Server error' })
    }
})


// ======================== UPDATE COMMENT ========================
router.post('/update', token, async(req: Request, res: Response) => {
    try {
        const { commentId, text } = req.body

        if ( !commentId || !text?.trim() ) {
            return res.status(400).send({ status: 'error', msg: 'All fields are required' })
        }

        const comment: any = await Comment.findById(commentId)

        if (!comment) {
            return res.status(404).send({ status: 'error', msg: 'Comment not found' })
        }

        // Ensure the user owns the comment
        if (comment.user.toString() !== (req as any).user._id) {
            return res.status(403).send({ status: 'error', msg: 'Unauthorized' })
        }

        comment.text = text
        comment.editedAt = new Date()

        await comment.save()

        return res.status(200).send({ status: 'ok', msg: 'success', comment })
    } catch (error: any) {
        console.log(error)
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).send({ status: 'error', msg: 'Invalid token' })
        }
        return res.status(500).send({ status: 'error', msg: 'Server error' })
    }
})


// ======================== DELETE COMMENT ========================
router.post('/delete', token, async(req: Request, res: Response) => {
    try {
        const { commentId } = req.body

        if (!commentId) {
            return res.status(400).send({ status: 'error', msg: 'Comment ID is required' })
        }

        const comment: any = await Comment.findById(commentId)

        if (!comment) {
            return res.status(404).send({ status: 'error', msg: 'Comment not found' })
        }

        // Ensure user owns the comment
        if (comment.user.toString() !== (req as any).user._id) {
            return res.status(403).send({ status: 'error', msg: 'Unauthorized' })
        }

        // Delete replies too
        await Comment.deleteMany({ parentComment: commentId })

        await comment.deleteOne()

        return res.status(200).send({ status: 'ok', msg: 'Comment deleted successfully' })
    } catch (error: any) {
        console.log(error)
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).send({ status: 'error', msg: 'Invalid token' })
        }
        return res.status(500).send({ status: 'error', msg: 'Server error' })
    }
})

export default router