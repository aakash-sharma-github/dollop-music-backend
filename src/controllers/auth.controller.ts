import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { AppError } from '../middleware/error';
import { AuthRequest } from '../types';

export class AuthController {
  // Register new user
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, email, password } = req.body;

      // Check if user already exists
      const userExists = await User.findOne({ $or: [{ email }, { username }] });
      if (userExists) {
        throw new AppError('User with this email or username already exists', 400);
      }

      // Create new user
      const user = await User.create({
        username,
        email,
        password
      });

      // Generate tokens
      const accessToken = user.generateAuthToken();
      const refreshToken = user.generateRefreshToken();
      await user.save();

      res.status(201).json({
        status: 'success',
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email
          },
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Login user
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      // Check if user exists
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        throw new AppError('Invalid credentials', 401);
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        throw new AppError('Invalid credentials', 401);
      }

      // Generate tokens
      const accessToken = user.generateAuthToken();
      const refreshToken = user.generateRefreshToken();
      await user.save();

      res.json({
        status: 'success',
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email
          },
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get current user
  static async getCurrentUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError('Not authenticated', 401);
      }

      res.json({
        status: 'success',
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Logout user
  static async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError('Not authenticated', 401);
      }

      user.refreshToken = undefined;
      await user.save();

      res.json({
        status: 'success',
        message: 'Successfully logged out'
      });
    } catch (error) {
      next(error);
    }
  }

  // Refresh token
  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new AppError('Refresh token is required', 400);
      }

      const user = await User.findOne({ refreshToken });
      if (!user) {
        throw new AppError('Invalid refresh token', 401);
      }

      const accessToken = user.generateAuthToken();
      const newRefreshToken = user.generateRefreshToken();
      await user.save();

      res.json({
        status: 'success',
        data: {
          accessToken,
          refreshToken: newRefreshToken
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

