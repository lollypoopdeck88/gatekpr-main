import { baseStyles, contentStyles } from "../emailStyling.ts";
import { escapeHtml } from "../utils.ts";

export function getFundTransferCompleteTemplate(data: any) {
  return {
    subject: `💰 Fund Transfer Complete: $${data.totalAmount.toFixed(2)}`,
    html: `
      <div style="${baseStyles}">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #4ade80 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">💰 Funds Transferred!</h1>
        </div>
        <div style="${contentStyles}">
          <h2 style="color: #16a34a; margin-top: 0;">${escapeHtml(
            data.hoaName
          )}</h2>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Great news! Funds have been transferred to your connected bank account.
          </p>
          <table style="width: 100%; margin: 20px 0; background: #f0fdf4; border-radius: 8px; padding: 20px;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Total Amount:</td>
              <td style="padding: 8px 0; font-weight: 600; font-size: 24px; color: #16a34a;">$${data.totalAmount.toFixed(
                2
              )}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Payments Included:</td>
              <td style="padding: 8px 0; font-weight: 600;">${
                data.transferCount
              } payment${data.transferCount > 1 ? "s" : ""}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Transfer Date:</td>
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
          <p style="font-size: 14px; color: #6b7280;">
            Funds typically arrive in your bank account within 1-2 business days.
          </p>
          <a href="${
            data.appUrl
          }/admin/settings" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px;">View in Dashboard</a>
        </div>
      </div>
    `,
  };
}
