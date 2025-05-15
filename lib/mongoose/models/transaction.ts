import mongoose, { Schema } from "mongoose"

const TransactionSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    action: { type: String, enum: ["bought", "sold"], required: true },
    price: { type: Number, required: true },
    tokenAmount: { type: String, required: true }, // Amount of tokens bought/sold
    transactionHash: { type: String, required: true }, // Blockchain transaction hash
    status: { type: String, enum: ["pending", "completed", "failed"], default: "completed" },
  },
  { timestamps: true }
)

// Check if model exists to prevent overwriting during hot reloads
const Transaction = mongoose.models.Transaction || mongoose.model("Transaction", TransactionSchema)

export default Transaction
