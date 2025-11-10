import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, DollarSign, Bike, Users, TrendingUp, Package } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { RoleGuard } from "@/components/admin/RoleGuard";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface DashboardMetrics {
  totalBookings: number;
  totalRevenue: number;
  netRevenue: number;
  refundsProcessed: number;
  cancelledBookings: number;
  totalPartners: number;
  availableCycles: number;
  cyclesInUse: number;
  activeBookings: number;
}

interface CycleUsage {
  id: string;
  name: string;
  model: string;
  total: number;
  inUse: number;
  available: number;
}

interface Booking {
  id: string;
  booking_id: string;
  pickup_date: string;
  return_date: string;
  pickup_time: string;
  duration_type: string;
  total_amount: number;
  booking_status: string;
  profiles?: {
    full_name: string;
    phone_number: string;
  };
}

const DashboardContent = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalBookings: 0,
    totalRevenue: 0,
    netRevenue: 0,
    refundsProcessed: 0,
    cancelledBookings: 0,
    totalPartners: 0,
    availableCycles: 0,
    cyclesInUse: 0,
    activeBookings: 0,
  });
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [cycleUsageData, setCycleUsageData] = useState<CycleUsage[]>([]);
  const [bookingTrends, setBookingTrends] = useState<any[]>([]);
  const [revenueTrends, setRevenueTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Fetch all bookings
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch cycles
      const { data: cycles } = await supabase
        .from('cycles')
        .select('*')
        .eq('is_active', true);

      // Fetch partners
      const { data: partners } = await supabase
        .from('partners')
        .select('*')
        .eq('is_active', true);

      // Calculate metrics (exclude cancelled bookings from revenue)
      const totalBookings = bookings?.length || 0;
      const activeBookings = bookings?.filter(b => b.booking_status !== 'cancelled') || [];
      const cancelledBookings = bookings?.filter(b => b.booking_status === 'cancelled') || [];
      const totalRevenue = activeBookings.reduce((sum, b) => sum + Number(b.total_amount), 0);
      const refundsProcessed = cancelledBookings.reduce((sum, b) => sum + Number(b.refund_amount || 0), 0);
      const netRevenue = totalRevenue - refundsProcessed;
      const totalPartners = partners?.length || 0;
      const availableCycles = cycles?.reduce((sum, c) => sum + c.available_quantity, 0) || 0;
      const cyclesInUse = cycles?.reduce((sum, c) => sum + (c.total_quantity - c.available_quantity), 0) || 0;
      const activeBookingsCount = bookings?.filter(b => b.booking_status === 'active' || b.booking_status === 'confirmed').length || 0;
      const cancelledBookingsCount = cancelledBookings.length;

      setMetrics({
        totalBookings,
        totalRevenue,
        netRevenue,
        refundsProcessed,
        cancelledBookings: cancelledBookingsCount,
        totalPartners,
        availableCycles,
        cyclesInUse,
        activeBookings: activeBookingsCount,
      });

      // Get active bookings with profiles
      const activeBookingsData = bookings?.filter(b => 
        b.booking_status === 'active' || b.booking_status === 'confirmed'
      ).slice(0, 5) || [];

      const bookingsWithProfiles = await Promise.all(
        activeBookingsData.map(async (booking) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, phone_number')
            .eq('user_id', booking.user_id)
            .single();
          
          return {
            ...booking,
            profiles: profile || { full_name: 'N/A', phone_number: 'N/A' }
          };
        })
      );

      setActiveBookings(bookingsWithProfiles);

      // Calculate per-cycle usage
      const cycleUsage = await Promise.all((cycles || []).map(async (cycle) => {
        const { count } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('cycle_id', cycle.id)
          .in('booking_status', ['confirmed', 'active']);
        
        return {
          id: cycle.id,
          name: cycle.name,
          model: cycle.model,
          total: cycle.total_quantity,
          inUse: count || 0,
          available: cycle.total_quantity - (count || 0)
        };
      }));
      setCycleUsageData(cycleUsage);

      // Calculate booking trends (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        return {
          date: format(date, 'MMM dd'),
          bookings: 0,
          revenue: 0,
        };
      });

      bookings?.forEach(booking => {
        const bookingDate = new Date(booking.created_at);
        const dayIndex = last7Days.findIndex(day => {
          const targetDate = subDays(new Date(), 6 - last7Days.indexOf(day));
          return format(bookingDate, 'MMM dd') === format(targetDate, 'MMM dd');
        });
        
        if (dayIndex !== -1) {
          last7Days[dayIndex].bookings += 1;
          last7Days[dayIndex].revenue += Number(booking.total_amount);
        }
      });

      setBookingTrends(last7Days);
      setRevenueTrends(last7Days);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const metricCards = [
    { 
      title: "Total Bookings", 
      value: metrics.totalBookings.toString(), 
      icon: Calendar,
      color: "text-primary"
    },
    { 
      title: "Gross Revenue", 
      value: `₹${metrics.totalRevenue.toLocaleString('en-IN')}`, 
      icon: DollarSign,
      color: "text-green-600"
    },
    { 
      title: "Net Revenue", 
      value: `₹${metrics.netRevenue.toLocaleString('en-IN')}`, 
      icon: DollarSign,
      color: "text-emerald-600"
    },
    { 
      title: "Cancelled Bookings", 
      value: metrics.cancelledBookings.toString(), 
      icon: Calendar,
      color: "text-red-600"
    },
    { 
      title: "Refunds Processed", 
      value: `₹${metrics.refundsProcessed.toLocaleString('en-IN')}`, 
      icon: DollarSign,
      color: "text-red-500"
    },
    { 
      title: "Active Bookings", 
      value: metrics.activeBookings.toString(), 
      icon: TrendingUp,
      color: "text-indigo-600"
    },
    { 
      title: "Total Partners", 
      value: metrics.totalPartners.toString(), 
      icon: Users,
      color: "text-purple-600"
    },
    { 
      title: "Available Cycles", 
      value: metrics.availableCycles.toString(), 
      icon: Package,
      color: "text-blue-600"
    },
    { 
      title: "Cycles in Use", 
      value: metrics.cyclesInUse.toString(), 
      icon: Bike,
      color: "text-orange-600"
    },
  ];

  if (loading) {
    return <div className="p-8">Loading dashboard...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to Bolt91 Admin Panel</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 mb-8">
        {metricCards.map((metric) => (
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="shadow-warm">
          <CardHeader>
            <CardTitle>Booking Trends (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                bookings: {
                  label: "Bookings",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bookingTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="bookings" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-warm">
          <CardHeader>
            <CardTitle>Revenue Trends (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: {
                  label: "Revenue",
                  color: "hsl(var(--green-600))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(142, 76%, 36%)" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(142, 76%, 36%)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Cycle Usage Table */}
      <Card className="shadow-warm mb-8">
        <CardHeader>
          <CardTitle>Cycle Inventory Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cycle</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Total Units</TableHead>
                <TableHead>In Use</TableHead>
                <TableHead>Available</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cycleUsageData.length > 0 ? (
                cycleUsageData.map((cycle) => (
                  <TableRow key={cycle.id}>
                    <TableCell className="font-semibold">{cycle.name}</TableCell>
                    <TableCell className="text-muted-foreground">{cycle.model}</TableCell>
                    <TableCell>{cycle.total}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block w-2 h-2 bg-orange-600 rounded-full"></span>
                        {cycle.inUse}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block w-2 h-2 bg-green-600 rounded-full"></span>
                        {cycle.available}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No cycles found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Active Bookings Table */}
      <Card className="shadow-warm">
        <CardHeader>
          <CardTitle>Recent Active Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Pickup Date</TableHead>
                <TableHead>Return Date</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeBookings.length > 0 ? (
                activeBookings.map((booking) => (
                  <TableRow key={booking.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-mono font-semibold">{booking.booking_id}</TableCell>
                    <TableCell className="font-medium text-primary">{booking.profiles?.full_name}</TableCell>
                    <TableCell>{booking.profiles?.phone_number}</TableCell>
                    <TableCell>{booking.duration_type}</TableCell>
                    <TableCell>{format(new Date(booking.pickup_date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{format(new Date(booking.return_date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="font-semibold">₹{booking.total_amount}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No active bookings
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

const Dashboard = () => {
  return (
    <RoleGuard allowedRoles={['admin', 'manager', 'viewer']}>
      <DashboardContent />
    </RoleGuard>
  );
};

export default Dashboard;
