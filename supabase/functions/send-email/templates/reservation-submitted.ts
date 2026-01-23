import {
  baseStyles,
  headerStyles,
  contentStyles,
  buttonStyles,
} from "../emailStyling.ts";

export function getReservationSubmittedTemplate(data: any) {
  return {
    subject: `📅 Reservation Request Received`,
    html: `
      <div style="${baseStyles}">
        <div style="${headerStyles}">
          <h1 style="margin: 0; font-size: 28px;">📅 Reservation Submitted</h1>
        </div>
        <div style="${contentStyles}">
          <h2 style="color: #1e40af; margin-top: 0;">Hi ${
            data.residentName
          },</h2>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Your reservation request has been submitted and is pending approval.
          </p>
          <table style="width: 100%; margin: 20px 0; background: #f3f4f6; border-radius: 8px; padding: 20px;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Space:</td>
              <td style="padding: 8px 0; font-weight: 600;">${
                data.spaceName
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Date:</td>
              <td style="padding: 8px 0; font-weight: 600;">${data.date}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Time:</td>
              <td style="padding: 8px 0; font-weight: 600;">${
                data.startTime
              } - ${data.endTime}</td>
            </tr>
            ${
              data.purpose
                ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Purpose:</td>
                  <td style="padding: 8px 0;">${data.purpose}</td>
                </tr>
                `
                : ""
            }
          </table>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            We'll notify you once your request has been reviewed.
          </p>
          <a href="${
            data.appUrl
          }/reservations" style="${buttonStyles}">View Reservations</a>
        </div>
      </div>
    `,
  };
}
