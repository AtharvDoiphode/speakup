import mongoose from 'mongoose';

const mistakeSchema = new mongoose.Schema(
  {
    wrong: String,
    right: String,
    rule: String,
    type: String,
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'ai'], required: true },
    text: { type: String, required: true },
    // Only learner messages have these (filled in during step 6.2)
    corrected: String,
    mistakes: [mistakeSchema],
    natural: String,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    scenarioId: { type: String, required: true },
    title: { type: String, required: true },
    // A copy of the character at the time the conversation started,
    // so later edits to scenarios.js don't change history
    persona: {
      name: String, // "Ms. Rao"
      role: String, // short: "Hiring manager"
      roleLong: String, // "Hiring manager, Finlytics, Pune"
      traits: { type: [String], default: [] }, // the scene's traits plus the learner's extras
      mood: String, // one of MOODS
      brief: String, // the situation, written to the learner
      // Only on conversations created before the Round 1 scenarios.
      // Kept so those still load and can be continued.
      personality: String,
      setting: String,
    },
    difficulty: { type: String, enum: ['friendly', 'neutral', 'tough'], default: 'neutral' },
    level: { type: String, default: 'B1' }, // the learner's level at the time
    status: { type: String, enum: ['active', 'ended'], default: 'active' },
    messages: [messageSchema],
    endedAt: Date,
    durationSec: { type: Number, default: 0 },
    score: { type: Number, default: null }, // 0-100, null if nothing was said
    mistakeCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

export default mongoose.model('Conversation', conversationSchema);