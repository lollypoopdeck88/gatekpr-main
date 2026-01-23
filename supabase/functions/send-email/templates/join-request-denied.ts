import { baseStyles, headerStyles, contentStyles } from "../emailStyling.ts";

export function getJoinRequestDeniedTemplate(data: any) {
  return {
    subject: `Your GateKpr Request Status`,
    html: `
      <div style="${baseStyles}">
        <div style="${headerStyles}">
          <h1 style="margin: 0; font-size: 28px;">Request Update</h1>
        </div>
        <div style="${contentStyles}">
          <h2 style="color: #374151; margin-top: 0;">Request Not Approved</h2>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Unfortunately, your request to join ${data.hoaName} was not approved at this time.
          </p>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            If you believe this was a mistake or have questions, please contact your HOA administrator directly.
          </p>
        </div>
      </div>
    `,
  };
}
