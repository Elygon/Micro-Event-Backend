import mongoose, { Schema, Document, Types } from 'mongoose'


// Interface for Attendance document
export interface IAttendance extends Document {
    user_id: Types.ObjectId // Reference to User
    event_id: Types.ObjectId // Reference to Event
    status: 'going' | 'maybe' | 'declined'
    createdAt: Date
    updatedAt: Date
}

const attendSchema = new Schema<IAttendance>({
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    event_id: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    status: { type: String, enum: [ 'going', 'maybe', 'declined'], default: 'going' }
}, { timestamps: true, collection: 'attendance'})

// Prevent duplicate attendance
attendSchema.index({ user_id: 1, event_id: 1 }, { unique: true})

const Attendance = mongoose.model<IAttendance>('Attendance', attendSchema)
export default Attendance