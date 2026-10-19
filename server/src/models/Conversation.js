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
      custom: { type: Boolean, default: undefined }, // true when the learner wrote this person (prompt treats it as data)
      // Only on conversations created before the Round 1 scenarios.
      // Kept so those still load and can be continued.
      personality: String,
      setting: String,
    },
    difficulty: { type: String, enum: ['friendly', 'neutral', 'tough'], default: 'neutral' },
    // 'scene' is every conversation from before Day 10, so old ones read as scenes
    mode: { type: String, enum: ['scene', 'interview', 'debate'], default: 'scene' },
    // interview: { role, focus, totalTurns: 10 } · debate: { topic, stance, totalTurns: 5 }
    modeConfig: {
      type: new mongoose.Schema(
        { role: String, focus: String, topic: String, stance: String, totalTurns: Number },
        { _id: false }
      ),
      default: undefined,
    },
    personId: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomPerson', default: undefined },
    // Made once at the end of an interview or debate (see utils/scorecard.js)
    scorecard: { type: mongoose.Schema.Types.Mixed, default: null },
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

// The dashboard asks for "my ended sessions, newest first" on every visit
conversationSchema.index({ user: 1, status: 1, endedAt: -1 });
// Mistakes by the day they were made (Dashboard and Progress)
conversationSchema.index({ user: 1, 'messages.createdAt': 1 });

export default mongoose.model('Conversation', conversationSchema);