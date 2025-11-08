import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Cycles = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Cycles Inventory</h1>
        <p className="text-muted-foreground">Manage your electric bicycle fleet</p>
      </div>

      <Card className="shadow-warm">
        <CardHeader>
          <CardTitle>All Cycles</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Cycles management interface coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Cycles;
