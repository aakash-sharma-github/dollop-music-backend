import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '@/models/User';
import { AuthRequest, JwtPayload } from '../types';

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // 1. Get token from header
    const authHeader = req.headers.authorization;
    let token: string;

    if (authHeader && authHeader.startsWith('Bearer')) {
      token = authHeader.split(' ')[1];
    } else {
      return res.status(401).json({
        status: 'error',
        message: 'Not authorized to access this route'
      });
    }

    try {
      // 2. Verify token
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

      // 3. Get user from token
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: 'User not found'
        });
      }

      // 4. Add user to request object
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        status: 'error',
        message: 'Token is invalid or has expired'
      });
    }
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        status: 'error',
        message: 'Refresh token is required'
      });
    }

    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as JwtPayload;

      // Get user and check if refresh token matches
      const user = await User.findById(decoded.id).select('+refreshToken');

      if (!user || (user as any).refreshToken !== refreshToken) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid refresh token'
        });
      }

      // Generate new tokens
      const newAccessToken = user.generateAuthToken();
      const newRefreshToken = user.generateRefreshToken();

      // Save new refresh token
      await user.save();

      res.json({
        status: 'success',
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        }
      });
    } catch (error) {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token is invalid or has expired'
      });
    }
  } catch (error) {
    next(error);
  }
};

