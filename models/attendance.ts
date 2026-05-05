import mongoose, { Schema, Document, Types } from 'mongoose'


// Interface for Attendance document
export interface IAttendance extends Document {
    user: Types.ObjectId // Reference to User
    event: Types.ObjectId // Reference to Event
    status: string // e.g going, maybe, declined
    createdAt: Date
    updatedAt: Date
}

const attendSchema = new Schema<IAttendance>({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    event: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    status: { type: String, enum: [ 'going', 'maybe', 'declined'], default: 'going' }
}, { timestamps: true, collection: 'attendance'})

// Prevent duplicate attendance
attendSchema.index({ user: 1, event: 1 }, { unique: true})

// Performance indexes
attendSchema.index({ user: 1 })
attendSchema.index({ event: 1 })

const Attendance = mongoose.model<IAttendance>('Attendance', attendSchema)
export default Attendance