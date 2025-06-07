import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';
import { IMusicTrack } from './MusicTrack';

export interface IPlaylist extends Document {
  name: string;
  description?: string;
  coverImage?: string;
  tracks: IMusicTrack['_id'][];
  owner: IUser['_id'];
  isPublic: boolean;
  followers: IUser['_id'][];
  createdAt: Date;
  updatedAt: Date;
  trackCount: number;
  addTrack(trackId: IMusicTrack['_id']): Promise<void>;
  removeTrack(trackId: IMusicTrack['_id']): Promise<void>;
  togglePublic(): Promise<void>;
  addFollower(userId: IUser['_id']): Promise<void>;
  removeFollower(userId: IUser['_id']): Promise<void>;
}

const playlistSchema = new Schema<IPlaylist>({
  name: {
    type: String,
    required: [true, 'Playlist name is required'],
    trim: true,
    maxlength: [100, 'Playlist name cannot exceed 100 characters'],
    index: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  coverImage: {
    type: String,
    validate: {
      validator: function(v: string | undefined) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Invalid cover image URL format'
    }
  },
  tracks: [{
    type: Schema.Types.ObjectId,
    ref: 'MusicTrack',
    validate: {
      validator: async function(trackId: mongoose.Types.ObjectId) {
        const track = await mongoose.model('MusicTrack').findById(trackId);
        return !!track;
      },
      message: 'Invalid track ID'
    }
  }],
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Playlist must belong to a user'],
    index: true
  },
  isPublic: {
    type: Boolean,
    default: false,
    index: true
  },
  followers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create indexes for common queries
playlistSchema.index({ name: 'text', description: 'text' });
playlistSchema.index({ owner: 1, createdAt: -1 });
playlistSchema.index({ isPublic: 1, createdAt: -1 });
playlistSchema.index({ followers: 1 });

// Virtual fields
playlistSchema.virtual('trackCount').get(function() {
  return this.tracks.length;
});

// Instance methods
playlistSchema.methods.addTrack = async function(trackId: IMusicTrack['_id']): Promise<void> {
  if (!this.tracks.includes(trackId)) {
    this.tracks.push(trackId);
    await this.save();
  }
};

playlistSchema.methods.removeTrack = async function(trackId: IMusicTrack['_id']): Promise<void> {
  this.tracks = this.tracks.filter((id) => !id.equals(trackId));
  await this.save();
};

playlistSchema.methods.togglePublic = async function(): Promise<void> {
  this.isPublic = !this.isPublic;
  await this.save();
};

playlistSchema.methods.addFollower = async function(userId: IUser['_id']): Promise<void> {
  if (!this.followers.includes(userId)) {
    this.followers.push(userId);
    await this.save();
  }
};

playlistSchema.methods.removeFollower = async function(userId: IUser['_id']): Promise<void> {
  this.followers = this.followers.filter(id => !id.equals(userId));
  await this.save();
};

// Pre-save middleware to ensure unique tracks
playlistSchema.pre('save', function(next) {
  if (this.isModified('tracks')) {
    this.tracks = [...new Set(this.tracks.map(id => id.toString()))].map(id => new mongoose.Types.ObjectId(id));
  }
  next();
});

export const Playlist = mongoose.model<IPlaylist>('Playlist', playlistSchema);

