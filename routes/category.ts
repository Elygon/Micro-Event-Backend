import express, { Request, Response } from 'express'
const router = express.Router()

import token from '../middleware/userToken'
import Event from '../models/event'
import Category from '../models/category'
import adminOnly from '../middleware/adminOnly'

// ======================== GET ALL CATEGORIES ========================
router.post('/all', token, async (req: Request, res: Response) => {
    try {
        const categories = await Category.find({ isActive: true }).sort({ name: 1 })

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
        .populate('category')
        .populate({
            path: 'organizer', 
            select: 
            '-bio -interests -email -location -password -isVerified -profile_img_id -isOnline -createdAt -updatedAt -__v -deletionRequested -deletionRequestedAt -scheduledDeletionAt -verificationOTP -otpExpiresAt' 
        })
        .sort({ date: 1 })

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

        const categories = await Category.find({ 
            isActive: true, name: { $regex: query.trim(), $options: 'i' }
        }).sort({ name: 1 })

        return res.status(200).send({ status: 'ok', msg: 'success', categories })
    } catch (error: any) {
        console.log(error)

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).send({ status: 'error', msg: 'Invalid token' })
        }

        return res.status(500).send({ status: 'error', msg: 'Internal server error' })
    }
})


// ======================== CREATE CATEGORY ========================
router.post('/create', token, adminOnly, async(req: Request, res: Response) => {
    try {
        const { name, description, icon, colorCode } = req.body

        if (!name?.trim()) {
            return res.status(400).send({ status: 'error', msg: 'Category name is required' })
        }

        const existingCategory = await Category.findOne({
            name: { $regex: `^${name.trim()}$`, $options: 'i'}
        })

        if (existingCategory) {
            return res.status(400).send({ status: 'error', msg: 'Category already exists'})
        }

        const category = await Category.create({
            name: name.trim(),
            description,
            icon,
            colorCode
        })

        return res.status(201).send({ status: 'ok', msg: 'success', category })
    } catch (error: any) {
        console.error('Categories Error:', error)
        if (error.name === 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid token'})
        }
        return res.status(500).send({ status: 'error', msg: 'Internal Server Error'})
    }
})


// ======================== UPDATE CATEGORY ========================
router.post('/update', token, adminOnly, async(req: Request, res: Response) => {
    try {
        const { categoryId, name, description, icon, colorCode } = req.body
        if(!categoryId) {
            return res.status(400).send({ status: 'error', msg: 'Category ID is required' })
        }

        const category = await Category.findById(categoryId)
        if (!category) {
            return res.status(404).send({ status: 'error', msg: 'Category not found' })
        }

        category.name = name || category.name
        category.description = description ?? category.description
        category.icon = icon ?? category.icon
        category.colorCode = colorCode ?? category.colorCode

        await category.save()

        return res.status(200).send({ status: 'ok', msg: 'success', category })
    } catch (error: any) {
        console.error('Category Error:', error)
        if (error.name === 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid token'})
        }
        return res.status(500).send({ status: 'error', msg: 'Internal Server Error' })
    }
})


// ======================== DELETE CATEGORY ========================
router.post('/delete', token, adminOnly, async(req: Request, res: Response) => {
    try {
        const { categoryId } = req.body
        if (!categoryId) {
            return res.status(400).send({ status: 'error', msg: 'Category ID is required'})
        }

        const category = await Category.findById(categoryId)
        if (!category) {
            return res.status(404).send({ status: 'error', msg: 'Category not found' })
        }

        const eventExists = await Event.exists({ category: categoryId })
        if (eventExists) {
            return res.status(409).send({ status: 'error', msg: 'Cannot delete category with existing events' })
        }

        await category.deleteOne()

        return res.status(200).send({ status: 'ok', msg: 'success' })
    } catch (error: any) {
        console.error('Category Error:', error)
        if (error.name === 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid token' })
        }
        return res.status(500).send({ status: 'error', msg: 'I' })
    }
})


// ======================== TOGGLE STATUS ========================
router.post('/toggle_status', token, adminOnly, async(req: Request, res: Response) => {
    try {
        const { categoryId } = req.body
        if (!categoryId) {
            return res.status(400).send({ status: 'error', msg: 'Category ID is required' })
        }

        const category = await Category.findById(categoryId)

        if(!category){
            return res.status(404).send({ status: 'error', msg: 'Category not found'})
        }

        category.isActive = !category.isActive
        await category.save()

        return res.status(200).send({
            status: 'ok', msg: category.isActive ? 'Category deactivated' : 'Category activated', category
        })
    } catch (error: any) {
        console.log('Toggle Category Status Error:', error)
        if (error.name == 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid token' })
        }
        return res.status(500).send({ status: 'error', msg: 'Internal server error' })
    }
})


// ======================== GET INACTIVE CATEGORIES ========================
router.post('/inactive', token, adminOnly, async (req: Request, res: Response) => {
    try {
        const categories = await Category.find({ isActive: false }).sort({ name: 1 })

        return res.status(200).send({ status: 'ok', msg: 'success', categories })
    } catch (error: any) {
        console.log(error)
        if (error.name === 'JsonWebTokenError') {
            return res.status(400).send({ status: 'error', msg: 'Invalid token' })
        }
        
        return res.status(500).send({ status: 'error', msg: 'Internal server error' })
    }
})


export default router