import mongoose, { Schema, Document, Types } from 'mongoose'


// Interface for Comment document
export interface IComment extends Document {
    eventId: Types.ObjectId // Reference to Event
    userId: Types.ObjectId // Reference to User
    text: string
    editedAt?: Date
    createdAt: Date
    updatedAt: Date
}
const commentSchema = new Schema<IComment>({
    eventId: {
        type: Schema.Types.ObjectId,
        ref: 'Event', // Links the comment to an Event
        required: true
    },
    userId: {
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
    editedAt: {
        type: Date
    }
}, { timestamps: true, collection: 'comments' })

// Prevent duplicate attendance
commentSchema.index({ userId: 1 })
commentSchema.index({ eventId: 1 })

const Comment = mongoose.model<IComment>('Comment', commentSchema)
export default Comment