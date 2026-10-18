import mongoose from 'mongoose';
import { MAX_BOX } from '../utils/srs.js';

// One word or phrase in someone's deck, with its spaced-repetition state (utils/srs.js)
const vocabCardSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    word: { type: String, required: true, trim: true, lowercase: true, maxlength: 60 }, // for matching
    display: { type: String, required: true, trim: true, maxlength: 60 }, // as typed or written
    meaning: { type: String, required: true, trim: true, maxlength: 140 },
    example: { type: String, default: '', trim: true, maxlength: 200 },
    pos: { type: String, default: '', trim: true, maxlength: 20 },
    category: { type: String, default: '' }, // a starter category, or '' for your own words
    source: { type: String, enum: ['starter', 'custom', 'mistake'], required: true },
    starterId: { type: String }, // only for starter words

    box: { type: Number, default: 0, min: 0, max: MAX_BOX },
    dueAt: { type: Date, default: Date.now },
    reps: { type: Number, default: 0 },
    lapses: { type: Number, default: 0 },
    lastReviewedAt: { type: Date, default: null },
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

// One card per word per person
vocabCardSchema.index({ user: 1, word: 1 }, { unique: true });
// "What's due for me?"
vocabCardSchema.index({ user: 1, dueAt: 1 });

export default mongoose.model('VocabCard', vocabCardSchema);
