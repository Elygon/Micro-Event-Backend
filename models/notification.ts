import mongoose, { Schema, Document, Types, TypesAreEqual } from 'mongoose'

// Interface for Notifcation Document
export interface INotification extends Document {
    user: Types.ObjectId,
    type: string
    title: string
    msg: string
    event?: Types.ObjectId
    fromUser?: Types.ObjectId
    isRead: boolean
    createdAt: Date
    updatedAt: Date
}

// Schema
const notifySchema = new Schema<INotification>({
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    type: {
        type: String,
        enum: [ 'event_reminder', 'event_update', 'new_attendee', 'comment', 'event_cancelled']
    },
    title: String,
    msg: String,
    event: { type: Schema.Types.ObjectId, ref: 'Event' },
    fromUser: { type: Schema.Types.ObjectId, ref: 'User' },
    isRead: { type: Boolean, default: false },

}, { timestamps: true, collection: 'notifications' })

// Performance Indexes
notifySchema.index({ user: 1, createdAt: -1})
notifySchema.index({ event: 1, isRead: 1})

const Notification = mongoose.model<INotification>('Notification', notifySchema )
export default Notification