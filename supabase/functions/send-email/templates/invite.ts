import {
  baseStyles,
  headerStyles,
  contentStyles,
  buttonStyles,
} from "../emailStyling.ts";
import { escapeHtml } from "../utils.ts";

export function getInviteTemplate(data: any) {
  return {
    subject: `You're invited to join ${escapeHtml(data.hoaName)} on GateKpr`,
    html: `
      <div style="${baseStyles}">
        <div style="${headerStyles}">
          <h1 style="margin: 0; font-size: 28px;">🏡 Welcome to GateKpr</h1>
        </div>
        <div style="${contentStyles}">
          <h2 style="color: #1e40af; margin-top: 0;">You've Been Invited!</h2>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            You've been invited to join <strong>${escapeHtml(
              data.hoaName
            )}</strong> as a resident on GateKpr, your community's management platform.
          </p>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            <strong>Your Property:</strong><br/>
            ${escapeHtml(data.address)}
          </p>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Click the button below to create your account and get started:
          </p>
          <a href="${encodeURI(
            data.inviteUrl || ""
          )}" style="${buttonStyles}">Accept Invitation</a>
          <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
            This invitation expires in 7 days. If you have questions, contact your HOA administrator.
          </p>
        </div>
      </div>
    `,
  };
}
