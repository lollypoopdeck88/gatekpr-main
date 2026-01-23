import {
  baseStyles,
  headerStyles,
  contentStyles,
  buttonStyles,
} from "../emailStyling.ts";
import { escapeHtml, sanitizeEmailContent } from "../utils.ts";

export function getAnnouncementTemplate(data: any) {
  return {
    subject: `📢 New Announcement: ${escapeHtml(data.title)}`,
    html: `
      <div style="${baseStyles}">
        <div style="${headerStyles}">
          <h1 style="margin: 0; font-size: 28px;">📢 New Announcement</h1>
        </div>
        <div style="${contentStyles}">
          <h2 style="color: #1e40af; margin-top: 0;">${escapeHtml(
            data.title
          )}</h2>
          <div style="font-size: 16px; color: #374151; line-height: 1.6;">
            ${sanitizeEmailContent(data.body, true)}
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="font-size: 14px; color: #6b7280;">
            Posted on ${new Date(data.publishedAt).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <a href="${
            data.appUrl
          }/announcements" style="${buttonStyles}">View in GateKpr</a>
        </div>
      </div>
    `,
  };
}
