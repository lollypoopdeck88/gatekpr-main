import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

type AuditAction =
  | "hoa_created"
  | "role_changed"
  | "subscription_created"
  | "subscription_updated"
  | "user_spoofed"
  | "spoof_ended";

type EntityType = "hoa" | "user" | "subscription" | "session";

interface AuditLogParams {
  action: AuditAction;
  entityType: EntityType;
  entityId?: string;
  details?: Record<string, any>;
}

export function useAuditLog() {
  const { user, profile } = useAuth();

  const logAction = async ({
    action,
    entityType,
    entityId,
    details,
  }: AuditLogParams) => {
    if (!user) {
      console.warn("Audit log attempted without authenticated user");
      return;
    }

    try {
      const { error } = await supabase.from("audit_logs").insert({
        actor_id: user.id,
        actor_name: profile?.name || "Unknown",
        actor_email: profile?.email || user.email || "Unknown",
        action,
        entity_type: entityType,
        entity_id: entityId || null,
        details: details || null,
      });

      if (error) {
        console.error("Failed to create audit log:", error);
      }
    } catch (err) {
      console.error("Audit log error:", err);
    }
  };

  return { logAction };
}
