import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ClipboardList,
  Search,
  Loader2,
  User,
  Building2,
  CreditCard,
  Shield,
  UserCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

interface AuditLogViewerProps {
  trigger?: React.ReactNode;
}

const ACTION_LABELS: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  hoa_created: { label: "HOA Created", variant: "default" },
  role_changed: { label: "Role Changed", variant: "secondary" },
  subscription_created: { label: "Subscription Created", variant: "default" },
  subscription_updated: { label: "Subscription Updated", variant: "outline" },
  user_spoofed: { label: "User Spoofed", variant: "destructive" },
  spoof_ended: { label: "Spoof Ended", variant: "outline" },
};

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  hoa: <Building2 className='h-4 w-4' />,
  user: <User className='h-4 w-4' />,
  subscription: <CreditCard className='h-4 w-4' />,
  session: <UserCheck className='h-4 w-4' />,
};

export function AuditLogViewer({ trigger }: AuditLogViewerProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs", searchTerm, actionFilter],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const filteredLogs = logs?.filter((log) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const actorId = log.actor_id?.toLowerCase() || "";
    const details = JSON.stringify(log.details || {}).toLowerCase();
    const action = log.action?.toLowerCase() || "";
    const entityType = log.entity_type?.toLowerCase() || "";
    return (
      actorId.includes(term) ||
      details.includes(term) ||
      action.includes(term) ||
      entityType.includes(term)
    );
  });

  const formatDetails = (details: any) => {
    if (!details) return "-";
    const entries = Object.entries(details);
    if (entries.length === 0) return "-";
    return entries.map(([key, value]) => `${key}: ${value}`).join(", ");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant='outline' className='gap-2'>
            <ClipboardList className='h-4 w-4' />
            Audit Log
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className='max-w-4xl max-h-[85vh] overflow-hidden flex flex-col'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Shield className='h-5 w-5 text-secondary' />
            Audit Log
          </DialogTitle>
          <DialogDescription>
            Track all super admin actions including role changes, HOA creation,
            and subscription modifications.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-4 flex-1 overflow-hidden flex flex-col'>
          {/* Filters */}
          <div className='flex gap-4'>
            <div className='flex-1'>
              <Label htmlFor='audit-search'>Search</Label>
              <div className='relative mt-1'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                <Input
                  id='audit-search'
                  placeholder='Search by actor or details...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='pl-9'
                />
              </div>
            </div>
            <div className='w-48'>
              <Label>Action Filter</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className='mt-1'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Actions</SelectItem>
                  <SelectItem value='hoa_created'>HOA Created</SelectItem>
                  <SelectItem value='role_changed'>Role Changed</SelectItem>
                  <SelectItem value='subscription_created'>
                    Subscription Created
                  </SelectItem>
                  <SelectItem value='subscription_updated'>
                    Subscription Updated
                  </SelectItem>
                  <SelectItem value='user_spoofed'>User Spoofed</SelectItem>
                  <SelectItem value='spoof_ended'>Spoof Ended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Logs Table */}
          <div className='border rounded-lg flex-1 overflow-hidden'>
            {isLoading ? (
              <div className='flex items-center justify-center py-8'>
                <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
              </div>
            ) : filteredLogs && filteredLogs.length > 0 ? (
              <ScrollArea className='h-[400px]'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='w-36'>Timestamp</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log: any) => {
                      const actionInfo = ACTION_LABELS[log.action] || {
                        label: log.action,
                        variant: "outline" as const,
                      };
                      return (
                        <TableRow key={log.id}>
                          <TableCell className='text-xs text-muted-foreground whitespace-nowrap'>
                            {format(
                              new Date(log.created_at),
                              "MMM d, yyyy HH:mm"
                            )}
                          </TableCell>
                          <TableCell>
                            <div className='text-sm'>
                              <p className='font-medium'>
                                {(log as any).actor_name || "Unknown"}
                              </p>
                              <p className='text-xs text-muted-foreground'>
                                {(log as any).actor_email || "Unknown"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={actionInfo.variant}>
                              {actionInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className='flex items-center gap-2 text-muted-foreground'>
                              {ENTITY_ICONS[log.entity_type] || null}
                              <span className='text-xs capitalize'>
                                {log.entity_type}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className='max-w-xs'>
                            <p
                              className='text-xs text-muted-foreground truncate'
                              title={formatDetails(log.details)}>
                              {formatDetails(log.details)}
                            </p>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <div className='flex items-center justify-center py-8 text-muted-foreground'>
                <ClipboardList className='h-8 w-8 mr-3 opacity-50' />
                No audit logs found
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
