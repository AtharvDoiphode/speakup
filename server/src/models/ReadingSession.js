import mongoose from 'mongoose';

// One read-aloud attempt. The totals and scores are worked out by the server
// (controllers/readingController.js), never taken from the client.
const readingSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    passageId: { type: String, required: true },
    title: { type: String, required: true },
    durationSec: { type: Number, required: true, min: 5, max: 1800 },
    wordsTotal: { type: Number, required: true }, // from the passage
    wordsReached: { type: Number, required: true }, // how far the reader got
    wordsRead: { type: Number, required: true }, // of those, how many were heard correctly
    accuracy: { type: Number, min: 0, max: 100, required: true }, // wordsRead / wordsReached, %
    wpm: { type: Number, min: 0, required: true }, // wordsReached per minute
    missed: { type: [String], default: [] }, // passage words that weren't heard, at most 30
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

// "My sessions, newest first"
readingSessionSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('ReadingSession', readingSessionSchema);
