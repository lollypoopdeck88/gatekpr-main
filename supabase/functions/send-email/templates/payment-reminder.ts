import { baseStyles, contentStyles } from "../emailStyling.ts";

export function getPaymentReminderTemplate(data: any) {
  return {
    subject: `⚠️ Payment Reminder: ${data.scheduleName}`,
    html: `
      <div style="${baseStyles}">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #f87171 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">⚠️ Payment Reminder</h1>
        </div>
        <div style="${contentStyles}">
          <h2 style="color: #dc2626; margin-top: 0;">Payment Due</h2>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            This is a reminder that you have an outstanding payment:
          </p>
          <table style="width: 100%; margin: 20px 0; background: #fef2f2; border-radius: 8px; padding: 20px;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Description:</td>
              <td style="padding: 8px 0; font-weight: 600;">${
                data.scheduleName
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Amount Due:</td>
              <td style="padding: 8px 0; font-weight: 600; font-size: 20px; color: #dc2626;">$${data.amount.toFixed(
                2
              )}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Due Date:</td>
              <td style="padding: 8px 0; font-weight: 600;">${new Date(
                data.dueDate
              ).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Days Overdue:</td>
              <td style="padding: 8px 0; font-weight: 600; color: #dc2626;">${
                data.daysOverdue
              } days</td>
            </tr>
          </table>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Please submit your payment as soon as possible to avoid any late fees.
          </p>
          <a href="${
            data.appUrl
          }/dashboard" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px;">Make Payment</a>
        </div>
      </div>
    `,
  };
}
