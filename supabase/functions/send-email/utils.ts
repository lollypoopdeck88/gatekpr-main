// Import all email templates
import { getInviteTemplate } from "./templates/invite.ts";
import { getAnnouncementTemplate } from "./templates/announcement.ts";
import { getDocumentTemplate } from "./templates/document.ts";
import { getPaymentReminderTemplate } from "./templates/payment-reminder.ts";
import { getPaymentSuccessTemplate } from "./templates/payment-success.ts";
import { getPaymentDueTemplate } from "./templates/payment-due.ts";
import { getJoinRequestApprovedTemplate } from "./templates/join-request-approved.ts";
import { getJoinRequestDeniedTemplate } from "./templates/join-request-denied.ts";
import { getMaintenanceRequestSubmittedTemplate } from "./templates/maintenance-request-submitted.ts";
import { getMaintenanceRequestUpdatedTemplate } from "./templates/maintenance-request-updated.ts";
import { getReservationSubmittedTemplate } from "./templates/reservation-submitted.ts";
import { getReservationApprovedTemplate } from "./templates/reservation-approved.ts";
import { getReservationDeniedTemplate } from "./templates/reservation-denied.ts";
import { getFundTransferCompleteTemplate } from "./templates/fund-transfer-complete.ts";
import { getFundTransferFailedTemplate } from "./templates/fund-transfer-failed.ts";

// HTML sanitization helper - escapes HTML special characters to prevent XSS
export function escapeHtml(unsafe: string | null | undefined): string {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Sanitize for email content - allows basic line breaks but escapes HTML
export function sanitizeEmailContent(
  content: string | null | undefined,
  preserveLineBreaks = false
): string {
  if (!content) return "";
  const escaped = escapeHtml(content);
  if (preserveLineBreaks) {
    return escaped.replace(/\n/g, "<br>");
  }
  return escaped;
}

export const getEmailContent = (type: string, data: Record<string, any>) => {
  switch (type) {
    case "invite":
      return getInviteTemplate(data);
    case "announcement":
      return getAnnouncementTemplate(data);
    case "document":
      return getDocumentTemplate(data);
    case "payment_reminder":
      return getPaymentReminderTemplate(data);
    case "payment_success":
      return getPaymentSuccessTemplate(data);
    case "payment_due":
      return getPaymentDueTemplate(data);
    case "join_request_approved":
      return getJoinRequestApprovedTemplate(data);
    case "join_request_denied":
      return getJoinRequestDeniedTemplate(data);
    case "maintenance_request_submitted":
      return getMaintenanceRequestSubmittedTemplate(data);
    case "maintenance_request_updated":
      return getMaintenanceRequestUpdatedTemplate(data);
    case "reservation_submitted":
      return getReservationSubmittedTemplate(data);
    case "reservation_approved":
      return getReservationApprovedTemplate(data);
    case "reservation_denied":
      return getReservationDeniedTemplate(data);
    case "fund_transfer_complete":
      return getFundTransferCompleteTemplate(data);
    case "fund_transfer_failed":
      return getFundTransferFailedTemplate(data);
    default:
      throw new Error(`Unknown email type: ${type}`);
  }
};
