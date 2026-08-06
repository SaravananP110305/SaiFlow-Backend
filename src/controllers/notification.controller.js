import { StatusCodes } from 'http-status-codes';
import prisma from '../config/prisma.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import { getPagination } from '../utils/pagination.js';

const timeAgo = (date) => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} wk ago`;
  const months = Math.floor(days / 30);
  return `${months} mo ago`;
};

export const getNotifications = async (req, res, next) => {
  try {
    const { page, limit } = getPagination(req.query, 20, 100);
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.notification.count(),
      prisma.notification.count({ where: { isRead: false } })
    ]);

    const data = notifications.map((n) => ({
      id: n.id,
      userName: n.userName,
      message: n.message,
      targetName: n.targetName,
      category: n.category,
      time: timeAgo(n.createdAt),
      unread: !n.isRead,
      createdAt: n.createdAt
    }));

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Notifications retrieved successfully', {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
          unreadCount
        }
      })
    );
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.notification.findUnique({ where: { id } });

    if (!existing) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Notification not found'));
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Notification marked as read', { id })
    );
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true }
    });

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'All notifications marked as read', {
        updated: result.count
      })
    );
  } catch (error) {
    next(error);
  }
};
