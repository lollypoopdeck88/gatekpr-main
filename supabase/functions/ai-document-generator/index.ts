import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface ViolationNoticeRequest {
  type: "violation_notice";
  violationType: string;
  location: string;
  observedAt: string;
  description: string;
  residentName: string;
  bylawsContext?: string;
}

interface MeetingMinutesRequest {
  type: "meeting_minutes";
  rawNotes: string;
  meetingDate: string;
  attendees?: string[];
}

interface BylawsRecommendationRequest {
  type: "bylaws_recommendation";
  currentBylaws: string;
  concernArea?: string;
}

interface InquiryResponseRequest {
  type: "inquiry_response";
  residentMessage: string;
  context?: string;
}

type DocumentRequest = 
  | ViolationNoticeRequest 
  | MeetingMinutesRequest 
  | BylawsRecommendationRequest
  | InquiryResponseRequest;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("User not authenticated");
    }

    // Use service role for admin checks
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if user is admin
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    const { data: isSuperAdmin } = await supabaseAdmin.rpc("is_super_admin", {
      _user_id: user.id,
    });

    if (!isAdmin && !isSuperAdmin) {
      throw new Error("Only admins can use the document generator");
    }

    const body: DocumentRequest = await req.json();
    let systemPrompt = "";
    let userPrompt = "";

    switch (body.type) {
      case "violation_notice":
        systemPrompt = `You are an HOA document assistant that generates professional violation notices. 
Your notices should be:
- Professional and respectful in tone
- Clear about the violation and its location
- Reference relevant HOA rules/bylaws when provided
- Include next steps for the resident
- Be firm but fair

IMPORTANT: Always include this disclaimer at the end:
"---
DISCLAIMER: This notice was generated with AI assistance. The content should be reviewed and approved by HOA administration before sending. This is not legal advice."`;

        userPrompt = `Generate a violation notice for the following:

Resident Name: ${body.residentName}
Violation Type: ${body.violationType}
Location: ${body.location}
Date/Time Observed: ${body.observedAt}
Description: ${body.description}

${body.bylawsContext ? `Relevant HOA Rules/Bylaws:\n${body.bylawsContext}` : ""}

Please generate a formal violation notice letter that:
1. States the violation clearly
2. References the specific rule violated (if bylaws provided)
3. Explains what corrective action is needed
4. Provides a reasonable timeframe for compliance
5. Mentions consequences of non-compliance
6. Offers contact information for questions`;
        break;

      case "meeting_minutes":
        systemPrompt = `You are an HOA document assistant that formats meeting minutes professionally.
Your minutes should be:
- Well-organized with clear sections
- Include date, attendees, and key discussion points
- Summarize decisions made and action items
- Be objective and accurate
- Follow standard meeting minutes format`;

        userPrompt = `Please format these raw meeting notes into professional meeting minutes:

Meeting Date: ${body.meetingDate}
${body.attendees ? `Attendees: ${body.attendees.join(", ")}` : ""}

Raw Notes:
${body.rawNotes}

Please organize this into proper meeting minutes with:
1. Call to Order
2. Attendance
3. Approval of Previous Minutes (if mentioned)
4. Reports (if any)
5. Old Business
6. New Business
7. Discussion Items
8. Action Items (with assignees if mentioned)
9. Next Meeting Date (if mentioned)
10. Adjournment`;
        break;

      case "bylaws_recommendation":
        systemPrompt = `You are an HOA governance consultant that provides recommendations for bylaw improvements.
Your recommendations should be:
- Based on HOA best practices
- Consider legal compliance (while noting you're not providing legal advice)
- Be practical and implementable
- Reference industry standards
- Consider member rights and community needs

IMPORTANT: Always include this disclaimer:
"---
DISCLAIMER: These recommendations are generated with AI assistance and should be reviewed by legal counsel before adoption. This is not legal advice."`;

        userPrompt = `Please review the following HOA bylaws and provide recommendations for improvement:

${body.concernArea ? `Focus Area: ${body.concernArea}\n\n` : ""}
Current Bylaws:
${body.currentBylaws}

Please provide:
1. Summary of current bylaw strengths
2. Areas that may need updating
3. Specific recommendations with rationale
4. Suggested language changes (if applicable)
5. Industry best practices to consider`;
        break;

      case "inquiry_response":
        systemPrompt = `You are an HOA communication assistant that helps draft professional responses to resident inquiries.
Your responses should be:
- Professional and courteous
- Helpful and informative
- Reference relevant HOA rules when applicable
- Offer to connect with appropriate personnel
- Be empathetic when addressing concerns`;

        userPrompt = `Please draft a professional response to this resident inquiry:

Resident Message:
${body.residentMessage}

${body.context ? `Additional Context:\n${body.context}` : ""}

Please draft a response that:
1. Acknowledges their inquiry
2. Addresses their question/concern
3. Provides relevant information
4. Offers next steps if applicable
5. Maintains a professional and friendly tone`;
        break;

      default:
        throw new Error("Invalid document type");
    }

    // Call Lovable AI Gateway
    const aiResponse = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", errorText);
      throw new Error("Failed to generate document");
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices?.[0]?.message?.content;

    if (!generatedContent) {
      throw new Error("No content generated");
    }

    // Get user's HOA ID
    const { data: hoaId } = await supabaseAdmin.rpc("get_user_hoa_id", {
      _user_id: user.id,
    });

    // Log the AI request for audit trail
    await supabaseAdmin.from("ai_document_requests").insert({
      hoa_id: hoaId,
      request_type: body.type,
      input_context: body,
      generated_content: generatedContent,
      created_by: user.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        content: generatedContent,
        disclaimer: "This content was generated with AI assistance. Please review carefully before use.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in AI document generator:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
