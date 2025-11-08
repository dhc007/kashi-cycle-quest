import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Bookings = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Bookings Management</h1>
        <p className="text-muted-foreground">View and manage all bookings</p>
      </div>

      <Card className="shadow-warm">
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Bookings management interface coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Bookings;
