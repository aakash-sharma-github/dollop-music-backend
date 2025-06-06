export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number; // in seconds
  url: string;
  coverArt?: string;
  genre?: string;
  year?: number;
  tags?: string[];
  playCount?: number;
  isPublic?: boolean;
  userId?: string; // owner of the track
  createdAt: Date;
  updatedAt: Date;
}

export interface TrackStats {
  playCount: number;
  lastPlayed?: Date;
  addedToPlaylists: number;
}

export interface TrackFilters {
  search?: string;
  artist?: string;
  genre?: string;
  tags?: string[];
  isPublic?: boolean;
  userId?: string;
}

