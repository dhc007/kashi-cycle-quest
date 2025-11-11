import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface Cycle {
  id: string;
  name: string;
  model: string;
  description: string | null;
  image_url: string | null;
  video_url: string | null;
  media_urls: string[] | null;
  price_per_day: number;
  price_per_week: number;
  price_per_month: number | null;
  security_deposit_day: number;
  security_deposit_week: number;
  security_deposit_month: number;
  is_active: boolean;
  free_accessories: string[] | null;
  specifications: string | null;
  internal_details: any;
  serial_number?: string | null;
  model_number?: string | null;
  display_serial?: string | null;
  quantity?: number;
}

interface CycleViewDialogProps {
  cycle: Cycle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CycleViewDialog = ({ cycle, open, onOpenChange }: CycleViewDialogProps) => {
  if (!cycle) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cycle Details - {cycle.display_serial}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Image */}
          {cycle.image_url && (
            <div className="flex justify-center">
              <img
                src={cycle.image_url}
                alt={cycle.name}
                className="w-full max-w-md h-64 object-cover rounded-lg"
              />
            </div>
          )}

          {/* Basic Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Name</Label>
              <p className="font-semibold">{cycle.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Model</Label>
              <p className="font-semibold">{cycle.model}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Serial Number</Label>
              <p className="font-mono text-sm">{cycle.display_serial || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Quantity</Label>
              <p className="font-semibold">{cycle.quantity || 1}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <div>
                <Badge variant={cycle.is_active ? "default" : "secondary"}>
                  {cycle.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Description */}
          {cycle.description && (
            <div>
              <Label className="text-muted-foreground">Description</Label>
              <p className="text-sm mt-1">{cycle.description}</p>
            </div>
          )}

          <Separator />

          {/* Specifications */}
          {cycle.specifications && (
            <div>
              <Label className="text-muted-foreground mb-2 block">Specifications</Label>
              <div className="flex flex-wrap gap-2">
                {cycle.specifications.split('\n').filter(s => s.trim()).map((spec, index) => (
                  <Badge key={index} variant="secondary">{spec}</Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Internal Details */}
          <div>
            <Label className="text-lg font-semibold mb-3 block">Internal Details</Label>
            <div className="grid md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
              {cycle.serial_number && (
                <div>
                  <Label className="text-muted-foreground text-xs">Serial Number</Label>
                  <p className="text-sm">{cycle.serial_number}</p>
                </div>
              )}
              {cycle.model_number && (
                <div>
                  <Label className="text-muted-foreground text-xs">Model Number</Label>
                  <p className="text-sm">{cycle.model_number}</p>
                </div>
              )}
              {cycle.internal_details?.vendor && (
                <div>
                  <Label className="text-muted-foreground text-xs">Vendor</Label>
                  <p className="text-sm">{cycle.internal_details.vendor}</p>
                </div>
              )}
              {cycle.internal_details?.date_received && (
                <div>
                  <Label className="text-muted-foreground text-xs">Date Received</Label>
                  <p className="text-sm">{cycle.internal_details.date_received}</p>
                </div>
              )}
              {cycle.internal_details?.purchase_amount > 0 && (
                <div>
                  <Label className="text-muted-foreground text-xs">Purchase Amount</Label>
                  <p className="text-sm">₹{cycle.internal_details.purchase_amount}</p>
                </div>
              )}
              {cycle.internal_details?.warranty && (
                <div>
                  <Label className="text-muted-foreground text-xs">Warranty</Label>
                  <p className="text-sm">{cycle.internal_details.warranty}</p>
                </div>
              )}
              {cycle.internal_details?.invoice && (
                <div>
                  <Label className="text-muted-foreground text-xs">Invoice Number</Label>
                  <p className="text-sm">{cycle.internal_details.invoice}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
