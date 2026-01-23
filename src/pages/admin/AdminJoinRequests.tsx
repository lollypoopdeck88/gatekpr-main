import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Loader2 } from "lucide-react";
import type { JoinRequest, Profile } from "@/lib/types";
import { sendJoinRequestStatusEmail } from "@/lib/emailService";

interface JoinRequestWithProfile extends JoinRequest {
  profiles: Profile;
}

export default function AdminJoinRequests() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ["join-requests", profile?.hoa_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("join_requests")
        .select("*, profiles!inner(user_id,name,email)")
        .eq("hoa_id", profile!.hoa_id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as JoinRequestWithProfile[];
    },
    enabled: !!profile?.hoa_id,
  });

  // Get HOA name for emails
  const { data: hoaData } = useQuery({
    queryKey: ["hoa", profile?.hoa_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hoas")
        .select("name")
        .eq("id", profile!.hoa_id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.hoa_id,
  });

  const approveRequest = useMutation({
    mutationFn: async (request: JoinRequestWithProfile) => {
      // Update the request status
      await supabase
        .from("join_requests")
        .update({
          status: "approved",
          reviewed_by: user!.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      // Update the user's profile with HOA and address
      await supabase
        .from("profiles")
        .update({
          hoa_id: request.hoa_id,
          house_number: request.house_number,
          street_name: request.street_name,
          city: request.city,
          state: request.state,
          zip_code: request.zip_code,
          status: "active",
        })
        .eq("user_id", request.user_id);
    },
    onSuccess: async (_, request) => {
      toast({
        title: "Request approved",
        description: "The resident has been added to the community.",
      });
      queryClient.invalidateQueries({ queryKey: ["join-requests"] });
      queryClient.invalidateQueries({ queryKey: ["residents"] });

      // Send email notification
      if (request.profiles?.email) {
        await sendJoinRequestStatusEmail(
          request.profiles.email,
          true,
          hoaData?.name || "Your HOA"
        );
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const denyRequest = useMutation({
    mutationFn: async (request: JoinRequestWithProfile) => {
      await supabase
        .from("join_requests")
        .update({
          status: "denied",
          reviewed_by: user!.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", request.id);
      return request;
    },
    onSuccess: async (request) => {
      toast({ title: "Request denied" });
      queryClient.invalidateQueries({ queryKey: ["join-requests"] });

      // Send email notification
      if (request.profiles?.email) {
        await sendJoinRequestStatusEmail(
          request.profiles.email,
          false,
          hoaData?.name || "Your HOA"
        );
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const pendingRequests = requests?.filter((r) => r.status === "pending") || [];
  const processedRequests =
    requests?.filter((r) => r.status !== "pending") || [];

  return (
    <AppLayout adminOnly>
      <div className='space-y-6'>
        <div>
          <h1 className='text-2xl font-bold text-foreground'>Join Requests</h1>
          <p className='text-muted-foreground'>
            Review and approve resident requests to join
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pending Requests ({pendingRequests.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className='flex items-center gap-2 text-muted-foreground'>
                <Loader2 className='h-4 w-4 animate-spin' />
                Loading...
              </div>
            ) : pendingRequests.length === 0 ? (
              <p className='text-muted-foreground'>No pending requests</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className='font-medium'>
                        {request.profiles?.name || "Unknown"}
                      </TableCell>
                      <TableCell>{request.profiles?.email}</TableCell>
                      <TableCell>
                        {request.house_number} {request.street_name},{" "}
                        {request.city}
                      </TableCell>
                      <TableCell>
                        {format(new Date(request.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className='flex gap-2'>
                          <Button
                            size='sm'
                            onClick={() => approveRequest.mutate(request)}
                            disabled={approveRequest.isPending}>
                            <Check className='h-4 w-4 mr-1' />
                            Approve
                          </Button>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => denyRequest.mutate(request)}
                            disabled={denyRequest.isPending}>
                            <X className='h-4 w-4 mr-1' />
                            Deny
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {processedRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Request History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reviewed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className='font-medium'>
                        {request.profiles?.name || "Unknown"}
                      </TableCell>
                      <TableCell>
                        {request.house_number} {request.street_name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            request.status === "approved"
                              ? "default"
                              : "destructive"
                          }>
                          {request.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {request.reviewed_at &&
                          format(new Date(request.reviewed_at), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
