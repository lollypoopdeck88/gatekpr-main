import { baseStyles, contentStyles } from "../emailStyling.ts";

export function getReservationApprovedTemplate(data: any) {
  return {
    subject: `✅ Reservation Approved: ${data.date}`,
    html: `
      <div style="${baseStyles}">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #4ade80 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">✅ Reservation Approved!</h1>
        </div>
        <div style="${contentStyles}">
          <h2 style="color: #16a34a; margin-top: 0;">Great news, ${
            data.residentName
          }!</h2>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Your reservation has been approved.
          </p>
          <table style="width: 100%; margin: 20px 0; background: #f0fdf4; border-radius: 8px; padding: 20px;">
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
          </table>
          ${
            data.adminNotes
              ? `
              <div style="margin: 20px 0; padding: 15px; background: #f3f4f6; border-radius: 8px;">
                <strong>Note from admin:</strong> ${data.adminNotes}
              </div>
              `
              : ""
          }
          <a href="${
            data.appUrl
          }/reservations" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px;">View Reservation</a>
        </div>
      </div>
    `,
  };
}
