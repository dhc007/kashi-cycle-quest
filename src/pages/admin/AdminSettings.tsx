import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AdminSettings = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure pricing, operating hours, and more</p>
      </div>

      <Card className="shadow-warm">
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Settings interface coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;
