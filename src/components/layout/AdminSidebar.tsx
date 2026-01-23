import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  CreditCard,
  Bell,
  FileText,
  Users,
  UserPlus,
  Settings,
  LogOut,
  Menu,
  Building2,
  BarChart3,
  Upload,
  Crown,
  Building2 as Building,
  Wrench,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useHoaFeatures } from "@/hooks/useHoaFeatures";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { HOA } from "@/lib/types";
import { GateKprLogo } from "@/components/ui/GateKprLogo";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { SupportTicketDialog } from "@/components/support/SupportTicketDialog";

// Core nav items that are always shown
const coreNavItems = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/payments", label: "Payments", icon: CreditCard },
  { path: "/admin/announcements", label: "Announcements", icon: Bell },
  { path: "/admin/documents", label: "Documents", icon: FileText },
];

// Optional feature-based nav items
const featureNavItems = [
  {
    path: "/admin/violations",
    label: "Violations",
    icon: AlertTriangle,
    feature: "violations" as const,
  },
  {
    path: "/admin/spaces",
    label: "Spaces",
    icon: Building,
    feature: "spaces" as const,
  },
  {
    path: "/admin/maintenance",
    label: "Maintenance",
    icon: Wrench,
    feature: "maintenance" as const,
  },
  {
    path: "/admin/residents",
    label: "Residents",
    icon: Users,
    feature: "directory" as const,
  },
];

// Always shown after feature items
const settingsNavItems = [
  { path: "/admin/join-requests", label: "Join Requests", icon: UserPlus },
  { path: "/admin/settings", label: "Settings", icon: Settings },
];

// Super admin only nav items
const superAdminNavItems = [
  { path: "/admin/super", label: "Super Dashboard", icon: Crown },
  { path: "/admin/financials", label: "Financials", icon: BarChart3 },
  { path: "/admin/funds", label: "Fund Transfers", icon: CreditCard },
  { path: "/admin/data-import", label: "Data Import", icon: Upload },
];

function HoaSwitcher() {
  const { isSuperAdmin, selectedHoaId, setSelectedHoaId, effectiveHoaId } =
    useAuth();

  const { data: hoas } = useQuery({
    queryKey: ["all-hoas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hoas")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data as HOA[];
    },
    enabled: isSuperAdmin,
  });

  if (!isSuperAdmin || !hoas) return null;

  return (
    <div className='px-4 py-3 border-b border-border'>
      <div className='flex items-center gap-2 text-xs text-muted-foreground mb-2'>
        <Building2 className='h-3 w-3' />
        <span>Viewing HOA</span>
      </div>
      <Select value={effectiveHoaId || ""} onValueChange={setSelectedHoaId}>
        <SelectTrigger className='w-full'>
          <SelectValue placeholder='Select an HOA' />
        </SelectTrigger>
        <SelectContent>
          {hoas.map((hoa) => (
            <SelectItem key={hoa.id} value={hoa.id}>
              {hoa.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const { signOut, profile, isSuperAdmin, effectiveHoaId, currentHoa } =
    useAuth();
  const { isFeatureEnabled } = useHoaFeatures();

  // Build nav items based on enabled features
  const enabledFeatureNavItems = featureNavItems.filter((item) =>
    isFeatureEnabled(item.feature)
  );

  // Helper function to render nav items conditionally
  const renderNavItem = (
    { path, label, icon: Icon }: { path: string; label: string; icon: any },
    requiresHoa: boolean = false
  ) => {
    const isActive = location.pathname === path;
    const isDisabled = requiresHoa && !effectiveHoaId;

    if (isDisabled) {
      return (
        <Tooltip key={path}>
          <TooltipTrigger>
            <Button
              variant='ghost'
              className='w-full justify-start h-auto p-3 py-2.5 text-muted-foreground/50 cursor-not-allowed opacity-50'
              disabled>
              <Icon className='h-5 w-5 mr-3' />
              {label}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Select an HOA to access this feature</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Link
        key={path}
        to={path}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
          isActive
            ? "bg-secondary text-secondary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}>
        <Icon className='h-5 w-5' />
        {label}
      </Link>
    );
  };

  return (
    <div className='flex flex-col h-full'>
      {/* Logo with Notification Center */}
      <div className='p-6 border-b border-border'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <GateKprLogo size='md' />
            <span className='text-xl font-bold text-foreground'>GateKpr</span>
          </div>
          <NotificationCenter />
        </div>
        <p className='text-xs text-muted-foreground mt-1'>
          {isSuperAdmin ? "Super Admin" : "Admin Portal"}
        </p>
      </div>

      {/* HOA Switcher for Super Admin */}
      <HoaSwitcher />

      {/* Current HOA indicator */}
      {currentHoa && (
        <div className='px-4 py-2 bg-muted/50'>
          <p className='text-xs font-medium text-foreground truncate'>
            {currentHoa.name}
          </p>
        </div>
      )}

      {/* Navigation */}
      <nav className='flex-1 p-4 space-y-1 overflow-y-auto'>
        {/* Core nav items */}
        {coreNavItems.map((item) => renderNavItem(item, true))}

        {/* Feature-based nav items */}
        {enabledFeatureNavItems.map((item) => {
          // Only disable "Residents" when no HOA is selected
          const requiresHoa = item.path === "/admin/residents";
          return renderNavItem(item, requiresHoa);
        })}

        {/* Settings nav items */}
        {settingsNavItems.map((item) => renderNavItem(item, true))}

        {/* Super Admin Only Navigation */}
        {isSuperAdmin && (
          <>
            <div className='my-3 border-t border-border pt-3'>
              <p className='px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2'>
                Property Management
              </p>
            </div>
            {superAdminNavItems.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}>
                  <Icon className='h-5 w-5' />
                  {label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User section */}
      <div className='p-4 border-t border-border'>
        <div className='flex items-center gap-3 mb-3'>
          <div className='h-10 w-10 rounded-full bg-secondary flex items-center justify-center'>
            <span className='text-secondary-foreground font-medium'>
              {profile?.name?.charAt(0).toUpperCase() || "A"}
            </span>
          </div>
          <div className='flex-1 min-w-0'>
            <p className='text-sm font-medium text-foreground truncate'>
              {profile?.name || "Admin"}
            </p>
            <p className='text-xs text-muted-foreground truncate'>
              {profile?.email}
            </p>
          </div>
        </div>
        <SupportTicketDialog
          trigger={
            <Button
              variant='ghost'
              size='sm'
              className='w-full justify-start text-muted-foreground mb-1'>
              <HelpCircle className='h-4 w-4 mr-2' />
              Support
            </Button>
          }
        />
        <Button
          variant='ghost'
          size='sm'
          className='w-full justify-start text-muted-foreground'
          onClick={signOut}>
          <LogOut className='h-4 w-4 mr-2' />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

export function AdminSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile header with menu button */}
      <div className='lg:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b border-border flex items-center justify-between px-4 z-40'>
        <div className='flex items-center gap-2'>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant='ghost' size='icon'>
                <Menu className='h-5 w-5' />
                <span className='sr-only'>Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side='left' className='p-0 w-64'>
              <SidebarContent onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className='flex items-center gap-2'>
            <GateKprLogo size='sm' />
            <span className='text-lg font-bold text-foreground'>GateKpr</span>
          </div>
        </div>
        <NotificationCenter />
      </div>

      {/* Desktop sidebar */}
      <aside className='hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex-col z-40'>
        <SidebarContent />
      </aside>
    </>
  );
}
