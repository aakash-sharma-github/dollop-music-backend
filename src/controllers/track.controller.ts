import { Request, Response, NextFunction } from 'express';
import { MusicTrack } from '../models/MusicTrack';
import { AuthRequest, MusicTrackFilters } from '../types';
import { AppError } from '../middleware/error';

export class TrackController {
  // Create new track
  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const track = await MusicTrack.create({
        ...req.body,
        owner: req.user!._id
      });

      res.status(201).json({
        status: 'success',
        data: { track }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all tracks with filtering
  static async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const filters: MusicTrackFilters = req.query;
      const query: any = {};

      // Build query based on filters
      if (filters.search) {
        query.$text = { $search: filters.search };
      }
      if (filters.artist) {
        query.artist = { $regex: filters.artist, $options: 'i' };
      }
      if (filters.genre) {
        query.genre = filters.genre;
      }
      if (filters.isPublic !== undefined) {
        query.isPublic = filters.isPublic;
      }
      if (filters.owner) {
        query.owner = filters.owner;
      }
      if (filters.tags) {
        query.tags = { $all: Array.isArray(filters.tags) ? filters.tags : [filters.tags] };
      }

      // Only show public tracks or user's own tracks
      query.$or = [
        { isPublic: true },
        { owner: req.user?._id }
      ];

      const totalTracks = await MusicTrack.countDocuments(query);
      const tracks = await MusicTrack.find(query)
        .sort(filters.sortBy ? { [filters.sortBy]: filters.sortOrder === 'desc' ? -1 : 1 } : { createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('owner', 'username');

      res.json({
        status: 'success',
        data: { tracks },
        pagination: {
          page,
          limit,
          totalItems: totalTracks,
          totalPages: Math.ceil(totalTracks / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get single track
  static async getOne(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const track = await MusicTrack.findById(req.params.id).populate('owner', 'username');
      
      if (!track) {
        throw new AppError('Track not found', 404);
      }

      // Check if user has access to the track
      if (!track.isPublic && (!req.user || track.owner.toString() !== req.user._id.toString())) {
        throw new AppError('Not authorized to access this track', 403);
      }

      res.json({
        status: 'success',
        data: { track }
      });
    } catch (error) {
      next(error);
    }
  }

  // Update track
  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const track = await MusicTrack.findById(req.params.id);
      
      if (!track) {
        throw new AppError('Track not found', 404);
      }

      // Check ownership
      if (track.owner.toString() !== req.user!._id.toString()) {
        throw new AppError('Not authorized to update this track', 403);
      }

      // Update track
      Object.assign(track, req.body);
      await track.save();

      res.json({
        status: 'success',
        data: { track }
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete track
  static async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const track = await MusicTrack.findById(req.params.id);
      
      if (!track) {
        throw new AppError('Track not found', 404);
      }

      // Check ownership
      if (track.owner.toString() !== req.user!._id.toString()) {
        throw new AppError('Not authorized to delete this track', 403);
      }

      await track.deleteOne();

      res.json({
        status: 'success',
        data: null
      });
    } catch (error) {
      next(error);
    }
  }

  // Increment play count
  static async incrementPlayCount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const track = await MusicTrack.findById(req.params.id);
      
      if (!track) {
        throw new AppError('Track not found', 404);
      }

      await track.incrementPlayCount();

      res.json({
        status: 'success',
        data: { playCount: track.playCount }
      });
    } catch (error) {
      next(error);
    }
  }
}

