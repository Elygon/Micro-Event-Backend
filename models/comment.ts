import mongoose, { Schema, Document, Types } from 'mongoose'


// Interface for Comment document
export interface IComment extends Document {
    event: Types.ObjectId // Reference to Event
    user: Types.ObjectId // Reference to User
    text: string
    parentComment?: Types.ObjectId // Reference to Comment
    editedAt?: Date
    createdAt: Date
    updatedAt: Date
}
const commentSchema = new Schema<IComment>({
    event: {
        type: Schema.Types.ObjectId,
        ref: 'Event', // Links the comment to an Event
        required: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User', // Links the comment to the User who posted it
        required: true
    },
    text: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500 // Limit the comment size
    },
    parentComment: {
        type: Schema.Types.ObjectId,
        ref: 'Comment', // For nested comments (replies)
        default: null
    },
    editedAt: {
        type: Date
    }
}, { timestamps: true, collection: 'comments' })

// Performance indexes
commentSchema.index({ user: 1 })
commentSchema.index({ event: 1, createdAt: -1})
commentSchema.index({ parentComment: 1 })

const Comment = mongoose.model<IComment>('Comment', commentSchema)
export default Comment