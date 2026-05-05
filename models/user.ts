import mongoose, { Schema, Document, Model } from 'mongoose'

// // Define a GeoJSON Point schema
// const pointSchema = new Schema({
//     type: {
//         type: String, enum: ['Point'], // Must be 'Point'
//         required: true, default: 'Point'
//     },
//     coordinates: {
//         type: [Number], // [longitude, latitude]
//         required: true
//     }
// })


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
    interests?: 'Tech' | 'Music' | 'Sports'
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
    // location: {
    //     type: pointSchema, // Embedded GeoJSON Point
    //     default: { type: 'Point', coordinates: [0, 0] } // Default coordinates
    // },
    interests: {
        type: String,
        enum: [ 'Tech', 'Music', 'Sports']
    }
}, { timestamps: true, collection: 'users' })

// Query nearby locations
//userSchema.index({ location: '2dsphere' });

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema)
export default User