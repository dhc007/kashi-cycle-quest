import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { RoleGuard } from "@/components/admin/RoleGuard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CancellationRequest {
  id: string;
  booking_id: string;
  user_id: string;
  pickup_date: string;
  return_date: string;
  total_amount: number;
  cancellation_requested_at: string;
  cancellation_reason: string;
  cancellation_status: string;
  cancellation_fee: number | null;
  refund_amount: number | null;
  cycles: {
    name: string;
    model: string;
  };
  profiles: {
    full_name: string;
    email: string;
    phone_number: string;
  };
}

function CancellationsContent() {
  const [requests, setRequests] = useState<CancellationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<CancellationRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadCancellationRequests();
  }, []);

  const loadCancellationRequests = async () => {
    try {
      // First fetch bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select(`
          *,
          cycles(name, model)
        `)
        .eq("cancellation_status", "requested")
        .order("cancellation_requested_at", { ascending: false });

      if (bookingsError) throw bookingsError;

      // Then fetch profiles for each booking
      const requestsWithProfiles = await Promise.all(
        (bookings || []).map(async (booking) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email, phone_number")
            .eq("user_id", booking.user_id)
            .single();

          return {
            ...booking,
            profiles: profile || { full_name: "Unknown", email: "", phone_number: "" },
          };
        })
      );

      setRequests(requestsWithProfiles as CancellationRequest[]);
    } catch (error: any) {
      console.error("Error loading cancellation requests:", error);
      toast({
        title: "Error",
        description: "Failed to load cancellation requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: CancellationRequest) => {
    setActionLoading(true);
    try {
      const hoursUntilPickup = (new Date(request.pickup_date).getTime() - new Date().getTime()) / (1000 * 60 * 60);
      const cancellationFee = hoursUntilPickup >= 24 ? 100 : request.total_amount;
      const refundAmount = request.total_amount - cancellationFee;

      const { error } = await supabase
        .from("bookings")
        .update({
          cancellation_status: "approved",
          booking_status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancelled_by: (await supabase.auth.getUser()).data.user?.id,
          cancellation_fee: cancellationFee,
          refund_amount: refundAmount,
          notes: adminNotes || null,
        })
        .eq("id", request.id);

      if (error) throw error;

      toast({
        title: "Approved",
        description: `Cancellation approved. Refund amount: ₹${refundAmount}`,
      });

      setSelectedRequest(null);
      setAdminNotes("");
      loadCancellationRequests();
    } catch (error: any) {
      console.error("Error approving cancellation:", error);
      toast({
        title: "Error",
        description: "Failed to approve cancellation",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (request: CancellationRequest) => {
    if (!adminNotes.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          cancellation_status: "rejected",
          cancelled_at: new Date().toISOString(),
          cancelled_by: (await supabase.auth.getUser()).data.user?.id,
          notes: adminNotes,
        })
        .eq("id", request.id);

      if (error) throw error;

      toast({
        title: "Rejected",
        description: "Cancellation request rejected",
      });

      setSelectedRequest(null);
      setAdminNotes("");
      loadCancellationRequests();
    } catch (error: any) {
      console.error("Error rejecting cancellation:", error);
      toast({
        title: "Error",
        description: "Failed to reject cancellation",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const calculateRefund = (request: CancellationRequest) => {
    const hoursUntilPickup = (new Date(request.pickup_date).getTime() - new Date().getTime()) / (1000 * 60 * 60);
    const cancellationFee = hoursUntilPickup >= 24 ? 100 : request.total_amount;
    return {
      fee: cancellationFee,
      refund: request.total_amount - cancellationFee,
      hoursUntilPickup: Math.floor(hoursUntilPickup),
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">User Cancellation Requests</h1>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {requests.length} Pending
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {requests.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No pending cancellation requests
            </CardContent>
          </Card>
        ) : (
          requests.map((request) => {
            const refundCalc = calculateRefund(request);
            return (
              <Card key={request.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-4">
                        <h3 className="font-semibold text-lg">{request.booking_id}</h3>
                        <Badge variant="outline">{request.cycles.name}</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Customer</p>
                          <p className="font-medium">{request.profiles.full_name}</p>
                          <p className="text-xs text-muted-foreground">{request.profiles.email}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Pickup Date</p>
                          <p className="font-medium">{new Date(request.pickup_date).toLocaleDateString()}</p>
                          <p className="text-xs text-muted-foreground">
                            {refundCalc.hoursUntilPickup} hours away
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-muted-foreground text-sm">Reason</p>
                        <p className="text-sm">{request.cancellation_reason}</p>
                      </div>

                      <div>
                        <p className="text-muted-foreground text-sm">Requested</p>
                        <p className="text-sm">
                          {new Date(request.cancellation_requested_at).toLocaleString()}
                        </p>
                      </div>

                      <div className="bg-muted p-3 rounded-lg">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Total Amount</p>
                            <p className="font-semibold">₹{request.total_amount}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Cancellation Fee</p>
                            <p className="font-semibold text-red-500">₹{refundCalc.fee}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Refund Amount</p>
                            <p className="font-semibold text-green-500">₹{refundCalc.refund}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        size="sm"
                        onClick={() => setSelectedRequest(request)}
                        variant="default"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Review
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Cancellation Request</DialogTitle>
            <DialogDescription>
              {selectedRequest?.booking_id} - {selectedRequest?.profiles.full_name}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Refund Calculation</h4>
                {(() => {
                  const calc = calculateRefund(selectedRequest);
                  return (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Hours until pickup:</span>
                        <span className="font-medium">{calc.hoursUntilPickup} hours</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Policy:</span>
                        <span className="font-medium">
                          {calc.hoursUntilPickup >= 24
                            ? "₹100 cancellation fee (>24hrs)"
                            : "No refund (<24hrs)"}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span>Total Amount:</span>
                        <span className="font-medium">₹{selectedRequest.total_amount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cancellation Fee:</span>
                        <span className="font-medium text-red-500">-₹{calc.fee}</span>
                      </div>
                      <div className="flex justify-between font-bold pt-2 border-t">
                        <span>Refund Amount:</span>
                        <span className="text-green-500">₹{calc.refund}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="text-sm font-medium">Admin Notes (Optional)</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add any notes or comments..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedRequest(null);
                    setAdminNotes("");
                  }}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleReject(selectedRequest)}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => handleApprove(selectedRequest)}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve & Refund
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Cancellations() {
  return (
    <RoleGuard allowedRoles={["admin", "manager"]}>
      <CancellationsContent />
    </RoleGuard>
  );
}
