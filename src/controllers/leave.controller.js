import prisma from '../config/db.js';
import { sendResponse } from '../utils/response.js';

/**
 * Recalculates exact vacation balance for a user:
 * Dedicated Quota (User's Allocated Hours) - Sum of Approved Leave Hours = Remaining Balance
 */
export const recalculateUserVacationBalance = async (userId) => {
  try {
    if (!userId) return null;
    const targetId = Number(userId);

    const user = await prisma.user.findUnique({
      where: { id: targetId }
    });
    if (!user) return null;

    const bankingInfo = (user.bankingInfo && typeof user.bankingInfo === 'object') ? user.bankingInfo : {};
    const quota = bankingInfo.vacationQuota !== undefined
      ? Number(bankingInfo.vacationQuota)
      : (user.vacationBalance !== 10000 && user.vacationBalance > 0 ? user.vacationBalance : 80);

    const approvedRequests = await prisma.leaveRequest.findMany({
      where: {
        userId: targetId,
        status: { equals: 'Approved' }
      }
    });

    let totalDeducted = 0;
    approvedRequests.forEach((req) => {
      const sDate = new Date(req.startDate);
      const eDate = new Date(req.endDate);
      const diffMs = Math.abs(eDate.getTime() - sDate.getTime());
      const diffDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
      const reqHours = req.hours || (diffDays * 24);
      totalDeducted += reqHours;
    });

    const remainingBalance = Math.max(0, quota - totalDeducted);

    await prisma.user.update({
      where: { id: targetId },
      data: {
        vacationBalance: remainingBalance,
        bankingInfo: {
          ...bankingInfo,
          vacationQuota: quota
        }
      }
    });

    return { totalDeducted, remainingBalance, quota };
  } catch (err) {
    console.error(`Failed to recalculate vacation balance for User #${userId}:`, err);
    return null;
  }
};

export const getLeaveRequests = async (req, res, next) => {
  try {
    const roleName = req.user?.role?.name || '';
    const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'superadmin', 'admin'].includes(roleName);
    const tenantIdToFilter = isAdmin ? null : req.user?.tenantId;

    const where = {};
    if (tenantIdToFilter) where.tenantId = tenantIdToFilter;

    // Recalculate balance for logged-in user on fetch to keep DB in sync
    if (req.user?.id) {
      await recalculateUserVacationBalance(req.user.id);
    }

    const leaveRequests = await prisma.leaveRequest.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, vacationBalance: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mappedData = leaveRequests.map((req) => {
      const sDate = new Date(req.startDate);
      const eDate = new Date(req.endDate);
      const diffMs = Math.abs(eDate.getTime() - sDate.getTime());
      const diffDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
      const calculatedHours = diffDays * 24; // 24 hours per day (2 days = 48h)

      return {
        id: req.id,
        userId: req.userId,
        name: req.user?.name,
        type: req.leaveType,
        hours: req.hours || calculatedHours,
        start: req.startDate.toISOString().split('T')[0],
        end: req.endDate.toISOString().split('T')[0],
        reason: req.reason,
        status: req.status,
        createdAt: req.createdAt,
      };
    });

    sendResponse(res, 200, 'Leave requests fetched successfully', mappedData);
  } catch (error) {
    next(error);
  }
};

export const createLeaveRequest = async (req, res, next) => {
  try {
    const { user_id, company_id, leave_type, start_date, end_date, reason } = req.body;

    const sDate = new Date(start_date);
    const eDate = new Date(end_date);
    const diffMs = Math.abs(eDate.getTime() - sDate.getTime());
    const diffDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
    const calculatedHours = diffDays * 24; // 24 hours per day (e.g. 2 days = 48h)
    
    // New requests start strictly with status 'Pending' (Admin approval required)
    const newRequest = await prisma.leaveRequest.create({
      data: {
        userId: Number(user_id) || req.user.id,
        tenantId: Number(company_id) || req.user.tenantId,
        leaveType: leave_type,
        startDate: sDate,
        endDate: eDate,
        hours: calculatedHours,
        reason: reason,
        status: 'Pending',
      },
      include: {
        user: { select: { id: true, name: true, email: true, vacationBalance: true } },
      },
    });

    const mappedData = {
      id: newRequest.id,
      userId: newRequest.userId,
      name: newRequest.user?.name,
      type: newRequest.leaveType,
      hours: newRequest.hours,
      start: newRequest.startDate.toISOString().split('T')[0],
      end: newRequest.endDate.toISOString().split('T')[0],
      reason: newRequest.reason,
      status: newRequest.status,
      createdAt: newRequest.createdAt,
    };

    sendResponse(res, 201, 'Leave request created successfully', mappedData);
  } catch (error) {
    next(error);
  }
};

export const updateLeaveRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, leave_type, start_date, end_date, reason } = req.body;

    const existingRequest = await prisma.leaveRequest.findUnique({
      where: { id: Number(id) },
      include: { user: true }
    });

    if (!existingRequest) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    const formattedNewStatus = status 
      ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() 
      : existingRequest.status;

    const sDate = new Date(start_date || existingRequest.startDate);
    const eDate = new Date(end_date || existingRequest.endDate);
    const diffMs = Math.abs(eDate.getTime() - sDate.getTime());
    const diffDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
    const calculatedHours = diffDays * 24; // 24 hours per day (2 days = 48h)

    const dataToUpdate = {
      hours: calculatedHours
    };

    if (status) dataToUpdate.status = formattedNewStatus;
    if (leave_type) dataToUpdate.leaveType = leave_type;
    if (start_date) dataToUpdate.startDate = new Date(start_date);
    if (end_date) dataToUpdate.endDate = new Date(end_date);
    if (reason) dataToUpdate.reason = reason;

    const updatedRequest = await prisma.leaveRequest.update({
      where: { id: Number(id) },
      data: dataToUpdate,
      include: {
        user: { select: { id: true, name: true, email: true, vacationBalance: true } },
      },
    });

    // Recalculate exact total deducted and remaining vacation balance for the user
    await recalculateUserVacationBalance(updatedRequest.userId);

    const mappedData = {
      id: updatedRequest.id,
      userId: updatedRequest.userId,
      name: updatedRequest.user?.name,
      type: updatedRequest.leaveType,
      hours: updatedRequest.hours,
      start: updatedRequest.startDate.toISOString().split('T')[0],
      end: updatedRequest.endDate.toISOString().split('T')[0],
      reason: updatedRequest.reason,
      status: updatedRequest.status,
      createdAt: updatedRequest.createdAt,
    };

    sendResponse(res, 200, 'Leave request updated successfully', mappedData);
  } catch (error) {
    next(error);
  }
};

export const deleteLeaveRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.leaveRequest.findUnique({ where: { id: Number(id) } });
    const targetUserId = existing?.userId;

    await prisma.leaveRequest.delete({
      where: { id: Number(id) },
    });

    if (targetUserId) {
      await recalculateUserVacationBalance(targetUserId);
    }

    sendResponse(res, 200, 'Leave request deleted successfully');
  } catch (error) {
    next(error);
  }
};
