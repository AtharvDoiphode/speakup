import mongoose from 'mongoose';

// How many AI requests each person made on each India-time day, for the daily cap.
// One small document per person per day; MongoDB deletes it a few days later by itself.
const aiUsageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    day: { type: String, required: true }, // 'YYYY-MM-DD'
    count: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false }
);

aiUsageSchema.index({ user: 1, day: 1 }, { unique: true });
aiUsageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('AiUsage', aiUsageSchema);
