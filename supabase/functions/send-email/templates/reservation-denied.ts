import {
  baseStyles,
  headerStyles,
  contentStyles,
  buttonStyles,
} from "../emailStyling.ts";

export function getReservationDeniedTemplate(data: any) {
  return {
    subject: `Reservation Request Update`,
    html: `
      <div style="${baseStyles}">
        <div style="${headerStyles}">
          <h1 style="margin: 0; font-size: 28px;">Reservation Update</h1>
        </div>
        <div style="${contentStyles}">
          <h2 style="color: #374151; margin-top: 0;">Hi ${
            data.residentName
          },</h2>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Unfortunately, your reservation request for ${
              data.date
            } could not be approved at this time.
          </p>
          ${
            data.adminNotes
              ? `
              <div style="margin: 20px 0; padding: 15px; background: #f3f4f6; border-radius: 8px;">
                <strong>Reason:</strong> ${data.adminNotes}
              </div>
              `
              : ""
          }
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Please feel free to submit another reservation request for a different time.
          </p>
          <a href="${
            data.appUrl
          }/reservations" style="${buttonStyles}">Browse Available Times</a>
        </div>
      </div>
    `,
  };
}
