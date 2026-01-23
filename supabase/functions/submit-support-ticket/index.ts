import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPPORT_EMAIL = 'support@gatekpr.com';

// HTML escape function to prevent XSS attacks in email content
function escapeHtml(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, subject, description, userEmail, userName, hoaId } = await req.json();

    console.log('Received support ticket:', { type, subject, userEmail, userName, hoaId });

    if (!type || !subject || !description) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format the email content with escaped user inputs
    const ticketTypeLabels: Record<string, string> = {
      bug: '🐛 Bug Report',
      question: '❓ Question',
      feature: '💡 Feature Request',
      billing: '💳 Billing Issue',
      other: '📝 Other',
    };

    // Escape all user-provided content to prevent XSS
    const safeSubject = escapeHtml(subject);
    const safeDescription = escapeHtml(description);
    const safeUserName = escapeHtml(userName);
    const safeUserEmail = escapeHtml(userEmail);
    const safeHoaId = escapeHtml(hoaId);
    const safeType = escapeHtml(type);

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Support Ticket</h2>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold; width: 120px;">Type:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${ticketTypeLabels[type] || safeType}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Subject:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${safeSubject}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">From:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${safeUserName || 'Unknown'} (${safeUserEmail || 'No email'})</td>
          </tr>
          ${hoaId ? `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">HOA ID:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${safeHoaId}</td>
          </tr>
          ` : ''}
        </table>
        
        <h3 style="color: #374151;">Description:</h3>
        <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; white-space: pre-wrap;">${safeDescription}</div>
        
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
        <p style="color: #6b7280; font-size: 12px;">
          This ticket was submitted via GateKpr at ${new Date().toISOString()}
        </p>
      </div>
    `;

    // Send email via Resend if API key is available
    if (RESEND_API_KEY) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'GateKpr Support <noreply@gatekpr.com>',
          to: [SUPPORT_EMAIL],
          reply_to: userEmail,
          subject: `[${type.toUpperCase()}] ${subject}`,
          html: emailHtml,
        }),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error('Resend API error:', errorText);
        // Don't fail the request - we still want to log the ticket
      } else {
        console.log('Support ticket email sent successfully');
      }
    } else {
      console.log('RESEND_API_KEY not configured - ticket logged but not emailed');
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Support ticket submitted' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing support ticket:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process support ticket' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});