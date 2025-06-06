import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';

export interface IMusicTrack extends Document {
  title: string;
  artist: string;
  duration: number;
  fileUrl: string;
  coverArt?: string;
  genre?: string;
  tags: string[];
  playCount: number;
  isPublic: boolean;
  owner: IUser['_id'];
  createdAt: Date;
  updatedAt: Date;
  incrementPlayCount(): Promise<void>;
  getDurationFormatted(): string;
}

const musicTrackSchema = new Schema<IMusicTrack>({
  title: {
    type: String,
    required: [true, 'Track title is required'],
    trim: true,
    maxlength: [100, 'Track title cannot exceed 100 characters'],
    index: true
  },
  artist: {
    type: String,
    required: [true, 'Artist name is required'],
    trim: true,
    maxlength: [100, 'Artist name cannot exceed 100 characters'],
    index: true
  },
  duration: {
    type: Number,
    required: [true, 'Track duration is required'],
    min: [0, 'Duration cannot be negative'],
    validate: {
      validator: Number.isInteger,
      message: 'Duration must be an integer'
    }
  },
  fileUrl: {
    type: String,
    required: [true, 'Audio file URL is required'],
    validate: {
      validator: function(v: string) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Invalid file URL format'
    }
  },
  coverArt: {
    type: String,
    default: null,
    validate: {
      validator: function(v: string | null) {
        return v === null || /^https?:\/\/.+/.test(v);
      },
      message: 'Invalid cover art URL format'
    }
  },
  genre: {
    type: String,
    trim: true,
    index: true,
    maxlength: [50, 'Genre cannot exceed 50 characters']
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [20, 'Tag cannot exceed 20 characters']
  }],
  playCount: {
    type: Number,
    default: 0,
    min: 0,
    index: true
  },
  isPublic: {
    type: Boolean,
    default: false,
    index: true
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Track must belong to a user'],
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create indexes for common queries
musicTrackSchema.index({ title: 'text', artist: 'text', tags: 'text' });
musicTrackSchema.index({ owner: 1, createdAt: -1 });
musicTrackSchema.index({ isPublic: 1, createdAt: -1 });
musicTrackSchema.index({ playCount: -1 });

// Instance methods
musicTrackSchema.methods.incrementPlayCount = async function(): Promise<void> {
  this.playCount += 1;
  await this.save();
};

musicTrackSchema.methods.getDurationFormatted = function(): string {
  const minutes = Math.floor(this.duration / 60);
  const seconds = this.duration % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Pre-save middleware to handle tags
musicTrackSchema.pre('save', function(next) {
  if (this.isModified('tags')) {
    // Remove duplicates and empty tags
    this.tags = [...new Set(this.tags)].filter(tag => tag.trim().length > 0);
  }
  next();
});

export const MusicTrack = mongoose.model<IMusicTrack>('MusicTrack', musicTrackSchema);

