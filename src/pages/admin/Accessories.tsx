import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Accessories = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Accessories Inventory</h1>
        <p className="text-muted-foreground">Manage rental accessories</p>
      </div>

      <Card className="shadow-warm">
        <CardHeader>
          <CardTitle>All Accessories</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Accessories management interface coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Accessories;
