import mongoose from 'mongoose';
import { MISTAKE_TYPES } from '../prompts/correctionPrompt.js';

// One finished grammar quiz: a lesson's practice questions, or "Practise your mistakes"
const grammarAttemptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    kind: { type: String, enum: ['lesson', 'mine'], required: true },
    // Which lesson. Optional for "mine" (set only when the quiz was filtered to one type)
    type: {
      type: String,
      enum: MISTAKE_TYPES,
      required() {
        return this.kind === 'lesson';
      },
    },
    correct: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 1, max: 20 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// "My attempts, newest first"
grammarAttemptSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('GrammarAttempt', grammarAttemptSchema);
