import { StatusCodes } from 'http-status-codes';
import prisma from '../config/prisma.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';

export const getMeetings = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const skip = (page - 1) * limit;

    const { leadId, status, createdById, startDate, endDate, search } = req.query;

    const where = {
      ...(leadId && { leadId: parseInt(leadId, 10) }),
      ...(status && { status }),
      ...(createdById && { createdById: parseInt(createdById, 10) }),
      ...((startDate || endDate) && {
        scheduledAt: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) })
        }
      }),
      ...(search && {
        OR: [
          { lead: { title: { contains: search, mode: 'insensitive' } } },
          { lead: { contactPerson: { contains: search, mode: 'insensitive' } } },
          { lead: { company: { name: { contains: search, mode: 'insensitive' } } } }
        ]
      })
    };

    const [total, meetings] = await Promise.all([
      prisma.meeting.count({ where }),
      prisma.meeting.findMany({
        where,
        include: {
          lead: {
            select: { id: true, title: true, contactPerson: true, email: true, status: true }
          },
          createdBy: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { scheduledAt: 'asc' },
        skip,
        take: limit
      })
    ]);

    res.status(StatusCodes.OK).json(
      new ApiResponse(
        StatusCodes.OK,
        'Meetings retrieved successfully',
        meetings,
        { total, page, limit, totalPages: Math.ceil(total / limit) }
      )
    );
  } catch (error) {
    next(error);
  }
};

export const getMeetingById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        lead: true,
        createdBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!meeting) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Meeting not found'));
    }

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Meeting retrieved successfully', meeting)
    );
  } catch (error) {
    next(error);
  }
};

export const createMeeting = async (req, res, next) => {
  try {
    const { leadId, title, scheduledAt, durationMinutes, meetingLink, status, agenda, scopeNotes } = req.body;
    const createdById = req.user.id;

    const lead = await prisma.lead.findFirst({ where: { id: leadId, deletedAt: null } });
    if (!lead) {
      return next(new ApiError(StatusCodes.BAD_REQUEST, 'Associated lead does not exist'));
    }

    // Create meeting & update lead status to MEETING_SCHEDULED in transaction
    const [meeting] = await prisma.$transaction([
      prisma.meeting.create({
        data: {
          leadId,
          title,
          scheduledAt: new Date(scheduledAt),
          durationMinutes: durationMinutes || 30,
          meetingLink,
          status: status || 'SCHEDULED',
          agenda,
          scopeNotes,
          createdById
        },
        include: {
          lead: { select: { id: true, title: true, contactPerson: true } },
          createdBy: { select: { id: true, name: true } }
        }
      }),
      prisma.lead.update({
        where: { id: leadId },
        data: { status: 'MEETING_SCHEDULED' }
      })
    ]);

    res.status(StatusCodes.CREATED).json(
      new ApiResponse(StatusCodes.CREATED, 'Meeting scheduled successfully', meeting)
    );
  } catch (error) {
    next(error);
  }
};

export const updateMeeting = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.meeting.findUnique({ where: { id } });

    if (!existing) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Meeting not found'));
    }

    const { title, scheduledAt, durationMinutes, meetingLink, status, agenda, scopeNotes } = req.body;

    const updated = await prisma.meeting.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }),
        ...(durationMinutes && { durationMinutes }),
        ...(meetingLink !== undefined && { meetingLink }),
        ...(status && { status }),
        ...(agenda !== undefined && { agenda }),
        ...(scopeNotes !== undefined && { scopeNotes })
      },
      include: {
        lead: { select: { id: true, title: true } }
      }
    });

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Meeting updated successfully', updated)
    );
  } catch (error) {
    next(error);
  }
};

export const updateMeetingStatus = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status, scopeNotes } = req.body;

    const meeting = await prisma.meeting.findUnique({ where: { id } });
    if (!meeting) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Meeting not found'));
    }

    const updated = await prisma.meeting.update({
      where: { id },
      data: {
        status,
        ...(scopeNotes !== undefined && { scopeNotes })
      }
    });

    // Auto-advance lead status to QUALIFIED if meeting is marked COMPLETED
    if (status === 'COMPLETED') {
      await prisma.lead.update({
        where: { id: meeting.leadId },
        data: { status: 'QUALIFIED' }
      });
    }

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, `Meeting status updated to ${status}`, updated)
    );
  } catch (error) {
    next(error);
  }
};

export const deleteMeeting = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.meeting.findUnique({ where: { id } });

    if (!existing) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Meeting not found'));
    }

    await prisma.meeting.delete({ where: { id } });

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Meeting deleted successfully')
    );
  } catch (error) {
    next(error);
  }
};
