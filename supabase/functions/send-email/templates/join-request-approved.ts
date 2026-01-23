import { baseStyles, contentStyles } from "../emailStyling.ts";

export function getJoinRequestApprovedTemplate(data: any) {
  return {
    subject: `✅ Your GateKpr Request Has Been Approved!`,
    html: `
      <div style="${baseStyles}">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #4ade80 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">✅ Request Approved!</h1>
        </div>
        <div style="${contentStyles}">
          <h2 style="color: #16a34a; margin-top: 0;">Welcome to ${data.hoaName}!</h2>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Great news! Your request to join has been approved. You now have full access to your community portal.
          </p>
          <a href="${data.appUrl}/dashboard" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px;">Go to Dashboard</a>
        </div>
      </div>
    `,
  };
}
