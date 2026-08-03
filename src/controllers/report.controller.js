import { StatusCodes } from 'http-status-codes';
import prisma from '../config/prisma.js';
import ApiResponse from '../utils/ApiResponse.js';

export const getDashboardSummary = async (req, res, next) => {
  try {
    const [
      totalLeads,
      unassignedLeads,
      wonLeads,
      scheduledMeetings,
      openProposals,
      revenueAggregate
    ] = await Promise.all([
      prisma.lead.count({ where: { deletedAt: null } }),
      prisma.lead.count({ where: { deletedAt: null, assignedToId: null } }),
      prisma.lead.count({ where: { deletedAt: null, status: 'WON' } }),
      prisma.meeting.count({ where: { status: 'SCHEDULED' } }),
      prisma.proposal.count({ where: { status: 'Sent' } }),
      prisma.proposal.aggregate({
        where: { status: { in: ['Accepted', 'Won'] } },
        _sum: { amount: true }
      })
    ]);

    const totalWonRevenue = revenueAggregate._sum.amount || 0;
    const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(2) : 0;

    const summary = {
      totalLeads,
      unassignedLeads,
      wonLeads,
      scheduledMeetings,
      openProposals,
      totalWonRevenue,
      conversionRate: `${conversionRate}%`
    };

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Dashboard KPIs retrieved successfully', summary)
    );
  } catch (error) {
    next(error);
  }
};

export const getLeadReport = async (req, res, next) => {
  try {
    const [statusDistribution, sourceDistribution] = await Promise.all([
      prisma.lead.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { id: true }
      }),
      prisma.lead.groupBy({
        by: ['sourceId'],
        where: { deletedAt: null },
        _count: { id: true }
      })
    ]);

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Lead analytics report retrieved successfully', {
        statusDistribution,
        sourceDistribution
      })
    );
  } catch (error) {
    next(error);
  }
};

export const getMeetingReport = async (req, res, next) => {
  try {
    const meetingStatusBreakdown = await prisma.meeting.groupBy({
      by: ['status'],
      _count: { id: true }
    });

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Meeting performance report retrieved successfully', {
        meetingStatusBreakdown
      })
    );
  } catch (error) {
    next(error);
  }
};

export const getEmployeeReport = async (req, res, next) => {
  try {
    const employeeStats = await prisma.user.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: { select: { name: true } },
        _count: {
          select: {
            assignedLeads: { where: { deletedAt: null } },
            createdMeetings: true,
            createdProposals: true
          }
        }
      }
    });

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Employee performance report retrieved successfully', employeeStats)
    );
  } catch (error) {
    next(error);
  }
};

export const getProposalReport = async (req, res, next) => {
  try {
    const proposalStats = await prisma.proposal.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { amount: true }
    });

    res.status(StatusCodes.OK).json(
      new ApiResponse(StatusCodes.OK, 'Proposal revenue report retrieved successfully', proposalStats)
    );
  } catch (error) {
    next(error);
  }
};
