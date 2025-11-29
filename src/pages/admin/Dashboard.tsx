import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, IndianRupee, Bike, Users, TrendingUp, Package, Clock } from "lucide-react";
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
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";

interface DashboardMetrics {
  totalBookings: number;
  totalRevenue: number;
  netRevenue: number;
  cancelledBookings: number;
  totalPartners: number;
  availableCycles: number;
  cyclesInUse: number;
  activeBookings: number;
  upcomingBookings: number;
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
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalBookings: 0,
    totalRevenue: 0,
    netRevenue: 0,
    cancelledBookings: 0,
    totalPartners: 0,
    availableCycles: 0,
    cyclesInUse: 0,
    activeBookings: 0,
    upcomingBookings: 0,
  });
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [cycleUsageData, setCycleUsageData] = useState<CycleUsage[]>([]);
  const [bookingTrends, setBookingTrends] = useState<any[]>([]);
  const [revenueTrends, setRevenueTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Time duration filter
  const [timeFilter, setTimeFilter] = useState<string>("this-week");
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  
  // Dashboard visibility settings
  const [dashboardSettings, setDashboardSettings] = useState({
    showBookingTrends: true,
    showRevenueTrends: true,
    showCycleInventory: true,
    showActiveBookings: true,
  });

  useEffect(() => {
    // Load dashboard settings from localStorage
    const savedSettings = localStorage.getItem('dashboardSettings');
    if (savedSettings) {
      setDashboardSettings(JSON.parse(savedSettings));
    }
    loadDashboardData();
  }, [timeFilter, customStartDate, customEndDate]);

  const getDateRange = () => {
    const now = new Date();
    
    switch (timeFilter) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "yesterday":
        const yesterday = subDays(now, 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
      case "this-week":
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case "last-week":
        const lastWeekStart = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), 1);
        const lastWeekEnd = subWeeks(endOfWeek(now, { weekStartsOn: 1 }), 1);
        return { start: lastWeekStart, end: lastWeekEnd };
      case "this-month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "last-month":
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case "custom":
        if (customStartDate && customEndDate) {
          return { start: startOfDay(customStartDate), end: endOfDay(customEndDate) };
        }
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      default:
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    }
  };

  const loadDashboardData = async () => {
    try {
      const { start, end } = getDateRange();
      
      // Fetch bookings within date range
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
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
      const nonCancelledBookings = bookings?.filter(b => b.booking_status !== 'cancelled') || [];
      const cancelledBookings = bookings?.filter(b => b.booking_status === 'cancelled') || [];
      const totalRevenue = nonCancelledBookings.reduce((sum, b) => sum + Number(b.total_amount), 0);
      const netRevenue = totalRevenue;
      const totalPartners = partners?.length || 0;
      
      // Calculate active bookings (only bookings with status 'active')
      const today = new Date().toISOString().split('T')[0];
      const currentActiveBookings = bookings?.filter(b => 
        b.booking_status === 'active'
      ) || [];
      const activeBookingsCount = currentActiveBookings.length;
      
      // Calculate upcoming bookings (confirmed bookings with future pickup date)
      const upcomingBookingsCount = bookings?.filter(b => 
        b.booking_status === 'confirmed' && b.pickup_date > today
      ).length || 0;
      
      // Calculate cycles in use based on ONLY active bookings
      const cyclesInUseCount = currentActiveBookings.length;
      
      // Calculate total available cycles (sum of quantity field for all active cycles)
      const totalCyclesCount = cycles?.reduce((sum, c) => sum + (c.quantity || 1), 0) || 0;
      const availableCyclesCount = totalCyclesCount - cyclesInUseCount;
      
      const cancelledBookingsCount = cancelledBookings.length;

      setMetrics({
        totalBookings,
        totalRevenue,
        netRevenue,
        cancelledBookings: cancelledBookingsCount,
        totalPartners,
        availableCycles: availableCyclesCount,
        cyclesInUse: cyclesInUseCount,
        activeBookings: activeBookingsCount,
        upcomingBookings: upcomingBookingsCount,
      });

      // Get active bookings with profiles
      const activeBookingsData = bookings?.filter(b => 
        b.booking_status === 'active' || b.booking_status === 'confirmed'
      ).slice(0, 5) || [];

      const bookingsWithProfiles = await Promise.all(
        activeBookingsData.map(async (booking) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, full_name, phone_number')
            .eq('user_id', booking.user_id)
            .single();
          
          const fullName = profile?.full_name || 
                          (profile?.first_name && profile?.last_name 
                            ? `${profile.first_name} ${profile.last_name}` 
                            : 'N/A');
          
          return {
            ...booking,
            profiles: { 
              full_name: fullName, 
              phone_number: profile?.phone_number || 'N/A' 
            }
          };
        })
      );

      setActiveBookings(bookingsWithProfiles);

      // Calculate per-cycle usage (only count current/future bookings)
      const cycleUsage = await Promise.all((cycles || []).map(async (cycle) => {
        const { count } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('cycle_id', cycle.id)
          .in('booking_status', ['confirmed', 'active'])
          .gte('return_date', today);
        
        const totalUnits = cycle.quantity || 1;
        const inUseCount = count || 0;
        
        return {
          id: cycle.id,
          name: cycle.name,
          model: cycle.model,
          total: totalUnits,
          inUse: inUseCount,
          available: Math.max(0, totalUnits - inUseCount)
        };
      }));
      setCycleUsageData(cycleUsage);

      // Calculate booking trends based on selected time range
      const { start: rangeStart, end: rangeEnd } = getDateRange();
      const daysDiff = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
      const dataPoints = Math.min(daysDiff + 1, 30); // Max 30 data points for readability
      
      const trends = Array.from({ length: dataPoints }, (_, i) => {
        const date = new Date(rangeStart);
        date.setDate(date.getDate() + Math.floor(i * daysDiff / dataPoints));
        return {
          date: format(date, 'MMM dd'),
          bookings: 0,
          revenue: 0,
        };
      });

      bookings?.forEach(booking => {
        const bookingDate = new Date(booking.created_at);
        if (bookingDate >= rangeStart && bookingDate <= rangeEnd) {
          const dayIndex = Math.floor((bookingDate.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24) / (daysDiff / dataPoints));
          if (dayIndex >= 0 && dayIndex < dataPoints) {
            trends[dayIndex].bookings += 1;
            if (booking.booking_status !== 'cancelled') {
              trends[dayIndex].revenue += Number(booking.total_amount);
            }
          }
        }
      });

      setBookingTrends(trends);
      setRevenueTrends(trends);
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
      color: "text-primary",
      path: "/admin/bookings"
    },
    { 
      title: "Net Revenue", 
      value: `₹${metrics.netRevenue.toLocaleString('en-IN')}`, 
      icon: IndianRupee,
      color: "text-emerald-600",
      path: "/admin/bookings"
    },
    { 
      title: "Upcoming Bookings", 
      value: metrics.upcomingBookings.toString(), 
      icon: Clock,
      color: "text-blue-600",
      path: "/admin/bookings?tab=upcoming"
    },
    { 
      title: "Active Bookings", 
      value: metrics.activeBookings.toString(), 
      icon: TrendingUp,
      color: "text-indigo-600",
      path: "/admin/bookings?tab=active"
    },
    { 
      title: "Cancelled Bookings", 
      value: metrics.cancelledBookings.toString(), 
      icon: Calendar,
      color: "text-red-600",
      path: "/admin/cancellations"
    },
    { 
      title: "Total Partners", 
      value: metrics.totalPartners.toString(), 
      icon: Users,
      color: "text-purple-600",
      path: "/admin/partners"
    },
    { 
      title: "Available Cycles", 
      value: metrics.availableCycles.toString(), 
      icon: Package,
      color: "text-blue-600",
      path: "/admin/cycles"
    },
    { 
      title: "Cycles in Use", 
      value: metrics.cyclesInUse.toString(), 
      icon: Bike,
      color: "text-orange-600",
      path: "/admin/bookings?tab=active"
    },
  ];

  if (loading) {
    return <div className="p-8">Loading dashboard...</div>;
  }

  const getDateRangeLabel = () => {
    const { start, end } = getDateRange();
    if (timeFilter === "today") return `Today - ${format(new Date(), 'EEEE, MMMM d, yyyy')}`;
    if (timeFilter === "yesterday") return `Yesterday - ${format(subDays(new Date(), 1), 'MMMM d, yyyy')}`;
    return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
  };

  return (
    <div className="p-8">
      {/* Date Range Display - Top Center */}
      <div className="text-center mb-6">
        <p className="text-sm text-muted-foreground">
          {format(new Date(), 'EEEE, MMMM d, yyyy • h:mm a')}
        </p>
        <p className="text-base text-primary font-semibold mt-1">
          Showing data: {getDateRangeLabel()}
        </p>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Welcome to Bolt91 Admin Panel</p>
          </div>
          
          <div className="flex items-center gap-4">
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-[180px] text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="last-week">Last Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {timeFilter === "custom" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {customStartDate && customEndDate
                      ? `${format(customStartDate, "MMM dd")} - ${format(customEndDate, "MMM dd")}`
                      : "Select dates"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="p-4 space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Start Date</p>
                      <CalendarPicker
                        mode="single"
                        selected={customStartDate}
                        onSelect={setCustomStartDate}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">End Date</p>
                      <CalendarPicker
                        mode="single"
                        selected={customEndDate}
                        onSelect={setCustomEndDate}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        {metricCards.map((metric) => (
          <Card 
            key={metric.title} 
            className="hover:shadow-warm transition-all cursor-pointer"
            onClick={() => navigate(metric.path)}
          >
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
      {(dashboardSettings.showBookingTrends || dashboardSettings.showRevenueTrends) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {dashboardSettings.showBookingTrends && (
            <Card className="shadow-warm">
              <CardHeader>
                <CardTitle>Booking Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    bookings: {
                      label: "Bookings",
                      color: "hsl(var(--primary))",
                    },
                  }}
                  className="h-[300px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bookingTrends} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        className="text-muted-foreground"
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        className="text-muted-foreground"
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="bookings" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {dashboardSettings.showRevenueTrends && (
            <Card className="shadow-warm">
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    revenue: {
                      label: "Revenue",
                      color: "hsl(var(--green-600))",
                    },
                  }}
                  className="h-[300px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueTrends} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        className="text-muted-foreground"
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        className="text-muted-foreground"
                      />
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
          )}
        </div>
      )}

      {/* Cycle Usage Table */}
      {dashboardSettings.showCycleInventory && (
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
      )}

      {/* Active Bookings Table */}
      {dashboardSettings.showActiveBookings && (
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
                    <TableRow 
                      key={booking.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/admin/bookings?search=${booking.booking_id}`)}
                    >
                      <TableCell className="font-mono font-semibold text-primary hover:underline">
                        {booking.booking_id}
                      </TableCell>
                      <TableCell className="font-medium">{booking.profiles?.full_name}</TableCell>
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
      )}
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