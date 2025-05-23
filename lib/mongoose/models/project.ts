import mongoose, { Schema, type Document } from "mongoose"
import type { Project as ProjectType } from "@/lib/types"

export interface IComment {
  _id: string
  userId: string
  userName: string
  userImage?: string
  text: string
  createdAt: Date
}

const CommentSchema: Schema = new Schema(
  {
    _id: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    userImage: { type: String },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

export interface IProject extends Document {
  name: string
  description?: string
  imageUrl: string
  price: number
  percentChange: number
  category: string
  supportable: boolean
  location?: string
  organization?: string
  marketCap?: number
  creatorId: Schema.Types.ObjectId
  comments: IComment[]
  createdAt: Date
  updatedAt: Date
}

const ProjectSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    imageUrl: { type: String, required: true },
    price: { type: Number, required: true, default: 0.01 },
    percentChange: { type: Number, default: 0 },
    category: { type: String, required: true },
    supportable: { type: Boolean, default: true },
    location: { type: String },
    organization: { type: String },
    marketCap: { type: Number },
    creatorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    comments: [CommentSchema],
    // Token-related fields
    tokenAddress: { type: String },
    tokenSymbol: { type: String },
    initialSupply: { type: String },
    currentSupply: { type: String },
    tokenPrice: { type: String },
    contentURI: { type: String },
    poolAddress: { type: String },
  },
  { timestamps: true },
)

// Check if the model already exists to prevent overwriting during hot reloads
const Project = mongoose.models.Project || mongoose.model<ProjectType>("Project", ProjectSchema)

export default Project
