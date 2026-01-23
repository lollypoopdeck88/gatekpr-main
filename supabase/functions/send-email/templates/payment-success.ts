import { baseStyles, contentStyles } from "../emailStyling.ts";

export function getPaymentSuccessTemplate(data: any) {
  return {
    subject: `✅ Payment Confirmed: $${data.amount.toFixed(2)}`,
    html: `
      <div style="${baseStyles}">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #4ade80 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">✅ Payment Successful!</h1>
        </div>
        <div style="${contentStyles}">
          <h2 style="color: #16a34a; margin-top: 0;">Thank You, ${
            data.residentName
          }!</h2>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Your payment has been successfully processed.
          </p>
          <table style="width: 100%; margin: 20px 0; background: #f0fdf4; border-radius: 8px; padding: 20px;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Description:</td>
              <td style="padding: 8px 0; font-weight: 600;">${
                data.paymentName
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Amount Paid:</td>
              <td style="padding: 8px 0; font-weight: 600; font-size: 20px; color: #16a34a;">$${data.amount.toFixed(
                2
              )}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Date:</td>
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
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Transaction ID:</td>
              <td style="padding: 8px 0; font-family: monospace; font-size: 12px;">${
                data.transactionId || "N/A"
              }</td>
            </tr>
          </table>
          <p style="font-size: 14px; color: #6b7280;">
            A receipt has been saved to your payment history.
          </p>
          <a href="${
            data.appUrl
          }/payments" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px;">View Payment History</a>
        </div>
      </div>
    `,
  };
}
