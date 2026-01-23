import { supabase } from "@/integrations/supabase/client";

type EmailType = "invite" | "announcement" | "document" | "payment_reminder" | "join_request_approved" | "join_request_denied";

interface SendEmailParams {
  type: EmailType;
  to: string;
  data: Record<string, any>;
  hoaId?: string;
  recipientId?: string;
}

export async function sendEmail({ type, to, data, hoaId, recipientId }: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: response, error } = await supabase.functions.invoke("send-email", {
      body: { type, to, data, hoaId, recipientId },
    });

    if (error) {
      console.error("Email sending failed:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Email service error:", err);
    return { success: false, error: err.message };
  }
}

export async function sendInviteEmail(
  email: string,
  inviteToken: string,
  hoaName: string,
  address: string
): Promise<{ success: boolean; error?: string }> {
  const appUrl = window.location.origin;
  const inviteUrl = `${appUrl}/invite/${inviteToken}`;

  return sendEmail({
    type: "invite",
    to: email,
    data: { hoaName, address, inviteUrl },
  });
}

export async function sendAnnouncementEmail(
  recipientEmails: string[],
  title: string,
  body: string,
  publishedAt: string,
  hoaId?: string
): Promise<{ success: boolean; failedEmails: string[] }> {
  const appUrl = window.location.origin;
  const failedEmails: string[] = [];

  for (const email of recipientEmails) {
    const result = await sendEmail({
      type: "announcement",
      to: email,
      data: { title, body, publishedAt, appUrl },
      hoaId,
    });

    if (!result.success) {
      failedEmails.push(email);
    }
  }

  return { success: failedEmails.length === 0, failedEmails };
}

export async function sendDocumentEmail(
  recipientEmails: string[],
  name: string,
  category: string,
  description?: string,
  hoaId?: string
): Promise<{ success: boolean; failedEmails: string[] }> {
  const appUrl = window.location.origin;
  const failedEmails: string[] = [];

  for (const email of recipientEmails) {
    const result = await sendEmail({
      type: "document",
      to: email,
      data: { name, category, description, appUrl },
      hoaId,
    });

    if (!result.success) {
      failedEmails.push(email);
    }
  }

  return { success: failedEmails.length === 0, failedEmails };
}

export async function sendJoinRequestStatusEmail(
  email: string,
  approved: boolean,
  hoaName: string
): Promise<{ success: boolean; error?: string }> {
  const appUrl = window.location.origin;

  return sendEmail({
    type: approved ? "join_request_approved" : "join_request_denied",
    to: email,
    data: { hoaName, appUrl },
  });
}

export async function triggerPaymentReminders(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("send-payment-reminders");

    if (error) {
      console.error("Payment reminders failed:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Payment reminders error:", err);
    return { success: false, error: err.message };
  }
}
