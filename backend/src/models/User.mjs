import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  bio: {
    type: String,
    maxlength: 500
  },
  location: {
    type: String,
    maxlength: 100
  },
  avatarUrl: {
    type: String,
    trim: true,
    maxlength: 500
  },
  links: [{
    title: {
      type: String,
      trim: true,
      maxlength: 50
    },
    url: {
      type: String,
      trim: true,
      maxlength: 500
    }
  }],
  preferences: {
    languages: [{
      type: String,
      trim: true,
      lowercase: true
    }],
    regions: [{
      type: String,
      trim: true
    }],
    availabilityWindows: [{
      day: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      },
      startTime: String,
      endTime: String
    }],
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      digest: {
        type: String,
        enum: ['none', 'daily', 'weekly'],
        default: 'none'
      }
    }
  },
  privacy: {
    profilePublic: {
      type: Boolean,
      default: true
    },
    publicFields: {
      type: [String],
      enum: ['displayName', 'bio', 'location', 'avatarUrl', 'links', 'stats'],
      default: ['displayName', 'bio', 'location', 'avatarUrl', 'links']
    },
    accountVisible: {
      type: Boolean,
      default: true
    }
  },
  stats: {
    roundsPlayed: {
      type: Number,
      default: 0
    },
    wins: {
      type: Number,
      default: 0
    },
    currentStreak: {
      type: Number,
      default: 0
    },
    longestStreak: {
      type: Number,
      default: 0
    }
  },
  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  mutedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ createdAt: -1 });

userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const User = mongoose.model('User', userSchema);

export default User;
