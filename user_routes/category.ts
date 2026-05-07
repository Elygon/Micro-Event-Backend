import express, { Request, Response } from 'express'
const router = express.Router()

import token from '../middleware/userToken'
import Event from '../models/event'
import Category from '../models/category'

// ======================== GET ALL CATEGORIES ========================
router.post('/all', token, async (req: Request, res: Response) => {
    try {
        const categories = await Category.find().sort({ name: 1 })

        return res.status(200).send({ status: 'ok', msg: 'success', categories })
    } catch (error: any) {
        console.log(error)

        if (error.name === 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid token' })
        }
        
        return res.status(500).send({ status: 'error', msg: 'Internal server error' })
    }
})


// ======================== GET SINGLE CATEGORY ========================
router.post('/single', token, async (req: Request, res: Response) => {
    try {
        const { categoryId } = req.body

        if (!categoryId) {
            return res.status(400).send({ status: 'error', msg: 'Category ID is required' })
        }

        const category = await Category.findById(categoryId)

        if (!category) {
            return res.status(404).send({ status: 'error', msg: 'Category not found' })
        }

        return res.status(200).send({ status: 'ok', msg: 'success', category })

    } catch (error: any) {
        console.log(error)

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).send({ status: 'error', msg: 'Invalid token' })
        }

        return res.status(500).send({ status: 'error', msg: 'Internal server error' })
    }
})

// ======================== GET EVENTS BY CATEGORY ========================
router.post('/events', token, async (req: Request, res: Response) => {
    try {
        const { categoryId } = req.body

        if (!categoryId) {
            return res.status(400).send({ status: 'error', msg: 'Category ID is required' })
        }

        // Check if category exists
        const category = await Category.findById(categoryId)

        if (!category) {
            return res.status(404).send({ status: 'error', msg: 'Category not found' })
        }

        const events = await Event.find({ category: categoryId, isCancelled: false })
        .populate('category').populate('organizer').sort({ date: 1 })

        return res.status(200).send({ status: 'ok', msg: 'success', events })

    } catch (error: any) {
        console.log(error)

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).send({ status: 'error', msg: 'Invalid token' })
        }

        return res.status(500).send({ status: 'error', msg: 'Internal server error' })
    }
})

// ======================== SEARCH CATEGORIES ========================
router.post('/search', token, async (req: Request, res: Response) => {
    try {
        const { query } = req.body

        if (!query?.trim()) {
            return res.status(400).send({ status: 'error', msg: 'Search query is required' })
        }

        const categories = await Category.find({ name: { $regex: query.trim(), $options: 'i' } }).sort({ name: 1 })

        return res.status(200).send({ status: 'ok', msg: 'success', categories })
    } catch (error: any) {
        console.log(error)

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).send({ status: 'error', msg: 'Invalid token' })
        }

        return res.status(500).send({ status: 'error', msg: 'Internal server error' })
    }
})

export default router