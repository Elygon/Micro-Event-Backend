import mongoose, { Schema, Document, } from 'mongoose'

// Interface for Category document
export interface ICategory extends Document {
    name: string
    description?: string
    icon?: string
    colorCode?: string
    createdAt: Date
    updatedAt: Date
}

// Category Schema
const categorySchema = new Schema<ICategory>({
    name: { type: String, required: true }, // e.g., 'Tech', 'Social', 'Fitness'
    description: { type: String, default: '' },
    icon: { type: String, default: '' },
    colorCode: { type: String, default: '' }
}, { timestamps: true, collection: 'categories' })

const Category = mongoose.model<ICategory>('Category', categorySchema)
export default Category