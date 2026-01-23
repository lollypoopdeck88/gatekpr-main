import {
  baseStyles,
  headerStyles,
  contentStyles,
  buttonStyles,
} from "../emailStyling.ts";

export function getPaymentDueTemplate(data: any) {
  return {
    subject: `📋 Upcoming Payment: ${data.paymentName}`,
    html: `
      <div style="${baseStyles}">
        <div style="${headerStyles}">
          <h1 style="margin: 0; font-size: 28px;">📋 Upcoming Payment</h1>
        </div>
        <div style="${contentStyles}">
          <h2 style="color: #1e40af; margin-top: 0;">Hi ${
            data.residentName
          },</h2>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            You have an upcoming payment due soon:
          </p>
          <table style="width: 100%; margin: 20px 0; background: #eff6ff; border-radius: 8px; padding: 20px;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Description:</td>
              <td style="padding: 8px 0; font-weight: 600;">${
                data.paymentName
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Amount Due:</td>
              <td style="padding: 8px 0; font-weight: 600; font-size: 20px; color: #1e40af;">$${data.amount.toFixed(
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
          </table>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Pay now to avoid late fees and keep your account in good standing.
          </p>
          <a href="${data.appUrl}/dashboard" style="${buttonStyles}">Pay Now</a>
        </div>
      </div>
    `,
  };
}
