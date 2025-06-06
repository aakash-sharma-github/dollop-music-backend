export interface Playlist {
  id: string;
  name: string;
  description?: string;
  userId: string; // owner of the playlist
  tracks: string[]; // array of track IDs
  isPublic: boolean;
  coverImage?: string;
  followers?: string[]; // array of user IDs
  createdAt: Date;
  updatedAt: Date;
}

export interface PlaylistStats {
  trackCount: number;
  totalDuration: number; // in seconds
  followerCount: number;
  lastUpdated: Date;
}

export interface PlaylistFilters {
  search?: string;
  userId?: string;
  isPublic?: boolean;
  hasTrack?: string; // track ID
  minTracks?: number;
  maxTracks?: number;
}

