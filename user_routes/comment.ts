import express, { Request, Response } from 'express'
const Router = express.Router()

import Comment from '../models/comment'
import token from '../middleware/userToken'
import Event from '../models/event'


// ======================== COMMENT ON AN EVENT ========================
Router.post('/comment', token, async(req: Request, res: Response) => {
    try {
        const { eventId, content } = req.body

    } catch (error: any) {
        console.log(error)
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).send({ status: 'error', msg: 'Invalid token' })
        }
        return res.status(500).send({ status: 'error', msg: 'Server error' })
    }
})

// ======================== DELETE COMMENT ========================
Router.delete('/comment', token, async(req: Request, res: Response) => {
    try {
        const { commentId } = req.body

    } catch (error: any) {
        console.log(error)
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).send({ status: 'error', msg: 'Invalid token' })
        }
        return res.status(500).send({ status: 'error', msg: 'Server error' })
    }
})

export default Router