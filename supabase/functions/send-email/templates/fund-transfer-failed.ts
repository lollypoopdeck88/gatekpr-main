import { baseStyles, contentStyles } from "../emailStyling.ts";
import { escapeHtml } from "../utils.ts";

export function getFundTransferFailedTemplate(data: any) {
  return {
    subject: `⚠️ Fund Transfer Issue: Action Required`,
    html: `
      <div style="${baseStyles}">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #f87171 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">⚠️ Transfer Failed</h1>
        </div>
        <div style="${contentStyles}">
          <h2 style="color: #dc2626; margin-top: 0;">${escapeHtml(
            data.hoaName
          )}</h2>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Unfortunately, a fund transfer to your connected bank account has failed.
          </p>
          <table style="width: 100%; margin: 20px 0; background: #fef2f2; border-radius: 8px; padding: 20px;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Amount:</td>
              <td style="padding: 8px 0; font-weight: 600; font-size: 24px; color: #dc2626;">$${data.amount.toFixed(
                2
              )}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Failure Reason:</td>
              <td style="padding: 8px 0; font-weight: 600; color: #dc2626;">${escapeHtml(
                data.failureReason
              )}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Attempted On:</td>
              <td style="padding: 8px 0; font-weight: 600;">${new Date().toLocaleDateString(
                "en-US",
                {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }
              )}</td>
            </tr>
          </table>
          <div style="margin: 20px 0; padding: 15px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <strong style="color: #92400e;">What to do next:</strong>
            <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #92400e;">
              <li>Verify your bank account details are correct</li>
              <li>Ensure your Stripe Connect account is fully verified</li>
              <li>Check that your bank accepts transfers from payment processors</li>
              <li>Contact support if the issue persists</li>
            </ul>
          </div>
          <p style="font-size: 14px; color: #6b7280;">
            Our team has been notified and the transfer will be retried automatically. If the problem continues, please contact support.
          </p>
          <a href="${
            data.appUrl
          }/admin/settings" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px;">Check Account Settings</a>
        </div>
      </div>
    `,
  };
}
