import mongoose, { Schema, Document, Types } from 'mongoose'

// Interface for GeoJSON Point
interface IPoint {
    type: 'Point'
    coordinates: [number, number] // [longitude, latitude]
}

// Interface for Event document
export interface IEvent extends Document {
    title: string
    description: string
    organizer: Types.ObjectId // Reference to User
    location: IPoint
    address: string
    startDate: Date
    endDate?: Date
    capacity?: number
    category?: string
    attendeesCount: number
    imgId?:  string
    imgUrl?: string
    isPublic: boolean
    isCancelled: boolean
    createdAt: Date
    updatedAt: Date
}

// GeoJSON Point schema
const pointSchema = new Schema<IPoint>({
    type: { type: String, enum: ['Point'], required: true, default: 'Point'},
    coordinates: { type: [Number], required: true }
})

// Event Schema
const eventSchema = new Schema<IEvent>({
    title: String, //e.g Saturday Morning Coffe & Code
    description: String,
    organizer: {
        type: Schema.Types.ObjectId, ref: 'User', // must match your user model name
        required: true
    }, // user that created the event
    location: { type: pointSchema, required: true },
    address: String,
    startDate: Date, // Date of the event
    endDate: Date,
    capacity: { type: Number, min: 1 }, // max no. of attendees allowed
    category: { type: String, enum: ['Social', 'Tech', 'Fitness', 'Music', 'Sports', 'Business', 'Education'] },
    isCancelled: { type: Boolean, default: false },
    imgId: String,
    imgUrl: String,
    isPublic: { type: Boolean, default: true },
    attendeesCount: { type: Number, default: 0 }
}, { timestamps: true, collection: 'events' })

// Important for $near queries
eventSchema.index({ location: '2dsphere' })

const Event = mongoose.model<IEvent>('Event', eventSchema)
export default Event