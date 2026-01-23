import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Profile, AppRole, HOA } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

interface SpoofedUser {
  profile: Profile;
  role: AppRole;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  isLoading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  // For super_admin HOA switching
  selectedHoaId: string | null;
  setSelectedHoaId: (id: string | null) => void;
  effectiveHoaId: string | null; // The HOA to use for queries
  currentHoa: HOA | null; // Current HOA data
  // Spoofing functionality
  spoofedUser: SpoofedUser | null;
  startSpoof: (profile: Profile) => Promise<void>;
  stopSpoof: () => void;
  isSpoofing: boolean;
  // The effective profile/role to use (spoofed or real)
  effectiveProfile: Profile | null;
  effectiveRole: AppRole | null;
  signUp: (
    email: string,
    password: string,
    name: string
  ) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedHoaId, setSelectedHoaId] = useState<string | null>(null);
  const [spoofedUser, setSpoofedUser] = useState<SpoofedUser | null>(null);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    setProfile(data as Profile | null);
  };

  const fetchRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    setRole((data?.role as AppRole) || "resident");
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Use setTimeout to avoid potential race conditions
        setTimeout(() => {
          fetchProfile(session.user.id);
          fetchRole(session.user.id);
        }, 0);
      } else {
        setProfile(null);
        setRole(null);
        setSelectedHoaId(null);
        setSpoofedUser(null);
      }
      setIsLoading(false);
    });

    // THEN get the initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchRole(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) return { error };

      // Create profile after signup (without HOA - user must request to join or use invite)
      if (data.user) {
        // Create the profile without HOA assignment
        await supabase.from("profiles").insert({
          user_id: data.user.id,
          hoa_id: null, // User must request to join or use invite link
          name,
          email,
          status: "pending",
        });

        // Assign resident role by default
        await supabase.from("user_roles").insert({
          user_id: data.user.id,
          role: "resident",
        });
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    setSelectedHoaId(null);
    setSpoofedUser(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  // Spoofing functions - audit logging done via callback
  const startSpoof = async (targetProfile: Profile) => {
    // Fetch the target user's role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", targetProfile.user_id)
      .maybeSingle();

    const targetRole = (roleData?.role as AppRole) || "resident";

    setSpoofedUser({
      profile: targetProfile,
      role: targetRole,
    });

    // If spoofing a user with an HOA, set that as the selected HOA
    if (targetProfile.hoa_id) {
      setSelectedHoaId(targetProfile.hoa_id);
    }

    // Log the spoof action
    if (user) {
      await supabase.from("audit_logs").insert({
        actor_id: user.id,
        action: "user_spoofed",
        entity_type: "session",
        entity_id: targetProfile.user_id,
        details: {
          spoofed_user_name: targetProfile.name,
          spoofed_user_email: targetProfile.email,
        },
      });
    }
  };

  const stopSpoof = async () => {
    const previousSpoofed = spoofedUser;
    setSpoofedUser(null);
    setSelectedHoaId(null);

    // Log the spoof end action
    if (user && previousSpoofed) {
      await supabase.from("audit_logs").insert({
        actor_id: user.id,
        action: "spoof_ended",
        entity_type: "session",
        entity_id: previousSpoofed.profile.user_id,
        details: {
          spoofed_user_name: previousSpoofed.profile.name,
        },
      });
    }
  };

  const isSuperAdmin = role === "super_admin";
  const isAdmin = role === "admin" || role === "super_admin";
  const isSpoofing = spoofedUser !== null;

  // Effective values when spoofing
  const effectiveProfile = isSpoofing ? spoofedUser.profile : profile;
  const effectiveRole = isSpoofing ? spoofedUser.role : role;

  // For super_admin, use selectedHoaId; for others, use their profile's hoa_id
  // When spoofing, use the spoofed user's HOA
  const effectiveHoaId = isSpoofing
    ? spoofedUser.profile.hoa_id
    : isSuperAdmin
    ? selectedHoaId
    : profile?.hoa_id || null;

  // Query for current HOA data
  const { data: currentHoa } = useQuery({
    queryKey: ["current-hoa", effectiveHoaId],
    queryFn: async () => {
      if (!effectiveHoaId) return null;
      const { data, error } = await supabase
        .from("hoas")
        .select(
          "id, name, address, welcome_message, settings, created_at, updated_at"
        )
        .eq("id", effectiveHoaId)
        .single();
      if (error) throw error;
      return data as HOA;
    },
    enabled: !!effectiveHoaId,
  });

  const value = {
    user,
    session,
    profile,
    role,
    isLoading,
    isAdmin,
    isSuperAdmin,
    selectedHoaId,
    setSelectedHoaId,
    effectiveHoaId,
    currentHoa: currentHoa || null,
    spoofedUser,
    startSpoof,
    stopSpoof,
    isSpoofing,
    effectiveProfile,
    effectiveRole,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
