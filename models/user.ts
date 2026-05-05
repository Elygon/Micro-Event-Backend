import mongoose, { Schema, Document, Model } from 'mongoose'

// Define a TypeScript interface
export interface IUser extends Document {
    firstname?: string
    middlename?: string
    lastname?: string
    username?: string
    email?: string,
    password?: string
    profile_img_id?: string
    profile_img_url?: string
    bio?: String //Short description
    interests?: string[]
    location?: {
        type: 'Point',
        coordinates: [number, number] // [longitude, latitude]
    }
    createdAt: Date
    updatedAt: Date
}

// Create schema
const userSchema: Schema<IUser> = new Schema({
    firstname: String,
    middlename: String,
    lastname: String,
    username: String,
    email: String,
    password: String,
    profile_img_id: { type: String, default: '' },
    profile_img_url: { type: String, default: '' },
    bio: String, //Short description
    location: {
        type: {
            type: String, // Embedded GeoJSON Point
            enum: ['Point'],
            default: 'Point'
        }, 
        coordinates: {
            type: [Number], // [longitude, latitude]
            default: [0, 0] // Default coordinates
        }
    },
    interests: [{
        type: String,
        enum: [ 'Tech', 'Music', 'Sports', 'Hanging', 'Fitness', 'Gaming']
    }]
}, { timestamps: true, collection: 'users' })

// Query nearby locations
userSchema.index({ location: '2dsphere' });

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema)
export default User