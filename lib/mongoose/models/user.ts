import mongoose, { Schema, type Document } from "mongoose"

export interface IUser extends Document {
  privyId: string
  email?: string
  walletAddress?: string
  name?: string
  userType: "normal" | "business"
  twitterHandle?: string
  twitterFollowers?: number
  profileImage?: string
  coverImage?: string
  bio?: string
  supportedProjects: string[]
  createdProjects: string[]
  following: string[]
  followers: string[]
  supportsReceived: number
  notificationSettings?: {
    emailNotifications?: boolean
    supportNotifications?: boolean
    commentNotifications?: boolean
  }
  privacySettings?: {
    publicProfile?: boolean
    showSupporters?: boolean
  }
  createdAt: Date
  updatedAt: Date
}

const UserSchema: Schema = new Schema(
  {
    privyId: { type: String, required: true, unique: true },
    email: { type: String },
    walletAddress: { type: String },
    name: { type: String },
    userType: { type: String, enum: ["normal", "business"], default: "normal" },
    twitterHandle: { type: String },
    twitterFollowers: { type: Number },
    profileImage: { type: String },
    coverImage: { type: String },
    bio: { type: String },
    supportedProjects: [{ type: Schema.Types.ObjectId, ref: "Project" }],
    createdProjects: [{ type: Schema.Types.ObjectId, ref: "Project" }],
    following: [{ type: Schema.Types.ObjectId, ref: "User" }],
    followers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    supportsReceived: { type: Number, default: 0 },
    notificationSettings: {
      emailNotifications: { type: Boolean, default: true },
      supportNotifications: { type: Boolean, default: true },
      commentNotifications: { type: Boolean, default: true },
    },
    privacySettings: {
      publicProfile: { type: Boolean, default: true },
      showSupporters: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
)

// Check if the model already exists to prevent overwriting during hot reloads
const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema)

export default User
