import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Mail, MessageSquare, Bell, AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface NotificationLog {
  id: string;
  hoa_id: string;
  recipient_id: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  notification_type: 'email' | 'sms' | 'in_app';
  subject: string | null;
  body: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  error_message: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
  created_by: string | null;
}

export function NotificationLogsViewer() {
  const { effectiveHoaId } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['notification-logs', effectiveHoaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('hoa_id', effectiveHoaId!)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as NotificationLog[];
    },
    enabled: !!effectiveHoaId,
  });

  const filteredLogs = logs?.filter(log => {
    const matchesSearch = 
      (log.recipient_email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (log.recipient_phone?.includes(searchTerm) ?? false) ||
      (log.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      log.body.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || log.notification_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <MessageSquare className="h-4 w-4" />;
      case 'in_app': return <Bell className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      email: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      sms: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      in_app: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    };
    return (
      <Badge variant="secondary" className={`flex items-center gap-1 ${colors[type] || ''}`}>
        {getTypeIcon(type)}
        {type === 'in_app' ? 'In-App' : type.toUpperCase()}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { icon: React.ReactNode; color: string }> = {
      pending: { icon: <Clock className="h-3 w-3" />, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
      sent: { icon: <CheckCircle2 className="h-3 w-3" />, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
      delivered: { icon: <CheckCircle2 className="h-3 w-3" />, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
      failed: { icon: <XCircle className="h-3 w-3" />, color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
      bounced: { icon: <AlertCircle className="h-3 w-3" />, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
    };
    const { icon, color } = config[status] || config.pending;
    return (
      <Badge variant="secondary" className={`flex items-center gap-1 ${color}`}>
        {icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // Stats summary
  const stats = logs ? {
    total: logs.length,
    sent: logs.filter(l => l.status === 'sent' || l.status === 'delivered').length,
    failed: logs.filter(l => l.status === 'failed' || l.status === 'bounced').length,
    pending: logs.filter(l => l.status === 'pending').length,
  } : { total: 0, sent: 0, failed: 0, pending: 0 };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Notification Logs</h2>
        <p className="text-sm text-muted-foreground">Track all sent emails and SMS messages</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
            <p className="text-xs text-muted-foreground">Delivered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by recipient or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="in_app">In-App</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="bounced">Bounced</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Logs Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-secondary" />
        </div>
      ) : filteredLogs && filteredLogs.length > 0 ? (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead className="hidden md:table-cell">Subject/Content</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Sent At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{getTypeBadge(log.notification_type)}</TableCell>
                    <TableCell>
                      <div className="max-w-[150px] truncate">
                        {log.recipient_email || log.recipient_phone || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="max-w-[200px] truncate">
                        {log.subject || log.body.substring(0, 50)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getStatusBadge(log.status)}
                        {log.error_message && (
                          <p className="text-xs text-red-500 truncate max-w-[100px]" title={log.error_message}>
                            {log.error_message}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {log.sent_at ? format(new Date(log.sent_at), 'MMM d, h:mm a') : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No notification logs found</p>
            <p className="text-sm text-muted-foreground">
              Sent notifications will appear here
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
