import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const HOA_ID = "11111111-1111-1111-1111-111111111111";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify caller is super admin (skip for service role or anonymous calls)
    const authHeader = req.headers.get("Authorization");

    if (
      authHeader &&
      !authHeader.includes("sb_publishable_EVOXHU3BSyoLVzAtyUl5Zg_ZynKt4BY")
    ) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      );
      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
        error: authError,
      } = await supabaseClient.auth.getUser(token);

      if (!authError && user) {
        const { data: isSuperAdmin } = await supabaseAdmin.rpc(
          "is_super_admin",
          {
            _user_id: user.id,
          }
        );

        if (!isSuperAdmin) {
          throw new Error("Only super admins can seed test data");
        }
      }
    }

    // For anonymous/service role calls, proceed (protected by verify_jwt = false in config)

    // Get test resident profile
    const { data: residentProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, user_id")
      .eq("email", "resident@gatekpr.test")
      .single();

    // Get test admin profile
    const { data: adminProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, user_id")
      .eq("email", "hoaadmin@gatekpr.test")
      .single();

    const residentProfileId = residentProfile?.id;
    const residentUserId = residentProfile?.user_id;
    const adminUserId = adminProfile?.user_id;

    const results: Record<string, { created: number; errors: string[] }> = {};

    // 1. Seed Announcements
    const announcements = [
      {
        hoa_id: HOA_ID,
        title: "Annual HOA Meeting - March 15th",
        body: "Dear Residents,\n\nPlease join us for our annual HOA meeting on March 15th at 7:00 PM in the community clubhouse. We will discuss the budget, upcoming projects, and elect new board members.\n\nRefreshments will be served. Please RSVP by March 10th.\n\nBest regards,\nThe HOA Board",
        author_id: adminUserId,
        published_at: new Date().toISOString(),
      },
      {
        hoa_id: HOA_ID,
        title: "Pool Opening for Summer Season",
        body: "The community pool will open for the summer season on May 1st! Pool hours will be 9 AM to 9 PM daily.\n\nReminder:\n- Pool passes are required\n- No glass containers\n- Children under 12 must be accompanied by an adult\n\nSee you at the pool!",
        author_id: adminUserId,
        published_at: new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
      },
      {
        hoa_id: HOA_ID,
        title: "Landscaping Schedule Update",
        body: "Our landscaping team will be working on the common areas next week. Please move any personal items from your patios to allow access.\n\nSchedule:\n- Monday-Tuesday: Front entrances\n- Wednesday-Thursday: Common greens\n- Friday: Tree trimming",
        author_id: adminUserId,
        published_at: new Date(
          Date.now() - 14 * 24 * 60 * 60 * 1000
        ).toISOString(),
      },
    ];

    const { error: announcementError } = await supabaseAdmin
      .from("announcements")
      .upsert(announcements, { onConflict: "id" });

    results.announcements = {
      created: announcementError ? 0 : announcements.length,
      errors: announcementError ? [announcementError.message] : [],
    };

    // 2. Seed Maintenance Requests
    if (residentProfileId) {
      const maintenanceRequests = [
        {
          hoa_id: HOA_ID,
          resident_id: residentProfileId,
          title: "Streetlight Out on Oak Lane",
          description:
            "The streetlight at 123 Oak Lane has been out for the past week. It makes the area very dark at night and is a safety concern.",
          category: "repair",
          urgency: "normal",
          status: "open",
          location: "123 Oak Lane",
        },
        {
          hoa_id: HOA_ID,
          resident_id: residentProfileId,
          title: "Pothole in Parking Lot",
          description:
            "There's a large pothole near parking spot #45 in the main lot. It's getting bigger and could damage vehicles.",
          category: "common_area",
          urgency: "high",
          status: "in_progress",
          location: "Main Parking Lot",
        },
        {
          hoa_id: HOA_ID,
          resident_id: residentProfileId,
          title: "Broken Sprinkler Head",
          description:
            "A sprinkler head near the playground is broken and spraying water onto the sidewalk, creating a slip hazard.",
          category: "landscaping",
          urgency: "low",
          status: "resolved",
          location: "Community Playground",
          resolved_at: new Date().toISOString(),
        },
      ];

      const { error: maintenanceError } = await supabaseAdmin
        .from("maintenance_requests")
        .upsert(maintenanceRequests, { onConflict: "id" });

      results.maintenance_requests = {
        created: maintenanceError ? 0 : maintenanceRequests.length,
        errors: maintenanceError ? [maintenanceError.message] : [],
      };
    } else {
      results.maintenance_requests = {
        created: 0,
        errors: ["No resident profile found"],
      };
    }

    // 3. Seed Payment Schedule
    const paymentSchedule = {
      hoa_id: HOA_ID,
      name: "Monthly HOA Dues",
      description: "Monthly homeowner association dues",
      amount: 15000, // $150.00 in cents
      frequency: "monthly",
      due_day: 1,
      is_active: true,
    };

    const { data: schedule, error: scheduleError } = await supabaseAdmin
      .from("payment_schedules")
      .upsert(paymentSchedule, { onConflict: "id" })
      .select()
      .single();

    results.payment_schedules = {
      created: scheduleError ? 0 : 1,
      errors: scheduleError ? [scheduleError.message] : [],
    };

    // 4. Seed Payment Requests (uses auth.users id, not profiles.id)
    if (residentUserId && schedule) {
      const now = new Date();
      const paymentRequests = [
        {
          resident_id: residentUserId,
          schedule_id: schedule.id,
          amount: 15000,
          due_date: new Date(now.getFullYear(), now.getMonth(), 1)
            .toISOString()
            .split("T")[0],
          status: "paid",
        },
        {
          resident_id: residentUserId,
          schedule_id: schedule.id,
          amount: 15000,
          due_date: new Date(now.getFullYear(), now.getMonth() + 1, 1)
            .toISOString()
            .split("T")[0],
          status: "pending",
        },
        {
          resident_id: residentUserId,
          schedule_id: schedule.id,
          amount: 15000,
          due_date: new Date(now.getFullYear(), now.getMonth() + 2, 1)
            .toISOString()
            .split("T")[0],
          status: "pending",
        },
      ];

      const { error: requestError } = await supabaseAdmin
        .from("payment_requests")
        .upsert(paymentRequests, { onConflict: "id" });

      results.payment_requests = {
        created: requestError ? 0 : paymentRequests.length,
        errors: requestError ? [requestError.message] : [],
      };
    } else {
      results.payment_requests = {
        created: 0,
        errors: ["Missing resident or schedule"],
      };
    }

    // 5. Seed Community Spaces
    const communitySpaces = [
      {
        hoa_id: HOA_ID,
        name: "Community Clubhouse",
        description:
          "Large community room with kitchen facilities, perfect for parties and meetings.",
        capacity: 100,
        location_notes: "Located at the main entrance, building A",
        pricing_info: "$50 deposit, $25/hour",
        is_active: true,
      },
      {
        hoa_id: HOA_ID,
        name: "Pool Area",
        description: "Olympic-sized pool with lounge chairs and cabanas.",
        capacity: 50,
        location_notes: "Behind building C",
        pricing_info: "Free for residents, $10/guest",
        is_active: true,
      },
      {
        hoa_id: HOA_ID,
        name: "Tennis Courts",
        description:
          "Two well-maintained tennis courts with lighting for evening play.",
        capacity: 8,
        location_notes: "Near the south entrance",
        pricing_info: "Free, reserve 24 hours in advance",
        is_active: true,
      },
    ];

    const { data: spaces, error: spacesError } = await supabaseAdmin
      .from("community_spaces")
      .upsert(communitySpaces, { onConflict: "id" })
      .select();

    results.community_spaces = {
      created: spacesError ? 0 : communitySpaces.length,
      errors: spacesError ? [spacesError.message] : [],
    };

    // 6. Seed Reservations
    if (residentProfileId && spaces && spaces.length > 0) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const reservations = [
        {
          space_id: spaces[0].id, // Clubhouse
          resident_id: residentProfileId,
          reservation_date: tomorrow.toISOString().split("T")[0],
          start_time: "14:00",
          end_time: "18:00",
          purpose: "Birthday party for my son",
          status: "approved",
          reviewed_at: new Date().toISOString(),
        },
        {
          space_id: spaces[2].id, // Tennis Courts
          resident_id: residentProfileId,
          reservation_date: nextWeek.toISOString().split("T")[0],
          start_time: "10:00",
          end_time: "12:00",
          purpose: "Tennis match with neighbors",
          status: "pending",
        },
      ];

      const { error: reservationError } = await supabaseAdmin
        .from("space_reservations")
        .upsert(reservations, { onConflict: "id" });

      results.reservations = {
        created: reservationError ? 0 : reservations.length,
        errors: reservationError ? [reservationError.message] : [],
      };
    } else {
      results.reservations = {
        created: 0,
        errors: ["Missing resident or spaces"],
      };
    }

    // 7. Seed Documents
    const documents = [
      {
        hoa_id: HOA_ID,
        name: "HOA Bylaws 2025",
        category: "Bylaws",
        description: "Official HOA bylaws and regulations",
        file_url: "https://example.com/bylaws.pdf",
        file_type: "application/pdf",
        file_size: 245000,
        uploaded_by: adminUserId,
      },
      {
        hoa_id: HOA_ID,
        name: "Architectural Guidelines",
        category: "Rules",
        description: "Guidelines for exterior modifications and landscaping",
        file_url: "https://example.com/guidelines.pdf",
        file_type: "application/pdf",
        file_size: 189000,
        uploaded_by: adminUserId,
      },
      {
        hoa_id: HOA_ID,
        name: "January Board Meeting Minutes",
        category: "Minutes",
        description: "Minutes from the January 2025 board meeting",
        file_url: "https://example.com/minutes-jan.pdf",
        file_type: "application/pdf",
        file_size: 156000,
        uploaded_by: adminUserId,
      },
    ];

    const { error: documentsError } = await supabaseAdmin
      .from("documents")
      .upsert(documents, { onConflict: "id" });

    results.documents = {
      created: documentsError ? 0 : documents.length,
      errors: documentsError ? [documentsError.message] : [],
    };

    const totalCreated = Object.values(results).reduce(
      (sum, r) => sum + r.created,
      0
    );
    const totalErrors = Object.values(results).reduce(
      (sum, r) => sum + r.errors.length,
      0
    );

    return new Response(
      JSON.stringify({
        message: "Test data seeded",
        summary: { totalCreated, totalErrors },
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error seeding test data:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
