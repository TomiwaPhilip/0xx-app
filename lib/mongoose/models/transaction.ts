import mongoose, { Schema, type Document } from "mongoose"

export interface ITransaction extends Document {
  projectId: Schema.Types.ObjectId
  userId: Schema.Types.ObjectId
  userName: string
  action: "bought" | "sold"
  price: number
  createdAt: Date
}

const TransactionSchema: Schema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    action: { type: String, enum: ["bought", "sold"], required: true },
    price: { type: Number, required: true },
  },
  { timestamps: true },
)

// Check if the model already exists to prevent overwriting during hot reloads
const Transaction = mongoose.models.Transaction || mongoose.model<ITransaction>("Transaction", TransactionSchema)

export default Transaction
