import mongoose, { Schema, Document, Types } from 'mongoose'

// Interface for GeoJSON Point
interface IPoint {
    type: 'Point'
    coordinates: [number, number] // [longitude, latitude]
}

// Interface for Event document
export interface IEvent extends Document {
    title?: string
    description?: string
    organizer: Types.ObjectId // Reference to User
    location: IPoint
    address?: string
    date?: Date
    duration?: number
    capacity?: number
    category?: 'Social' | 'Tech' | 'Fitness'
    status?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
    attendeesCount?: number
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
    address: String,  // 09057675129
    date: Date, // Date of the event
    duration: Number, // e.g minutes
    capacity: Number, // max no. of attendees allowed
    category: { type: String, enum: ['Social', 'Tech', 'Fitness'] },
    status: { type: String, enum: ['upcoming', 'ongoing', 'completed', 'cancelled'] },
    attendeesCount: { type: Number, default: 0 }
}, { timestamps: true, collection: 'events' })

// Important for $near queries
eventSchema.index({ location: '2dsphere' })

const Event = mongoose.model<IEvent>('Event', eventSchema)
export default Event