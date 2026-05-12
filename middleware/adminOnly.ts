import { Request, Response, NextFunction } from 'express'

// Extend the Request interface to include your User type
interface AuthRequest extends Request {
    user?: {
        role: string
    }
}
const adminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {

    // check if the user exists at all before checking the role
    if(!req.user || req.user.role !== 'Admin') {
        return res.status(403).send({ status: 'error', msg: 'Access denied: Admins only' })
    }

    next()
}

export default adminOnly