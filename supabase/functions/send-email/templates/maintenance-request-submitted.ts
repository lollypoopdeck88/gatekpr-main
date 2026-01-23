import {
  baseStyles,
  headerStyles,
  contentStyles,
  buttonStyles,
} from "../emailStyling.ts";

export function getMaintenanceRequestSubmittedTemplate(data: any) {
  return {
    subject: `🔧 Maintenance Request Received: ${data.title}`,
    html: `
      <div style="${baseStyles}">
        <div style="${headerStyles}">
          <h1 style="margin: 0; font-size: 28px;">🔧 Request Received</h1>
        </div>
        <div style="${contentStyles}">
          <h2 style="color: #1e40af; margin-top: 0;">Hi ${data.residentName},</h2>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Your maintenance request has been submitted and is awaiting review.
          </p>
          <table style="width: 100%; margin: 20px 0; background: #f3f4f6; border-radius: 8px; padding: 20px;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Title:</td>
              <td style="padding: 8px 0; font-weight: 600;">${data.title}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Category:</td>
              <td style="padding: 8px 0; font-weight: 600;">${data.category}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Urgency:</td>
              <td style="padding: 8px 0; font-weight: 600; text-transform: capitalize;">${data.urgency}</td>
            </tr>
          </table>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            We'll notify you when there are updates to your request.
          </p>
          <a href="${data.appUrl}/maintenance" style="${buttonStyles}">View Request</a>
        </div>
      </div>
    `,
  };
}
