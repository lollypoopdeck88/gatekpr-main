import {
  baseStyles,
  headerStyles,
  contentStyles,
  buttonStyles,
} from "../emailStyling.ts";

export function getDocumentTemplate(data: any) {
  return {
    subject: `📄 New Document: ${data.name}`,
    html: `
      <div style="${baseStyles}">
        <div style="${headerStyles}">
          <h1 style="margin: 0; font-size: 28px;">📄 New Document Available</h1>
        </div>
        <div style="${contentStyles}">
          <h2 style="color: #1e40af; margin-top: 0;">${data.name}</h2>
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            A new document has been uploaded to your community portal.
          </p>
          <table style="width: 100%; margin: 20px 0;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Category:</td>
              <td style="padding: 8px 0; font-weight: 600;">${
                data.category
              }</td>
            </tr>
            ${
              data.description
                ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Description:</td>
                  <td style="padding: 8px 0;">${data.description}</td>
                </tr>
                `
                : ""
            }
          </table>
          <a href="${
            data.appUrl
          }/documents" style="${buttonStyles}">View Document</a>
        </div>
      </div>
    `,
  };
}
