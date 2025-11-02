/**
 * Temporal Approval Workflow
 * Replaces the old custom workflow engine for approval processes
 */

import { proxyActivities, sleep } from '@temporalio/workflow';
import type * as activities from '../activities';
import { ApprovalRequest, ApprovalResult } from '../types/workflow.types';

// Configure activity timeouts
const {
  sendNotification,
  checkApprovalStatus,
  escalateApproval,
  recordApprovalDecision,
  createAuditLog,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '1s',
    maximumInterval: '10s',
    maximumAttempts: 3,
  },
});

/**
 * Main approval workflow
 * Implements approval with timeout and escalation
 */
export async function approvalWorkflow(
  request: ApprovalRequest,
): Promise<ApprovalResult> {
  const maxAttempts = 3;
  const attemptInterval = 60 * 60 * 1000; // 1 hour in milliseconds
  const escalationTimeout = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  let approved = false;
  let rejected = false;
  let attempts = 0;
  let escalationLevel = 0;

  // Create audit log for workflow start
  await createAuditLog(
    request.requestId,
    'WORKFLOW_STARTED',
    request.initiatorId,
    {
      approverId: request.approverId,
      module: request.module,
      entityType: request.entityType,
      entityId: request.entityId,
    },
  );

  // Step 1: Send initial notification to approver
  await sendNotification({
    userId: request.approverId,
    type: 'APPROVAL_REQUEST',
    title: 'Approval Request',
    message: `You have a new approval request for ${request.module}`,
    priority: request.priority,
    data: {
      requestId: request.requestId,
      entityType: request.entityType,
      entityId: request.entityId,
      metadata: request.metadata,
    },
  });

  // Step 2: Wait for approval with periodic checks and escalation
  const startTime = Date.now();

  while (!approved && !rejected && attempts < maxAttempts) {
    // Wait for check interval (1 hour)
    await sleep(attemptInterval);

    // Check approval status
    const status = await checkApprovalStatus(request.requestId);

    if (status.status === 'APPROVED') {
      approved = true;

      // Record approval decision
      await recordApprovalDecision(
        request.requestId,
        'APPROVED',
        status.approvedBy!,
        status.comment,
      );

      // Send approval confirmation notification
      await sendNotification({
        userId: request.initiatorId,
        type: 'APPROVAL_RESULT',
        title: 'Request Approved',
        message: `Your request has been approved by ${status.approvedBy}`,
        priority: 'MEDIUM',
        data: {
          requestId: request.requestId,
          approvedBy: status.approvedBy,
          comment: status.comment,
        },
      });

      break;
    } else if (status.status === 'REJECTED') {
      rejected = true;

      // Record rejection decision
      await recordApprovalDecision(
        request.requestId,
        'REJECTED',
        status.approvedBy!,
        status.comment,
      );

      // Send rejection notification
      await sendNotification({
        userId: request.initiatorId,
        type: 'APPROVAL_RESULT',
        title: 'Request Rejected',
        message: `Your request has been rejected`,
        priority: 'MEDIUM',
        data: {
          requestId: request.requestId,
          rejectedBy: status.approvedBy,
          comment: status.comment,
        },
      });

      break;
    }

    attempts++;

    // Step 3: Escalate after 24 hours (3 attempts)
    const elapsedTime = Date.now() - startTime;
    if (attempts === maxAttempts && !approved && !rejected) {
      escalationLevel++;

      // TODO: Get escalation user from configuration
      const escalateToUserId = 'ESCALATION_USER_ID'; // Placeholder

      await escalateApproval(request, escalationLevel, escalateToUserId);

      // Send escalation notifications
      await sendNotification({
        userId: escalateToUserId,
        type: 'APPROVAL_REQUEST',
        title: 'Escalated Approval Request',
        message: `Approval request has been escalated to you (Level ${escalationLevel})`,
        priority: 'HIGH',
        data: {
          requestId: request.requestId,
          originalApproverId: request.approverId,
          escalationLevel,
          elapsedHours: Math.floor(elapsedTime / (60 * 60 * 1000)),
        },
      });

      await sendNotification({
        userId: request.initiatorId,
        type: 'SYSTEM_ALERT',
        title: 'Request Escalated',
        message: `Your approval request has been escalated due to timeout`,
        priority: 'MEDIUM',
        data: {
          requestId: request.requestId,
          escalationLevel,
        },
      });

      // Create audit log for escalation
      await createAuditLog(request.requestId, 'ESCALATED', 'SYSTEM', {
        escalationLevel,
        escalateToUserId,
        elapsedHours: Math.floor(elapsedTime / (60 * 60 * 1000)),
      });
    }
  }

  // Step 4: Determine final result
  const result: ApprovalResult = {
    requestId: request.requestId,
    status: approved ? 'APPROVED' : rejected ? 'REJECTED' : 'TIMEOUT',
    escalationLevel,
  };

  if (approved) {
    result.approvedAt = new Date();
  } else if (rejected) {
    result.rejectedAt = new Date();
  }

  // Create final audit log
  await createAuditLog(request.requestId, 'WORKFLOW_COMPLETED', 'SYSTEM', {
    status: result.status,
    escalationLevel: result.escalationLevel,
  });

  return result;
}

/**
 * Simple approval workflow without escalation
 * For use cases that don't require escalation logic
 */
export async function simpleApprovalWorkflow(
  request: ApprovalRequest,
): Promise<ApprovalResult> {
  // Send notification
  await sendNotification({
    userId: request.approverId,
    type: 'APPROVAL_REQUEST',
    title: 'Approval Request',
    message: `You have a new approval request for ${request.module}`,
    priority: request.priority,
    data: {
      requestId: request.requestId,
      entityType: request.entityType,
      entityId: request.entityId,
    },
  });

  // Wait for approval (simple polling)
  let approved = false;
  let rejected = false;
  const maxWaitMinutes = 60 * 24 * 7; // 7 days
  const checkIntervalMinutes = 5;
  let elapsedMinutes = 0;

  while (!approved && !rejected && elapsedMinutes < maxWaitMinutes) {
    await sleep(checkIntervalMinutes * 60 * 1000);

    const status = await checkApprovalStatus(request.requestId);

    if (status.status === 'APPROVED') {
      approved = true;
      await recordApprovalDecision(
        request.requestId,
        'APPROVED',
        status.approvedBy!,
        status.comment,
      );
    } else if (status.status === 'REJECTED') {
      rejected = true;
      await recordApprovalDecision(
        request.requestId,
        'REJECTED',
        status.approvedBy!,
        status.comment,
      );
    }

    elapsedMinutes += checkIntervalMinutes;
  }

  return {
    requestId: request.requestId,
    status: approved ? 'APPROVED' : rejected ? 'REJECTED' : 'TIMEOUT',
    escalationLevel: 0,
  };
}
