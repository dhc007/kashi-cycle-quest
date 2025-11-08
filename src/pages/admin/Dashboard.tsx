import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, DollarSign, Bike, AlertTriangle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const Dashboard = () => {
  // Mock data - will be replaced with real data
  const metrics = [
    { 
      title: "Active Bookings", 
      value: "12", 
      icon: Calendar,
      color: "text-primary"
    },
    { 
      title: "Total Revenue", 
      value: "₹45,890", 
      icon: DollarSign,
      color: "text-green-600"
    },
    { 
      title: "Available Cycles", 
      value: "8", 
      icon: Bike,
      color: "text-blue-600"
    },
    { 
      title: "Maintenance Needed", 
      value: "2", 
      icon: AlertTriangle,
      color: "text-orange-600"
    },
  ];

  const activeBookings = [
    {
      id: "BLT-001234",
      name: "Rahul Sharma",
      phone: "+91 98765 43210",
      duration: "One Week",
      startDate: "05 Nov 2025, 10:00 AM",
      returnDate: "12 Nov 2025, 10:00 AM"
    },
    {
      id: "BLT-001235",
      name: "Priya Singh",
      phone: "+91 87654 32109",
      duration: "One Day",
      startDate: "06 Nov 2025, 09:00 AM",
      returnDate: "07 Nov 2025, 09:00 AM"
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to Bolt91 Admin Panel</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric) => (
          <Card key={metric.title} className="hover:shadow-warm transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <metric.icon className={`w-5 h-5 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metric.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Bookings Table */}
      <Card className="shadow-warm">
        <CardHeader>
          <CardTitle>Active Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Return Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeBookings.map((booking) => (
                <TableRow key={booking.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-mono font-semibold">{booking.id}</TableCell>
                  <TableCell className="font-medium text-primary">{booking.name}</TableCell>
                  <TableCell>{booking.phone}</TableCell>
                  <TableCell>{booking.duration}</TableCell>
                  <TableCell>{booking.startDate}</TableCell>
                  <TableCell>{booking.returnDate}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
