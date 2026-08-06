import { StatusCodes } from 'http-status-codes';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { avatarsDir } from '../middlewares/upload.middleware.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} from '../utils/token.util.js';
import { env } from '../config/env.js';

// Helper to hash refresh tokens
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Build a safe user payload without credentials and role permissions
const buildUserPayload = (user) => {
  const { passwordHash, refreshTokenHash, role, ...userData } = user;

  const safeRole = role
    ? {
        id: role.id,
        name: role.name,
        status: role.status
      }
    : null;

  return {
    ...userData,
    role: safeRole
  };
};

const storeRefreshToken = async (userId, refreshToken) => {
  const hashedRefreshToken = hashToken(refreshToken);

  await prisma.user.update({
    where: { id: userId },
    data: { refreshTokenHash: hashedRefreshToken }
  });
};

const clearRefreshSession = (res) => {
  // No options passed: res.clearCookie() expires the cookie immediately on the
  // same path it was set ('/'), and passing cookieOptions (which includes
  // maxAge) here is deprecated by Express.
  res.clearCookie('refreshToken');
};

// Cookie configuration helper
const cookieOptions = {
  httpOnly: true,
  secure: env.isProduction, // True in production to ensure HTTPS-only
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days matching token expiration
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true }
    });

    if (!user || user.deletedAt) {
      return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid email or password'));
    }

    if (user.status !== 'ACTIVE') {
      return next(new ApiError(StatusCodes.FORBIDDEN, `Your account status is ${user.status}. Please contact support.`));
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid email or password'));
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await storeRefreshToken(user.id, refreshToken);

    res.cookie('refreshToken', refreshToken, cookieOptions);

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Login successful', {
        accessToken
      })
    );
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Refresh token is required'));
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid or expired refresh token'));
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { role: true }
    });

    if (!user || user.deletedAt || user.status !== 'ACTIVE') {
      return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid session'));
    }

    // Verify stored refresh token hash matches the incoming token
    const incomingHash = hashToken(refreshToken);
    if (user.refreshTokenHash !== incomingHash) {
      // Security Alert: Refresh token reuse detected (could indicate token theft)
      // Revoke all sessions for this user for security
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshTokenHash: null }
      });
      clearRefreshSession(res);
      return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Security violation: Refresh token already used. Please login again.'));
    }

    // Issue new tokens (Refresh Token Rotation)
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    await storeRefreshToken(user.id, newRefreshToken);

    res.cookie('refreshToken', newRefreshToken, cookieOptions);

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Tokens refreshed successfully', {
        accessToken: newAccessToken
      })
    );
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    // req.user is set by isAuthenticated middleware
    const userId = req.user.id;

    // Invalidate refresh token in database
    await prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null }
    });

    clearRefreshSession(res);

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Logout successful')
    );
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Profile retrieved successfully', {
        user: buildUserPayload(req.user)
      })
    );
  } catch (error) {
    next(error);
  }
};

export const getPrivileges = async (req, res, next) => {
  try {
    const role = req.user.role;

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'User privileges retrieved successfully', {
        role: {
          id: role.id,
          name: role.name,
          status: role.status
        },
        permissions: role.permissions || {}
      })
    );
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, email, phone, department } = req.body;

    const existingUser = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null }
    });

    if (!existingUser) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'User not found'));
    }

    if (email && email !== existingUser.email) {
      const duplicate = await prisma.user.findFirst({
        where: { email, id: { not: userId } }
      });
      if (duplicate && !duplicate.deletedAt) {
        return next(new ApiError(StatusCodes.CONFLICT, `Email '${email}' is already in use`));
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(department !== undefined && { department })
      },
      include: { role: true }
    });

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Profile updated successfully', {
        user: buildUserPayload(updatedUser)
      })
    );
  } catch (error) {
    next(error);
  }
};

export const uploadProfilePhoto = async (req, res, next) => {
  let uploadedFilePath = null;
  try {
    const file = req.file;
    if (!file) {
      return next(new ApiError(StatusCodes.BAD_REQUEST, 'Please select an image to upload'));
    }

    const userId = req.user.id;
    uploadedFilePath = path.join(avatarsDir, file.filename);

    const existingUser = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null }
    });

    if (!existingUser) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'User not found'));
    }

    const avatarUrl = `/uploads/avatars/${file.filename}`;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      include: { role: true }
    });

    // Best-effort cleanup of the previously stored avatar file
    if (existingUser.avatarUrl && existingUser.avatarUrl !== avatarUrl) {
      const oldFilePath = path.join(avatarsDir, path.basename(existingUser.avatarUrl));
      fs.unlink(oldFilePath, () => {});
    }

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Profile photo updated successfully', {
        user: buildUserPayload(updatedUser)
      })
    );
  } catch (error) {
    // Remove the just-uploaded file so a failed save does not orphan it
    if (uploadedFilePath) {
      fs.unlink(uploadedFilePath, () => {});
    }
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isOldPasswordValid) {
      return next(new ApiError(StatusCodes.BAD_REQUEST, 'Current password is incorrect'));
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashedNewPassword,
        refreshTokenHash: null // Log out all other sessions on password update
      }
    });

    clearRefreshSession(res);

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Password updated successfully. Please login again.')
    );
  } catch (error) {
    next(error);
  }
};
