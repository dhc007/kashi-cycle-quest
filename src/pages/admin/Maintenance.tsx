import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/admin/RoleGuard";
import { Wrench, Plus, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

interface Cycle {
  id: string;
  name: string;
  model: string;
  total_quantity: number;
  available_quantity: number;
}

interface MaintenanceRecord {
  id: string;
  cycle_id: string;
  reported_at: string;
  completed_at: string | null;
  maintenance_type: string;
  description: string | null;
  cost: number;
  status: string;
  cycles?: {
    name: string;
    model: string;
  };
}

const MaintenanceContent = () => {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCycleId, setSelectedCycleId] = useState("");
  const [maintenanceType, setMaintenanceType] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [cyclesResponse, maintenanceResponse] = await Promise.all([
        supabase
          .from('cycles')
          .select('*')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('cycle_maintenance')
          .select(`
            *,
            cycles!inner(name, model)
          `)
          .order('reported_at', { ascending: false })
      ]);

      if (cyclesResponse.error) throw cyclesResponse.error;
      if (maintenanceResponse.error) throw maintenanceResponse.error;

      setCycles(cyclesResponse.data || []);
      setMaintenanceRecords(maintenanceResponse.data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMaintenance = async () => {
    if (!selectedCycleId || !maintenanceType) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('cycle_maintenance')
        .insert({
          cycle_id: selectedCycleId,
          maintenance_type: maintenanceType,
          description: description || null,
          cost: cost ? parseFloat(cost) : 0,
          performed_by: user?.id,
          status: 'pending',
        });

      if (error) throw error;

      // Reduce available quantity while in maintenance
      const cycle = cycles.find(c => c.id === selectedCycleId);
      if (cycle && cycle.available_quantity > 0) {
        await supabase
          .from('cycles')
          .update({ available_quantity: cycle.available_quantity - 1 })
          .eq('id', selectedCycleId);
      }

      toast({
        title: "Success",
        description: "Maintenance record created. Cycle marked as unavailable.",
      });

      setDialogOpen(false);
      setSelectedCycleId("");
      setMaintenanceType("");
      setDescription("");
      setCost("");
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleCompleteMaintenance = async (record: MaintenanceRecord) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('cycle_maintenance')
        .update({
          completed_at: new Date().toISOString(),
          status: 'completed',
        })
        .eq('id', record.id);

      if (error) throw error;

      // Restore available quantity
      const cycle = cycles.find(c => c.id === record.cycle_id);
      if (cycle) {
        await supabase
          .from('cycles')
          .update({ available_quantity: cycle.available_quantity + 1 })
          .eq('id', record.cycle_id);
      }

      toast({
        title: "Success",
        description: "Maintenance completed. Cycle is now available.",
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: "bg-orange-100 text-orange-800",
      in_progress: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cycle Maintenance</h1>
          <p className="text-muted-foreground">Track and manage cycle maintenance activities</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Maintenance
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Maintenance Record</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Cycle *</Label>
                <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    {cycles.map((cycle) => (
                      <SelectItem key={cycle.id} value={cycle.id}>
                        {cycle.name} - {cycle.model} (Available: {cycle.available_quantity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Maintenance Type *</Label>
                <Select value={maintenanceType} onValueChange={setMaintenanceType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine Service</SelectItem>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="brake_adjustment">Brake Adjustment</SelectItem>
                    <SelectItem value="tire_replacement">Tire Replacement</SelectItem>
                    <SelectItem value="battery_check">Battery Check</SelectItem>
                    <SelectItem value="cleaning">Deep Cleaning</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the maintenance work..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Cost (₹)</Label>
                <Input
                  type="number"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateMaintenance} disabled={processing}>
                  {processing ? "Creating..." : "Create Record"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        <Card className="shadow-warm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-primary" />
              Maintenance Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Reported</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maintenanceRecords.length > 0 ? (
                  maintenanceRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="font-medium">{record.cycles?.name}</div>
                        <div className="text-xs text-muted-foreground">{record.cycles?.model}</div>
                      </TableCell>
                      <TableCell className="capitalize">{record.maintenance_type.replace('_', ' ')}</TableCell>
                      <TableCell className="max-w-xs truncate">{record.description || '-'}</TableCell>
                      <TableCell className="font-semibold">₹{record.cost}</TableCell>
                      <TableCell>{format(new Date(record.reported_at), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(record.status)}>
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleCompleteMaintenance(record)}
                            disabled={processing}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Complete
                          </Button>
                        )}
                        {record.status === 'completed' && record.completed_at && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(record.completed_at), 'MMM dd, yyyy')}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No maintenance records
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const Maintenance = () => {
  return (
    <RoleGuard allowedRoles={['admin', 'manager']}>
      <MaintenanceContent />
    </RoleGuard>
  );
};

export default Maintenance;
