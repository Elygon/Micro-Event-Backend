import mongoose, { Schema, Document, Types } from 'mongoose'

// Interface for Saved Event document
export interface ISavedEvent extends Document {
    user: Types.ObjectId // Reference to User
    event: Types.ObjectId // Reference to Event
    createdAt: Date
    updatedAt: Date
}

// Saved Event Schema
const savedEventSchema = new Schema<ISavedEvent>({
    user: {
        type: Schema.Types.ObjectId, ref: 'User', // must match your user model name
        required: true
    },
    event: {
        type: Schema.Types.ObjectId, ref: 'Event', // must match your event model name
        required: true
    }
}, { timestamps: true, collection: 'saved_events' })

// Prevent duplicate saves (same user saving same event twice)
savedEventSchema.index({ user: 1, event: 1 }, { unique: true })

// Performance indexes
savedEventSchema.index({ user: 1 })
savedEventSchema.index({ event: 1 })

const SavedEvent = mongoose.model<ISavedEvent>('SavedEvent', savedEventSchema)
export default SavedEvent