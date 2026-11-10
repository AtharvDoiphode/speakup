import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 50 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // select: false means the password is never returned by queries unless asked for
    password: { type: String, required: true, select: false },
    // 'admin' is only given at registration to the email in ADMIN_EMAIL
    role: { type: String, enum: ['member', 'admin'], default: 'member' },
    // Set when an admin resets the password: the app is blocked until it's changed
    mustChangePassword: { type: Boolean, default: false },
    settings: {
      goalMin: { type: Number, enum: [10, 15, 20, 30], default: 15 },
      voiceName: { type: String, default: '', maxlength: 100 }, // '' = the device's usual choice
      speechRate: { type: Number, min: 0.7, max: 1.3, default: 1 },
      defaultDifficulty: { type: String, enum: ['friendly', 'neutral', 'tough'], default: 'neutral' },
    },
  },
  { timestamps: true }
);

// Hash the password whenever it is set or changed
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Never send the password hash or internal fields to the client
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
