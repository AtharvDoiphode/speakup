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
    persona: {
      name: String,
      role: String,
      personality: String,
      setting: String,
    },
    difficulty: { type: String, enum: ['friendly', 'neutral', 'tough'], default: 'neutral' },
    level: { type: String, default: 'B1' }, // the learner's level at the time
    status: { type: String, enum: ['active', 'ended'], default: 'active' },
    messages: [messageSchema],
    endedAt: Date,
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