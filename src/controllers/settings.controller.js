import { StatusCodes } from 'http-status-codes';
import prisma from '../config/prisma.js';
import ApiResponse from '../utils/ApiResponse.js';

const SETTING_KEYS = {
  GENERAL: ['appName', 'timeZone', 'language'],
  COMPANY: ['companyName', 'contactEmail', 'address']
};

const categoryForKey = (key) => {
  for (const [category, keys] of Object.entries(SETTING_KEYS)) {
    if (keys.includes(key)) {
      return category;
    }
  }
  return null;
};

export const getSettings = async (req, res, next) => {
  try {
    const settings = await prisma.setting.findMany({
      orderBy: { key: 'asc' }
    });

    const flat = {};
    const grouped = {};
    for (const setting of settings) {
      flat[setting.key] = setting.value ?? '';
      const category = setting.category || categoryForKey(setting.key) || 'GENERAL';
      grouped[category] = grouped[category] || {};
      grouped[category][setting.key] = setting.value ?? '';
    }

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Settings retrieved successfully', {
        ...flat,
        categories: grouped
      })
    );
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const body = req.body || {};
    const entries = Object.entries(body).filter(([key]) => categoryForKey(key));

    if (entries.length === 0) {
      return res.status(StatusCodes.OK).json(
        new ApiResponse(StatusCodes.OK, 'No valid settings to update')
      );
    }

    await prisma.$transaction(
      entries.map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          update: {
            value: value == null ? '' : String(value),
            category: categoryForKey(key),
            updatedById: req.user?.id ?? null
          },
          create: {
            key,
            category: categoryForKey(key),
            value: value == null ? '' : String(value),
            updatedById: req.user?.id ?? null
          }
        })
      )
    );

    const settings = await prisma.setting.findMany({ orderBy: { key: 'asc' } });
    const flat = {};
    for (const setting of settings) {
      flat[setting.key] = setting.value ?? '';
    }

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Settings updated successfully', flat)
    );
  } catch (error) {
    next(error);
  }
};
