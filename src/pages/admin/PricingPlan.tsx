import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/admin/RoleGuard";
import { IndianRupee, Edit, Search, Eye, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PricingPlan {
  id: string;
  item_type: string;
  item_id: string;
  price_per_day: number;
  price_per_week: number | null;
  price_per_month: number | null;
  price_per_year: number | null;
  security_deposit_day: number;
  security_deposit_week: number;
  security_deposit_month: number;
  is_active: boolean;
  item_name?: string;
  item_model?: string;
}

const PricingPlanContent = () => {
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
  const [viewingPlan, setViewingPlan] = useState<PricingPlan | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    price_per_day: 0,
    price_per_week: 0,
    price_per_month: 0,
    security_deposit_day: 2000,
    security_deposit_week: 3000,
    security_deposit_month: 5000,
  });

  useEffect(() => {
    loadPricingPlans();
  }, []);

  const loadPricingPlans = async () => {
    try {
      // Fetch cycles and accessories directly
      const [cyclesResponse, accessoriesResponse] = await Promise.all([
        supabase.from("cycles").select("*").eq("is_active", true).order("name"),
        supabase.from("accessories").select("*").eq("is_active", true).order("name"),
      ]);

      if (cyclesResponse.error) throw cyclesResponse.error;
      if (accessoriesResponse.error) throw accessoriesResponse.error;

      // Map cycles
      const cyclePlans: PricingPlan[] = (cyclesResponse.data || []).map((cycle) => ({
        id: cycle.id,
        item_type: "cycle",
        item_id: cycle.id,
        price_per_day: cycle.price_per_day || 0,
        price_per_week: cycle.price_per_week || null,
        price_per_month: cycle.price_per_month || null,
        price_per_year: null,
        security_deposit_day: cycle.security_deposit_day || 2000,
        security_deposit_week: cycle.security_deposit_week || 3000,
        security_deposit_month: cycle.security_deposit_month || 5000,
        is_active: cycle.is_active,
        item_name: cycle.name,
        item_model: cycle.model,
      }));

      // Map accessories
      const accessoryPlans: PricingPlan[] = (accessoriesResponse.data || []).map((accessory) => ({
        id: accessory.id,
        item_type: "accessory",
        item_id: accessory.id,
        price_per_day: accessory.price_per_day || 0,
        price_per_week: null,
        price_per_month: null,
        price_per_year: null,
        security_deposit_day: accessory.security_deposit || 0,
        security_deposit_week: 0,
        security_deposit_month: 0,
        is_active: accessory.is_active,
        item_name: accessory.name,
        item_model: accessory.model_number || "-",
      }));

      setPricingPlans([...cyclePlans, ...accessoryPlans]);
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

  const handleEdit = (plan: PricingPlan) => {
    setEditingPlan(plan);
    setFormData({
      price_per_day: plan.price_per_day,
      price_per_week: plan.price_per_week || 0,
      price_per_month: plan.price_per_month || 0,
      security_deposit_day: plan.security_deposit_day,
      security_deposit_week: plan.security_deposit_week,
      security_deposit_month: plan.security_deposit_month,
    });
    setDialogOpen(true);
  };

  const handleView = (plan: PricingPlan) => {
    setViewingPlan(plan);
    setViewDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingPlan) return;

    try {
      // Update the source table (cycles or accessories)
      const tableName = editingPlan.item_type === "cycle" ? "cycles" : "accessories";
      
      const updates: any = {
        price_per_day: formData.price_per_day,
      };

      if (editingPlan.item_type === "cycle") {
        updates.price_per_week = formData.price_per_week || null;
        updates.price_per_month = formData.price_per_month || null;
        updates.security_deposit_day = formData.security_deposit_day;
        updates.security_deposit_week = formData.security_deposit_week;
        updates.security_deposit_month = formData.security_deposit_month;
      } else if (editingPlan.item_type === "accessory") {
        updates.security_deposit = formData.security_deposit_day;
      }

      const { error } = await supabase
        .from(tableName)
        .update(updates)
        .eq("id", editingPlan.item_id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Pricing updated successfully",
      });

      setDialogOpen(false);
      setEditingPlan(null);
      loadPricingPlans();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredPlans = pricingPlans.filter(
    (plan) =>
      plan.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.item_model?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="mb-4 sm:mb-6 md:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2">
          <IndianRupee className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 flex-shrink-0" />
          <span className="truncate">Pricing Management</span>
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-muted-foreground mt-1">Manage pricing for cycles and accessories</p>
      </div>

      {/* Search Bar */}
      <div className="mb-3 sm:mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by name or model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 text-sm"
          />
        </div>
      </div>

      {/* Cycles Pricing Section */}
      <Card className="shadow-warm mb-4 sm:mb-6">
        <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
          <CardTitle className="text-base sm:text-lg">Cycles Pricing ({filteredPlans.filter(p => p.item_type === "cycle").length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px] sm:w-[100px] sticky left-0 bg-background z-10">Actions</TableHead>
                <TableHead className="min-w-[100px]">Cycle Name</TableHead>
                <TableHead className="hidden sm:table-cell min-w-[80px]">Model</TableHead>
                <TableHead className="min-w-[70px]">Price/Day</TableHead>
                <TableHead className="hidden md:table-cell">Price/Week</TableHead>
                <TableHead className="hidden lg:table-cell">Price/Month</TableHead>
                <TableHead className="hidden xl:table-cell">Deposits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlans.filter(p => p.item_type === "cycle").map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="sticky left-0 bg-background z-10">
                    <div className="flex gap-0.5">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleView(plan)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="z-50">
                          <DropdownMenuItem onClick={() => handleEdit(plan)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Pricing
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-xs sm:text-sm">{plan.item_name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs sm:text-sm hidden sm:table-cell">{plan.item_model}</TableCell>
                  <TableCell className="font-semibold text-xs sm:text-sm">₹{plan.price_per_day}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs sm:text-sm">₹{plan.price_per_week || "-"}</TableCell>
                  <TableCell className="hidden lg:table-cell text-xs sm:text-sm">₹{plan.price_per_month || "-"}</TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <div className="text-xs sm:text-sm">
                      <p>Day: ₹{plan.security_deposit_day}</p>
                      <p>Week: ₹{plan.security_deposit_week}</p>
                      <p>Month: ₹{plan.security_deposit_month}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Accessories Pricing Section */}
      <Card className="shadow-warm">
        <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
          <CardTitle className="text-base sm:text-lg">Accessories Pricing ({filteredPlans.filter(p => p.item_type === "accessory").length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px] sm:w-[100px] sticky left-0 bg-background z-10">Actions</TableHead>
                <TableHead className="min-w-[100px]">Accessory Name</TableHead>
                <TableHead className="hidden sm:table-cell min-w-[80px]">Model</TableHead>
                <TableHead className="min-w-[70px]">Price/Day</TableHead>
                <TableHead className="min-w-[80px]">Security Deposit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlans.filter(p => p.item_type === "accessory").map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="sticky left-0 bg-background z-10">
                    <div className="flex gap-0.5">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleView(plan)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="z-50">
                          <DropdownMenuItem onClick={() => handleEdit(plan)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Pricing
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-xs sm:text-sm">{plan.item_name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs sm:text-sm hidden sm:table-cell">{plan.item_model}</TableCell>
                  <TableCell className="font-semibold text-xs sm:text-sm">₹{plan.price_per_day}</TableCell>
                  <TableCell className="font-semibold text-xs sm:text-sm">₹{plan.security_deposit_day}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pricing Details - {viewingPlan?.item_name}</DialogTitle>
          </DialogHeader>
          {viewingPlan && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Item Type</Label>
                  <p className="capitalize font-medium">{viewingPlan.item_type}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Model</Label>
                  <p>{viewingPlan.item_model}</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <Label className="text-xs text-muted-foreground mb-2 block">Pricing</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Per Day</p>
                    <p className="font-semibold text-lg">₹{viewingPlan.price_per_day}</p>
                  </div>
                  {viewingPlan.item_type === "cycle" && (
                    <>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Per Week</p>
                        <p className="font-semibold text-lg">₹{viewingPlan.price_per_week || "-"}</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Per Month</p>
                        <p className="font-semibold text-lg">₹{viewingPlan.price_per_month || "-"}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-xs text-muted-foreground mb-2 block">Security Deposits</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Day</p>
                    <p className="font-semibold text-lg">₹{viewingPlan.security_deposit_day}</p>
                  </div>
                  {viewingPlan.item_type === "cycle" && (
                    <>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Week</p>
                        <p className="font-semibold text-lg">₹{viewingPlan.security_deposit_week}</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground">Month</p>
                        <p className="font-semibold text-lg">₹{viewingPlan.security_deposit_month}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <Button className="w-full" onClick={() => { setViewDialogOpen(false); handleEdit(viewingPlan); }}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Pricing
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pricing - {editingPlan?.item_name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price_per_day">Price/Day (₹) *</Label>
                <Input
                  id="price_per_day"
                  type="number"
                  value={formData.price_per_day}
                  onChange={(e) => setFormData({ ...formData, price_per_day: Number(e.target.value) })}
                  required
                />
              </div>
              {editingPlan?.item_type === "cycle" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="price_per_week">Price/Week (₹)</Label>
                    <Input
                      id="price_per_week"
                      type="number"
                      value={formData.price_per_week}
                      onChange={(e) => setFormData({ ...formData, price_per_week: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price_per_month">Price/Month (₹)</Label>
                    <Input
                      id="price_per_month"
                      type="number"
                      value={formData.price_per_month}
                      onChange={(e) => setFormData({ ...formData, price_per_month: Number(e.target.value) })}
                    />
                  </div>
                </>
              )}
            </div>

            {editingPlan?.item_type === "accessory" && (
              <div className="space-y-2">
                <Label htmlFor="security_deposit">Security Deposit (₹) *</Label>
                <Input
                  id="security_deposit"
                  type="number"
                  value={formData.security_deposit_day}
                  onChange={(e) => setFormData({ ...formData, security_deposit_day: Number(e.target.value) })}
                  required
                />
              </div>
            )}

            {editingPlan?.item_type === "cycle" && (
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deposit_day">Deposit/Day (₹) *</Label>
                  <Input
                    id="deposit_day"
                    type="number"
                    value={formData.security_deposit_day}
                    onChange={(e) => setFormData({ ...formData, security_deposit_day: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deposit_week">Deposit/Week (₹) *</Label>
                  <Input
                    id="deposit_week"
                    type="number"
                    value={formData.security_deposit_week}
                    onChange={(e) => setFormData({ ...formData, security_deposit_week: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deposit_month">Deposit/Month (₹) *</Label>
                  <Input
                    id="deposit_month"
                    type="number"
                    value={formData.security_deposit_month}
                    onChange={(e) => setFormData({ ...formData, security_deposit_month: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>
            )}

            <Button type="submit" className="w-full">
              Update Pricing
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const PricingPlan = () => {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <PricingPlanContent />
    </RoleGuard>
  );
};

export default PricingPlan;