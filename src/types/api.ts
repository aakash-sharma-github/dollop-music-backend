import { User, UserAuth, UserPreferences } from './user';
import { Track, TrackStats, TrackFilters } from './track';
import { Playlist, PlaylistStats, PlaylistFilters } from './playlist';
import { ApiResponse, PaginationParams, SortOptions } from './common';

// Auth Endpoints
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse extends ApiResponse<{
  user: Omit<User, 'password'>;
  auth: UserAuth;
}> {}

// Track Endpoints
export interface CreateTrackRequest {
  title: string;
  artist: string;
  album?: string;
  duration: number;
  url: string;
  coverArt?: string;
  genre?: string;
  year?: number;
  tags?: string[];
  isPublic?: boolean;
}

export interface UpdateTrackRequest extends Partial<CreateTrackRequest> {}

export interface GetTracksRequest {
  filters?: TrackFilters;
  pagination?: Pick<PaginationParams, 'page' | 'limit'>;
  sort?: SortOptions;
}

export interface TrackResponse extends ApiResponse<Track> {}
export interface TracksResponse extends ApiResponse<Track[]> {}
export interface TrackStatsResponse extends ApiResponse<TrackStats> {}

// Playlist Endpoints
export interface CreatePlaylistRequest {
  name: string;
  description?: string;
  isPublic: boolean;
  coverImage?: string;
}

export interface UpdatePlaylistRequest extends Partial<CreatePlaylistRequest> {}

export interface GetPlaylistsRequest {
  filters?: PlaylistFilters;
  pagination?: Pick<PaginationParams, 'page' | 'limit'>;
  sort?: SortOptions;
}

export interface PlaylistTrackOperation {
  trackId: string;
}

export interface PlaylistResponse extends ApiResponse<Playlist> {}
export interface PlaylistsResponse extends ApiResponse<Playlist[]> {}
export interface PlaylistStatsResponse extends ApiResponse<PlaylistStats> {}

// User Endpoints
export interface UpdateUserRequest {
  username?: string;
  email?: string;
  preferences?: UserPreferences;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UserResponse extends ApiResponse<Omit<User, 'password'>> {}

// Search Endpoints
export interface SearchRequest {
  query: string;
  types: ('track' | 'playlist' | 'user')[];
  filters?: {
    track?: TrackFilters;
    playlist?: PlaylistFilters;
  };
  pagination?: Pick<PaginationParams, 'page' | 'limit'>;
}

export interface SearchResponse extends ApiResponse<{
  tracks?: Track[];
  playlists?: Playlist[];
  users?: Omit<User, 'password'>[];
}> {}

// Error Responses
export interface ValidationError {
  field: string;
  message: string;
}

export interface ErrorResponse extends ApiResponse<never> {
  error: {
    code: string;
    message: string;
    details?: ValidationError[];
  };
}

// WebSocket Events
export interface WebSocketEvent<T = any> {
  type: string;
  payload: T;
  timestamp: Date;
}

export interface PlaybackEvent extends WebSocketEvent {
  type: 'PLAYBACK_UPDATE';
  payload: {
    trackId: string;
    position: number;
    status: 'playing' | 'paused' | 'stopped';
  };
}

export interface PlaylistUpdateEvent extends WebSocketEvent {
  type: 'PLAYLIST_UPDATE';
  payload: {
    playlistId: string;
    action: 'add_track' | 'remove_track' | 'reorder';
    trackId?: string;
    newIndex?: number;
  };
}

// File Upload
export interface FileUploadResponse extends ApiResponse<{
  url: string;
  fileType: string;
  size: number;
}> {}

// Generic Response Types
export type ResponseWithPagination<T> = ApiResponse<T> & {
  pagination: PaginationParams;
};

export type BatchOperationResponse = ApiResponse<{
  successful: string[];
  failed: {
    id: string;
    error: string;
  }[];
}>;

