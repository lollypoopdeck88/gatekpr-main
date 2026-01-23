import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Bell,
  CreditCard,
  AlertTriangle,
  Wrench,
  CalendarCheck,
  UserPlus,
  ChevronRight,
  Check,
  CheckCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface NotificationItem {
  id: string;
  type:
    | "payment"
    | "violation"
    | "maintenance"
    | "reservation"
    | "join_request"
    | "announcement";
  title: string;
  description: string;
  link: string;
  urgency: "high" | "medium" | "low";
  timestamp: Date;
  icon: React.ElementType;
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);
  const { user, profile, effectiveHoaId, isAdmin, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();

  // Subscribe to realtime updates for notification-related tables
  useEffect(() => {
    if (!user?.id && !effectiveHoaId) return;

    const channels: ReturnType<typeof supabase.channel>[] = [];

    // Common handler to invalidate queries on changes
    const handleChange = (tableName: string) => {
      if (tableName === "payment_requests") {
        queryClient.invalidateQueries({ queryKey: ["notifications-payments"] });
      } else if (tableName === "violations") {
        queryClient.invalidateQueries({
          queryKey: ["notifications-violations"],
        });
      } else if (tableName === "maintenance_requests") {
        queryClient.invalidateQueries({
          queryKey: ["notifications-maintenance"],
        });
        queryClient.invalidateQueries({
          queryKey: ["notifications-admin-maintenance"],
        });
      } else if (tableName === "space_reservations") {
        queryClient.invalidateQueries({
          queryKey: ["notifications-reservations"],
        });
        queryClient.invalidateQueries({
          queryKey: ["notifications-admin-reservations"],
        });
      } else if (tableName === "join_requests") {
        queryClient.invalidateQueries({
          queryKey: ["notifications-join-requests"],
        });
      } else if (tableName === "notification_dismissals") {
        queryClient.invalidateQueries({
          queryKey: ["notification-dismissals"],
        });
      }
    };

    // Subscribe to each table
    const tables = [
      "payment_requests",
      "violations",
      "maintenance_requests",
      "space_reservations",
      "join_requests",
      "notification_dismissals",
    ];

    tables.forEach((table) => {
      const channel = supabase
        .channel(`realtime-${table}`)
        .on("postgres_changes", { event: "*", schema: "public", table }, () =>
          handleChange(table)
        )
        .subscribe();
      channels.push(channel);
    });

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [user?.id, effectiveHoaId, queryClient]);

  // Fetch dismissed notification keys
  const { data: dismissedKeys = [] } = useQuery({
    queryKey: ["notification-dismissals", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_dismissals")
        .select("notification_key")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data.map((d) => d.notification_key);
    },
    enabled: !!user?.id,
  });

  // Mutation to dismiss a notification
  const dismissMutation = useMutation({
    mutationFn: async (notificationKey: string) => {
      const { error } = await supabase
        .from("notification_dismissals")
        .insert({ user_id: user!.id, notification_key: notificationKey });
      if (error && error.code !== "23505") throw error; // Ignore duplicate key errors
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-dismissals"] });
    },
  });

  // Mutation to dismiss all notifications
  const dismissAllMutation = useMutation({
    mutationFn: async (notificationKeys: string[]) => {
      const inserts = notificationKeys.map((key) => ({
        user_id: user!.id,
        notification_key: key,
      }));
      const { error } = await supabase
        .from("notification_dismissals")
        .upsert(inserts, { onConflict: "user_id,notification_key" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-dismissals"] });
      toast.success("All notifications marked as read");
    },
  });

  // Mutation to restore a dismissed notification
  const restoreMutation = useMutation({
    mutationFn: async (notificationKey: string) => {
      const { error } = await supabase
        .from("notification_dismissals")
        .delete()
        .eq("user_id", user!.id)
        .eq("notification_key", notificationKey);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-dismissals"] });
    },
  });

  // Fetch pending payments for residents
  const { data: pendingPayments } = useQuery({
    queryKey: ["notifications-payments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_requests")
        .select("*, payment_schedule:payment_schedules(name)")
        .eq("resident_id", user!.id)
        .in("status", ["pending", "overdue"]);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !isAdmin,
  });

  // Fetch active violations for residents
  const { data: activeViolations } = useQuery({
    queryKey: ["notifications-violations", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("violations")
        .select("id, title, status, fine_amount, created_at")
        .eq("resident_id", profile!.id)
        .in("status", ["sent", "disputed"]);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id && !isAdmin,
  });

  // Fetch pending maintenance requests for residents
  const { data: pendingMaintenance } = useQuery({
    queryKey: ["notifications-maintenance", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_requests")
        .select("id, title, status, created_at")
        .eq("resident_id", profile!.id)
        .in("status", ["submitted", "in_progress"]);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id && !isAdmin,
  });

  // Fetch pending reservations for residents
  const { data: pendingReservations } = useQuery({
    queryKey: ["notifications-reservations", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("space_reservations")
        .select(
          "id, purpose, status, reservation_date, space:community_spaces(name)"
        )
        .eq("resident_id", profile!.id)
        .eq("status", "pending");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id && !isAdmin,
  });

  // Admin: Fetch pending join requests
  const { data: pendingJoinRequests } = useQuery({
    queryKey: ["notifications-join-requests", effectiveHoaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("join_requests")
        .select("id, created_at, profiles!inner(user_id,name)")
        .eq("hoa_id", effectiveHoaId!)
        .eq("status", "pending");
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveHoaId && isAdmin,
  });

  // Admin: Fetch pending maintenance requests
  const { data: adminPendingMaintenance } = useQuery({
    queryKey: ["notifications-admin-maintenance", effectiveHoaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_requests")
        .select("id, title, status, created_at, profiles:resident_id(name)")
        .eq("hoa_id", effectiveHoaId!)
        .eq("status", "submitted");
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveHoaId && isAdmin,
  });

  // Admin: Fetch pending reservation requests
  const { data: adminPendingReservations } = useQuery({
    queryKey: ["notifications-admin-reservations", effectiveHoaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("space_reservations")
        .select(
          "id, purpose, reservation_date, space:community_spaces(name), profiles:resident_id(name)"
        )
        .eq("status", "pending")
        .not("space", "is", null);
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveHoaId && isAdmin,
  });

  // Build notification items
  const allNotifications: NotificationItem[] = [];

  // Resident notifications
  if (!isAdmin) {
    pendingPayments?.forEach((payment) => {
      const isOverdue = payment.status === "overdue";
      allNotifications.push({
        id: `payment-${payment.id}`,
        type: "payment",
        title: isOverdue ? "Overdue Payment" : "Payment Due",
        description: `$${Number(payment.amount).toFixed(2)} - ${
          (payment as any).payment_schedule?.name || "HOA Dues"
        }`,
        link: "/payments",
        urgency: isOverdue ? "high" : "medium",
        timestamp: new Date(payment.due_date),
        icon: CreditCard,
      });
    });

    activeViolations?.forEach((violation) => {
      allNotifications.push({
        id: `violation-${violation.id}`,
        type: "violation",
        title: "Violation Notice",
        description: violation.title,
        link: "/violations",
        urgency: "high",
        timestamp: new Date(violation.created_at),
        icon: AlertTriangle,
      });
    });

    pendingMaintenance?.forEach((request) => {
      allNotifications.push({
        id: `maintenance-${request.id}`,
        type: "maintenance",
        title:
          request.status === "in_progress"
            ? "Maintenance In Progress"
            : "Request Submitted",
        description: request.title,
        link: "/maintenance",
        urgency: "low",
        timestamp: new Date(request.created_at),
        icon: Wrench,
      });
    });

    pendingReservations?.forEach((reservation) => {
      allNotifications.push({
        id: `reservation-${reservation.id}`,
        type: "reservation",
        title: "Reservation Pending Approval",
        description: `${(reservation as any).space?.name} - ${format(
          new Date(reservation.reservation_date),
          "MMM d"
        )}`,
        link: "/reservations",
        urgency: "low",
        timestamp: new Date(reservation.reservation_date),
        icon: CalendarCheck,
      });
    });
  }

  // Admin notifications
  if (isAdmin) {
    pendingJoinRequests?.forEach((request) => {
      allNotifications.push({
        id: `join-${request.id}`,
        type: "join_request",
        title: "New Join Request",
        description: (request as any).profiles?.name || "New resident",
        link: "/admin/join-requests",
        urgency: "medium",
        timestamp: new Date(request.created_at),
        icon: UserPlus,
      });
    });

    adminPendingMaintenance?.forEach((request) => {
      allNotifications.push({
        id: `admin-maintenance-${request.id}`,
        type: "maintenance",
        title: "New Maintenance Request",
        description: `${request.title} - ${
          (request as any).profiles?.name || "Resident"
        }`,
        link: "/admin/maintenance",
        urgency: "medium",
        timestamp: new Date(request.created_at),
        icon: Wrench,
      });
    });

    adminPendingReservations?.forEach((reservation) => {
      allNotifications.push({
        id: `admin-reservation-${reservation.id}`,
        type: "reservation",
        title: "Reservation Request",
        description: `${(reservation as any).space?.name} - ${
          (reservation as any).profiles?.name || "Resident"
        }`,
        link: "/admin/spaces",
        urgency: "low",
        timestamp: new Date(reservation.reservation_date),
        icon: CalendarCheck,
      });
    });
  }

  // Separate into active and dismissed
  const activeNotifications = allNotifications.filter(
    (n) => !dismissedKeys.includes(n.id)
  );
  const dismissedNotifications = allNotifications.filter((n) =>
    dismissedKeys.includes(n.id)
  );

  // Sort by urgency then timestamp
  const sortNotifications = (notifications: NotificationItem[]) => {
    return notifications.sort((a, b) => {
      const urgencyOrder = { high: 0, medium: 1, low: 2 };
      if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      }
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  };

  const sortedActive = sortNotifications([...activeNotifications]);
  const sortedDismissed = sortNotifications([...dismissedNotifications]);

  const highUrgencyCount = activeNotifications.filter(
    (n) => n.urgency === "high"
  ).length;
  const activeCount = activeNotifications.length;

  const handleDismiss = (e: React.MouseEvent, notificationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    dismissMutation.mutate(notificationId);
  };

  const handleRestore = (e: React.MouseEvent, notificationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    restoreMutation.mutate(notificationId);
  };

  const handleDismissAll = () => {
    const keys = activeNotifications.map((n) => n.id);
    if (keys.length > 0) {
      dismissAllMutation.mutate(keys);
    }
  };

  const renderNotificationItem = (
    notification: NotificationItem,
    isDismissed: boolean
  ) => (
    <div
      key={notification.id}
      className={cn(
        "block transition-colors",
        isDismissed ? "opacity-60" : "hover:bg-muted/50"
      )}>
      <div className='px-4 py-4 flex items-start gap-3'>
        <div
          className={cn(
            "p-2 rounded-lg flex-shrink-0",
            notification.urgency === "high"
              ? "bg-destructive/10"
              : notification.urgency === "medium"
              ? "bg-yellow-500/10"
              : "bg-muted"
          )}>
          <notification.icon
            className={cn(
              "h-4 w-4",
              notification.urgency === "high"
                ? "text-destructive"
                : notification.urgency === "medium"
                ? "text-yellow-600"
                : "text-muted-foreground"
            )}
          />
        </div>
        <Link
          to={notification.link}
          onClick={() => setIsOpen(false)}
          className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 mb-0.5'>
            <span
              className={cn(
                "font-medium text-sm",
                isDismissed ? "text-muted-foreground" : "text-foreground"
              )}>
              {notification.title}
            </span>
            {notification.urgency === "high" && !isDismissed && (
              <Badge variant='destructive' className='text-xs px-1.5 py-0'>
                Urgent
              </Badge>
            )}
          </div>
          <p className='text-sm text-muted-foreground truncate'>
            {notification.description}
          </p>
          <p className='text-xs text-muted-foreground mt-1'>
            {format(notification.timestamp, "MMM d, yyyy")}
          </p>
        </Link>
        <div className='flex items-center gap-1 flex-shrink-0'>
          {isDismissed ? (
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8'
              onClick={(e) => handleRestore(e, notification.id)}
              title='Mark as unread'>
              <EyeOff className='h-4 w-4 text-muted-foreground' />
            </Button>
          ) : (
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8'
              onClick={(e) => handleDismiss(e, notification.id)}
              title='Mark as read'>
              <Check className='h-4 w-4 text-muted-foreground' />
            </Button>
          )}
          <Link to={notification.link} onClick={() => setIsOpen(false)}>
            <ChevronRight className='h-4 w-4 text-muted-foreground' />
          </Link>
        </div>
      </div>
    </div>
  );

  return !isSuperAdmin ? (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <div
          className='relative flex flex-col items-center justify-center w-full h-full gap-0.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer'
          aria-label='Open notifications'>
          <Bell className='h-5 w-5' />
          <span className='text-xs font-medium'>Alerts</span>
          {activeCount > 0 && (
            <span
              className={cn(
                "absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold",
                highUrgencyCount > 0
                  ? "bg-destructive text-white"
                  : "bg-secondary text-secondary-foreground"
              )}>
              {activeCount > 9 ? "9+" : activeCount}
            </span>
          )}
        </div>
      </SheetTrigger>
      <SheetContent className='w-full sm:max-w-md p-0'>
        <SheetHeader className='px-4 py-4 border-b'>
          <div className='flex items-center justify-between'>
            <SheetTitle className='flex items-center gap-2'>
              <Bell className='h-5 w-5' />
              Notifications
              {activeCount > 0 && (
                <Badge variant='secondary' className='ml-2'>
                  {activeCount}
                </Badge>
              )}
            </SheetTitle>
            <div className='flex items-center gap-2'>
              {activeCount > 0 && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={handleDismissAll}
                  className='text-xs'
                  disabled={dismissAllMutation.isPending}>
                  <CheckCheck className='h-4 w-4 mr-1' />
                  Mark all read
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className='h-[calc(100vh-80px)]'>
          {sortedActive.length === 0 && sortedDismissed.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12 px-4 text-center'>
              <div className='p-4 bg-muted rounded-full mb-4'>
                <Bell className='h-8 w-8 text-muted-foreground' />
              </div>
              <h3 className='font-medium text-foreground mb-1'>
                All caught up!
              </h3>
              <p className='text-sm text-muted-foreground'>
                No pending items require your attention.
              </p>
            </div>
          ) : (
            <>
              {/* Active notifications */}
              {sortedActive.length > 0 && (
                <div className='divide-y'>
                  {sortedActive.map((notification) =>
                    renderNotificationItem(notification, false)
                  )}
                </div>
              )}

              {sortedActive.length === 0 && sortedDismissed.length > 0 && (
                <div className='flex flex-col items-center justify-center py-8 px-4 text-center'>
                  <div className='p-4 bg-muted rounded-full mb-4'>
                    <CheckCheck className='h-8 w-8 text-muted-foreground' />
                  </div>
                  <h3 className='font-medium text-foreground mb-1'>
                    All caught up!
                  </h3>
                  <p className='text-sm text-muted-foreground'>
                    You've read all your notifications.
                  </p>
                </div>
              )}

              {/* Dismissed notifications section */}
              {sortedDismissed.length > 0 && (
                <div className='border-t'>
                  <button
                    onClick={() => setShowDismissed(!showDismissed)}
                    className='w-full px-4 py-3 flex items-center justify-between text-sm text-muted-foreground hover:bg-muted/50 transition-colors'>
                    <span className='flex items-center gap-2'>
                      <Eye className='h-4 w-4' />
                      {showDismissed ? "Hide" : "Show"} read notifications (
                      {sortedDismissed.length})
                    </span>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 transition-transform",
                        showDismissed && "rotate-90"
                      )}
                    />
                  </button>
                  {showDismissed && (
                    <div className='divide-y bg-muted/30'>
                      {sortedDismissed.map((notification) =>
                        renderNotificationItem(notification, true)
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  ) : null;
}
