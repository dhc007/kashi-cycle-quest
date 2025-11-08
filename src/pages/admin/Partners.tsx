import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Partners = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Partners Management</h1>
        <p className="text-muted-foreground">Manage partner relationships and QR codes</p>
      </div>

      <Card className="shadow-warm">
        <CardHeader>
          <CardTitle>All Partners</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Partners management interface coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Partners;
