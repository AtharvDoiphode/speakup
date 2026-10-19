import mongoose from 'mongoose';
import { EXTRA_TRAITS, MOODS } from '../data/scenarios.js';

// "Create your own person": someone the learner wrote, private to them.
// The prompt treats every field as data (see describeCustom in prompts/roleplayPrompt.js).
const customPersonSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 30 },
    role: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    brief: { type: String, required: true, trim: true, minlength: 10, maxlength: 400 },
    traits: { type: [{ type: String, enum: EXTRA_TRAITS }], default: [] }, // at most 3
    mood: { type: String, enum: MOODS, default: 'Neutral' },
  },
  {
    timestamps: true,
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

customPersonSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('CustomPerson', customPersonSchema);
