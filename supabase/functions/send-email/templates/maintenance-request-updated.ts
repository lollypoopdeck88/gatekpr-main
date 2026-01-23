import {
  baseStyles,
  headerStyles,
  contentStyles,
  buttonStyles,
} from "../emailStyling.ts";

export function getMaintenanceRequestUpdatedTemplate(data: any) {
  return {
    subject: `🔧 Update on Your Request: ${data.title}`,
    html: `
      <div style="${baseStyles}">
        <div style="${headerStyles}">
          <h1 style="margin: 0; font-size: 28px;">🔧 Request Update</h1>
        </div>
        <div style="${contentStyles}">
          <h2 style="color: #1e40af; margin-top: 0;">Hi ${
            data.residentName
          },</h2>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            There's an update on your maintenance request: <strong>${
              data.title
            }</strong>
          </p>
          ${
            data.newStatus
              ? `
              <div style="margin: 20px 0; padding: 15px; background: #dbeafe; border-radius: 8px;">
                <strong>Status changed:</strong> ${data.oldStatus} → ${data.newStatus}
              </div>
              `
              : ""
          }
          ${
            data.message
              ? `
              <div style="margin: 20px 0; padding: 15px; background: #f3f4f6; border-radius: 8px;">
                <strong>Message from staff:</strong><br/>
                ${data.message}
              </div>
              `
              : ""
          }
          <a href="${
            data.appUrl
          }/maintenance" style="${buttonStyles}">View Details</a>
        </div>
      </div>
    `,
  };
}
