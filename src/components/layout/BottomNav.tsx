import { Link, useLocation } from "react-router-dom";
import {
  Home,
  FileText,
  User,
  AlertTriangle,
  MoreHorizontal,
  Bell,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Wrench, Calendar, CreditCard, Users } from "lucide-react";
import { useHoaFeatures, type HoaFeatures } from "@/hooks/useHoaFeatures";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { SupportTicketDialog } from "@/components/support/SupportTicketDialog";

// Core nav items always shown (removed News/Bell since we have NotificationCenter)
const coreMainNavItems = [
  { path: "/dashboard", label: "Home", icon: Home },
  { path: "/documents", label: "Docs", icon: FileText },
];

// Feature-based main nav items
const featureMainNavItems = [
  {
    path: "/violations",
    label: "Violations",
    icon: AlertTriangle,
    feature: "violations" as keyof HoaFeatures,
  },
];

// Core items in more menu
const coreMoreNavItems = [
  { path: "/announcements", label: "Announcements", icon: Bell },
  { path: "/payments", label: "Payments", icon: CreditCard },
  { path: "/profile", label: "Profile", icon: User },
];

// Feature-based items in more menu
const featureMoreNavItems = [
  {
    path: "/maintenance",
    label: "Maintenance",
    icon: Wrench,
    feature: "maintenance" as keyof HoaFeatures,
  },
  {
    path: "/reservations",
    label: "Reservations",
    icon: Calendar,
    feature: "spaces" as keyof HoaFeatures,
  },
  {
    path: "/directory",
    label: "Directory",
    icon: Users,
    feature: "directory" as keyof HoaFeatures,
  },
];

export function BottomNav() {
  const location = useLocation();
  const { isFeatureEnabled } = useHoaFeatures();

  // Build dynamic nav items
  const enabledFeatureMainNavItems = featureMainNavItems.filter((item) =>
    isFeatureEnabled(item.feature)
  );
  const mainNavItems = [...coreMainNavItems, ...enabledFeatureMainNavItems];

  const enabledFeatureMoreNavItems = featureMoreNavItems.filter((item) =>
    isFeatureEnabled(item.feature)
  );
  const moreNavItems = [...enabledFeatureMoreNavItems, ...coreMoreNavItems];

  const isMoreActive = moreNavItems.some(
    (item) => location.pathname === item.path
  );

  return (
    <nav
      data-tour='bottom-nav'
      className='fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-inset-bottom'>
      <div className='flex items-center justify-around h-16 max-w-lg mx-auto'>
        {mainNavItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                isActive
                  ? "text-secondary"
                  : "text-muted-foreground hover:text-foreground"
              )}>
              <Icon className='h-5 w-5' />
              <span className='text-xs font-medium'>{label}</span>
            </Link>
          );
        })}

        {/* Notification Center */}
        <NotificationCenter />

        {/* More dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                isMoreActive
                  ? "text-secondary"
                  : "text-muted-foreground hover:text-foreground"
              )}>
              <MoreHorizontal className='h-5 w-5' />
              <span className='text-xs font-medium'>More</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-48 mb-2 bg-popover'>
            {moreNavItems.map(({ path, label, icon: Icon }) => (
              <DropdownMenuItem key={path} asChild>
                <Link
                  to={path}
                  className={cn(
                    "flex items-center gap-2 w-full",
                    location.pathname === path && "text-secondary"
                  )}>
                  <Icon className='h-4 w-4' />
                  {label}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <SupportTicketDialog
              trigger={
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className='flex items-center gap-2 w-full cursor-pointer'>
                  <HelpCircle className='h-4 w-4' />
                  Support
                </DropdownMenuItem>
              }
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
