import { Response, NextFunction } from 'express';
import { Playlist } from '../models/Playlist';
import { AuthRequest } from '../types';
import { AppError } from '@/middleware/error';
import mongoose from 'mongoose';

export class PlaylistController {
  // Create new playlist
  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const playlist = await Playlist.create({
        ...req.body,
        owner: req.user!._id
      });

      res.status(201).json({
        status: 'success',
        data: { playlist }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all playlists with filtering and sorting
  static async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const query: any = {};

      // Search by name or description
      if (req.query.search) {
        query.$text = { $search: req.query.search as string };
      }

      // Filter by owner
      if (req.query.owner) {
        query.owner = req.query.owner;
      }

      // Only show public playlists or user's own playlists
      query.$or = [
        { isPublic: true },
        { owner: req.user?._id }
      ];

      // Sorting options
      const sortOptions: Record<string, any> = {
        newest: { createdAt: -1 },
        oldest: { createdAt: 1 },
        nameAsc: { name: 1 },
        nameDesc: { name: -1 },
        popular: { 'followers.length': -1 }
      };

      const sortBy = sortOptions[req.query.sort as string] || sortOptions.newest;

      const totalPlaylists = await Playlist.countDocuments(query);
      const playlists = await Playlist.find(query)
        .sort(sortBy)
        .skip(skip)
        .limit(limit)
        .populate('owner', 'username')
        .populate({
          path: 'tracks',
          select: 'title artist duration fileUrl coverArt',
          options: { limit: 5 } // Limit tracks preview
        });

      res.json({
        status: 'success',
        data: { playlists },
        pagination: {
          page,
          limit,
          totalItems: totalPlaylists,
          totalPages: Math.ceil(totalPlaylists / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get single playlist
  static async getOne(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const playlist = await Playlist.findById(req.params.id)
        .populate('owner', 'username')
        .populate('tracks', 'title artist duration fileUrl coverArt')
        .populate('followers', 'username');

      if (!playlist) {
        throw new AppError('Playlist not found', 404);
      }

      // Check if user has access to the playlist
      if (!playlist.isPublic && (!req.user || (playlist.owner as mongoose.Types.ObjectId).toString() !== req.user._id.toString())) {
        throw new AppError('Not authorized to access this playlist', 403);
      }

      res.json({
        status: 'success',
        data: { playlist }
      });
    } catch (error) {
      next(error);
    }
  }

  // Update playlist
  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const playlist = await Playlist.findById(req.params.id);

      if (!playlist) {
        throw new AppError('Playlist not found', 404);
      }

      // Check ownership
      if (playlist.owner.toString() !== req.user!._id.toString()) {
        throw new AppError('Not authorized to update this playlist', 403);
      }

      // Update allowed fields
      const allowedUpdates = ['name', 'description', 'coverImage', 'isPublic'];
      const updates = Object.keys(req.body)
        .filter(key => allowedUpdates.includes(key))
        .reduce((obj, key) => ({
          ...obj,
          [key]: req.body[key]
        }), {});

      Object.assign(playlist, updates);
      await playlist.save();

      const updatedPlaylist = await Playlist.findById(playlist._id)
        .populate('owner', 'username')
        .populate('tracks', 'title artist duration fileUrl coverArt')
        .populate('followers', 'username');

      res.json({
        status: 'success',
        data: { playlist: updatedPlaylist }
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete playlist
  static async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const playlist = await Playlist.findById(req.params.id);

      if (!playlist) {
        throw new AppError('Playlist not found', 404);
      }

      // Check ownership
      if (playlist.owner.toString() !== req.user!._id.toString()) {
        throw new AppError('Not authorized to delete this playlist', 403);
      }

      await playlist.deleteOne();

      res.json({
        status: 'success',
        data: null
      });
    } catch (error) {
      next(error);
    }
  }

  // Add track to playlist
  static async addTrack(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { trackId } = req.body;
      const playlist = await Playlist.findById(req.params.id);

      if (!playlist) {
        throw new AppError('Playlist not found', 404);
      }

      // Check ownership
      if (playlist.owner.toString() !== req.user!._id.toString()) {
        throw new AppError('Not authorized to modify this playlist', 403);
      }

      await playlist.addTrack(new mongoose.Types.ObjectId(trackId));

      const updatedPlaylist = await Playlist.findById(playlist._id)
        .populate('tracks', 'title artist duration fileUrl coverArt');

      res.json({
        status: 'success',
        data: { playlist: updatedPlaylist }
      });
    } catch (error) {
      next(error);
    }
  }

  // Remove track from playlist
  static async removeTrack(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { trackId } = req.params;
      const playlist = await Playlist.findById(req.params.id);

      if (!playlist) {
        throw new AppError('Playlist not found', 404);
      }

      // Check ownership
      if (playlist.owner.toString() !== req.user!._id.toString()) {
        throw new AppError('Not authorized to modify this playlist', 403);
      }

      await playlist.removeTrack(new mongoose.Types.ObjectId(trackId));

      const updatedPlaylist = await Playlist.findById(playlist._id)
        .populate('tracks', 'title artist duration fileUrl coverArt');

      res.json({
        status: 'success',
        data: { playlist: updatedPlaylist }
      });
    } catch (error) {
      next(error);
    }
  }

  // Toggle playlist follow status
  static async toggleFollow(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const playlist = await Playlist.findById(req.params.id);

      if (!playlist) {
        throw new AppError('Playlist not found', 404);
      }

      const userId = req.user!._id;
      const isFollowing = playlist.followers.includes(userId);

      if (isFollowing) {
        await playlist.removeFollower(userId);
      } else {
        await playlist.addFollower(userId);
      }

      const updatedPlaylist = await Playlist.findById(playlist._id)
        .populate('followers', 'username');

      res.json({
        status: 'success',
        data: {
          isFollowing: !isFollowing,
          followersCount: updatedPlaylist?.followers.length || 0
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

