import mongoose from 'mongoose';

// The same mistake shape as conversations, so the client can show both the same way
const mistakeSchema = new mongoose.Schema(
  {
    wrong: String,
    right: String,
    rule: String,
    type: String,
  },
  { _id: false }
);

const writingCheckSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: '', maxlength: 100 },
    kind: { type: String, enum: ['essay', 'email', 'message', 'other'], default: 'essay' },
    text: { type: String, required: true },

    // From the AI, after the server-side checks in utils/writingCheck.js
    mistakes: [mistakeSchema], // sorted by where they appear in the text
    score: { type: Number, min: 0, max: 100, required: true },
    summary: { type: String, default: '' },
    feedback: {
      structure: { type: String, default: '' },
      tone: { type: String, default: '' },
      vocabulary: { type: String, default: '' },
    },
    strengths: { type: [String], default: [] }, // at most 3
    improvements: { type: [String], default: [] }, // at most 3
    rewritten: { type: String, default: '' },

    // Counted by the server, not the AI
    wordCount: { type: Number, default: 0 },
    mistakeCount: { type: Number, default: 0 },
    errorsPer100: { type: Number, default: 0 }, // mistakes per 100 words, 1 decimal
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

// "My checks, newest first"
writingCheckSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('WritingCheck', writingCheckSchema);
