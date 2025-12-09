"use client";

import useSWR from "swr";
import {
  Box,
  Toolbar,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Stack,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Avatar,
  IconButton,
  Menu as MuiMenu,
  MenuItem,
  CircularProgress,
  Select,
  FormControl,
  InputLabel,
  OutlinedInput,
  MenuItem as SelectItem,
  useTheme,
} from "@mui/material";
import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import HeaderBar from "../components/HeaderBar";
import StatusChip from "../components/StatusChip";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import CloseIcon from "@mui/icons-material/Close";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartTooltip,
} from "recharts";

const API_BASE = process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL || "http://localhost:3000/api/admin";

const useIsClient = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
};

const fetcher = async (url: string) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) {
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Failed to fetch");
  return data;
};

export default function DashboardPage() {
  const isClient = useIsClient();
  const { data, error, isLoading, mutate } = useSWR(`${API_BASE}/stats`, fetcher);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [year, setYear] = useState(currentYear);
  const [topYear, setTopYear] = useState(currentYear);
  const [topMonth, setTopMonth] = useState(currentMonth);
  const {
    data: earnings,
    error: earningsError,
    isLoading: earningsLoading,
    mutate: mutateEarnings,
  } = useSWR(`${API_BASE}/earnings?year=${year}`, fetcher);
  const { data: topManufacturers, error: topManuError, isLoading: topManuLoading } = useSWR(
    `${API_BASE}/top-manufacturers?year=${topYear}&month=${topMonth}`,
    fetcher
  );
  const { data: topMedicines, error: topMedError, isLoading: topMedLoading } = useSWR(
    `${API_BASE}/top-medicines?year=${topYear}&month=${topMonth}`,
    fetcher
  );

  useEffect(() => {
    mutate();
    mutateEarnings();
  }, [mutate, mutateEarnings]);

  const stats = data?.data;

  if (!isClient) return null;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          background: "#f6f8fb",
          minHeight: "100vh",
        }}
      >
        <HeaderBar title="Care Pharmacy Admin" />
        <Toolbar />
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" fontWeight={800} gutterBottom color="primary">
            Dashboard
          </Typography>
          {isLoading && <LinearProgress sx={{ mb: 2 }} />}
          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error.message}
            </Typography>
          )}

          <Grid container spacing={2} columns={12} alignItems="stretch">
            <Grid size={{ xs: 12, md: 7 }}>
              <EarningsSection
                earnings={earnings}
                loading={earningsLoading}
                error={earningsError}
                year={year}
                onYearChange={setYear}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <StatsSummary stats={stats} />
            </Grid>
          </Grid>

          <Grid container spacing={2} columns={12} alignItems="stretch" sx={{ mt: 2 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TopTenChart
                title="Top Manufacturers"
                data={topManufacturers?.data ?? []}
                loading={topManuLoading}
                error={topManuError}
                month={topMonth}
                year={topYear}
                onMonthChange={setTopMonth}
                onYearChange={setTopYear}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TopTenChart
                title="Top Medicines"
                data={topMedicines?.data ?? []}
                loading={topMedLoading}
                error={topMedError}
                month={topMonth}
                year={topYear}
                onMonthChange={setTopMonth}
                onYearChange={setTopYear}
              />
            </Grid>
          </Grid>

          <Box mt={3}>
            <OrdersPreview />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function OrderActions({
  status,
  onMarkDelivered,
  loading,
}: {
  status: string;
  onMarkDelivered: () => void;
  loading: boolean;
}) {
  const delivered = status.toLowerCase().includes("deliver");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton
        size="small"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-label="Actions"
        aria-haspopup="true"
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <MuiMenu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            onMarkDelivered();
          }}
          disabled={loading || delivered}
        >
          {loading && <CircularProgress size={14} sx={{ mr: 1 }} />}
          {delivered ? "Already Delivered" : "Mark as Delivered"}
        </MenuItem>
      </MuiMenu>
    </>
  );
}

function OrdersPreview() {
  const { data, error, isLoading, mutate } = useSWR(`${API_BASE}/orders`, fetcher);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const markDelivered = async (id: string) => {
    try {
      setLoadingId(id);
      await fetch(`${API_BASE}/orders/${id}/deliver`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(typeof window !== "undefined" && localStorage.getItem("admin_token")
            ? { Authorization: `Bearer ${localStorage.getItem("admin_token")}` }
            : {}),
        },
      }).then(async (res) => {
        const payload = await res.json();
        if (!res.ok) throw new Error(payload?.message || "Failed to update");
        return payload;
      });
      await mutate();
    } catch (err) {
      console.error(err);
      alert("Failed to update order status");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Card sx={{ borderRadius: 2, boxShadow: 1 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight={700}>
            Recent Orders
          </Typography>
        </Stack>
        {isLoading && <LinearProgress sx={{ mb: 2 }} />}
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error.message}
          </Typography>
        )}
        {data?.data && (
          <TableContainer component={Paper} sx={{ borderRadius: 1.5, boxShadow: "none" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Order ID</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.data.map(
                  (order: {
                    _id: string;
                    status: string;
                    user?: { name?: string; email?: string };
                    createdAt: string;
                    totalAmount: number;
                  }) => (
                    <TableRow key={order._id} hover>
                      <TableCell>#{order._id.slice(-6)}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar sx={{ width: 28, height: 28, bgcolor: "#e8efff", color: "primary.main" }}>
                            {(order.user?.name || order.user?.email || "U").slice(0, 1).toUpperCase()}
                          </Avatar>
                          <Typography variant="body2">
                            {order.user?.name || order.user?.email || "User"}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <StatusChip label={order.status} />
                      </TableCell>
                      <TableCell>{new Date(order.createdAt).toLocaleString()}</TableCell>
                      <TableCell align="right">
                        ${order.totalAmount?.toFixed(2) ?? order.totalAmount}
                      </TableCell>
                      <TableCell align="right">
                        <OrderActions
                          status={order.status}
                          onMarkDelivered={() => markDelivered(order._id)}
                          loading={loadingId === order._id}
                        />
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}

function EarningsSection({
  earnings,
  loading,
  error,
  year,
  onYearChange,
}: {
  earnings: any;
  loading: boolean;
  error: any;
  year: number;
  onYearChange: (year: number) => void;
}) {
  const theme = useTheme();
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  const monthlyTotals: number[] = earnings?.data?.monthlyTotals ?? [];
  const max = Math.max(1, ...monthlyTotals);
  const months = [
    { key: 'jan', label: 'January' },
    { key: 'feb', label: 'February' },
    { key: 'mar', label: 'March' },
    { key: 'apr', label: 'April' },
    { key: 'may', label: 'May' },
    { key: 'jun', label: 'June' },
    { key: 'jul', label: 'July' },
    { key: 'aug', label: 'August' },
    { key: 'sep', label: 'September' },
    { key: 'oct', label: 'October' },
    { key: 'nov', label: 'November' },
    { key: 'dec', label: 'December' },
  ];
  const total = earnings?.data?.total ?? 0;
  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} spacing={2}>
          <Box>
            <Typography variant="h6" fontWeight={800} color="primary">
              Earnings ({year})
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total: ${total.toFixed(2)}
            </Typography>
          </Box>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="year-select-label">Year</InputLabel>
            <Select
              labelId="year-select-label"
              input={<OutlinedInput label="Year" />}
              value={year}
              onChange={(e) => onYearChange(Number(e.target.value))}
            >
              {yearOptions.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {loading && <LinearProgress sx={{ mb: 2 }} />}
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 1 }}>
            Failed to load earnings
          </Typography>
        )}

        <Box sx={{ height: 260, mt: 1 }}>
          {isClient ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={months.map((m, idx) => ({
                  month: m.label,
                  short: m.label.slice(0, 3),
                  value: monthlyTotals[idx] ?? 0,
                }))}
                margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={theme.palette.primary.light} stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                <XAxis dataKey="short" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  domain={[0, (dataMax: number) => Math.max(max, dataMax)]}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                  width={50}
                />
                <RechartTooltip
                  cursor={{ stroke: theme.palette.primary.light, strokeWidth: 1 }}
                  formatter={(value: number) => [`$${Number(value).toFixed(2)}`, 'Earnings']}
                  labelFormatter={(label) => label}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="none"
                  fill="url(#earningsGradient)"
                  activeDot={false}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={theme.palette.primary.main}
                  strokeWidth={1.6}
                  dot={{ r: 3, strokeWidth: 1, fill: theme.palette.primary.main }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Box sx={{ height: '100%', bgcolor: 'background.default', borderRadius: 2 }} />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

function StatsSummary({ stats }: { stats: any }) {
  const items = [
    {
      label: 'Total Users',
      value: stats?.users ?? 0,
      icon: <PeopleAltIcon color="primary" />,
    },
    {
      label: 'Total Orders',
      value: stats?.orders?.total ?? 0,
      icon: <ShoppingBagIcon color="primary" />,
    },
    {
      label: 'Delivered',
      value: stats?.orders?.byStatus?.delivered ?? 0,
      icon: <DoneAllIcon color="primary" />,
    },
    {
      label: 'In Progress/Paid',
      value:
        (stats?.orders?.byStatus?.paid ?? 0) +
        (stats?.orders?.byStatus?.processing ?? 0) +
        (stats?.orders?.byStatus?.pending ?? 0),
      icon: <PendingActionsIcon color="primary" />,
    },
    {
      label: 'Cancelled',
      value: stats?.orders?.byStatus?.cancelled ?? 0,
      icon: <CloseIcon color="primary" />,
    },
    {
      label: 'Mean Order Amount',
      value:
        typeof stats?.orders?.meanOrderAmount === 'number'
          ? `$${Number(stats.orders.meanOrderAmount).toFixed(2)}`
          : '$0.00',
      icon: <ShoppingBagIcon color="primary" />,
    },
  ];

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent
        sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}
      >
        <Typography variant="h6" fontWeight={800} color="primary" gutterBottom>
          Insights
        </Typography>
        <Grid
          container
          spacing={1.5}
          columns={12}
          alignItems="stretch"
          sx={{ flexGrow: 1 }}
        >
          {items.map((item) => (
            <Grid
              key={item.label}
              size={{ xs: 12, sm: 6 }}
              sx={{ display: 'flex' }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  p: 1.25,
                  borderRadius: 2,
                  backgroundColor: 'transparent',
                  boxShadow: 'none',
                  width: '100%',
                  height: '100%',
                }}
              >
                {item.icon}
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {item.label}
                  </Typography>
                  <Typography variant="h5" fontWeight={800} color="primary">
                    {item.value}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
}

function TopTenChart({
  title,
  data,
  loading,
  error,
  month,
  year,
  onMonthChange,
  onYearChange,
}: {
  title: string;
  data: { name: string; total: number }[];
  loading: boolean;
  error: any;
  month: number;
  year: number;
  onMonthChange: (m: number) => void;
  onYearChange: (y: number) => void;
}) {
  const theme = useTheme();
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  const monthsOptions = [
    { value: 1, label: 'Jan' },
    { value: 2, label: 'Feb' },
    { value: 3, label: 'Mar' },
    { value: 4, label: 'Apr' },
    { value: 5, label: 'May' },
    { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' },
    { value: 8, label: 'Aug' },
    { value: 9, label: 'Sep' },
    { value: 10, label: 'Oct' },
    { value: 11, label: 'Nov' },
    { value: 12, label: 'Dec' },
  ];
  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const chartData = data?.map((d) => ({ ...d, total: Number(d.total || 0) })) ?? [];

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} mb={1}>
          <Typography variant="h6" fontWeight={800} color="primary">
            {title}
          </Typography>
          <Stack direction="row" spacing={1}>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel id={`${title}-month`}>Month</InputLabel>
              <Select
                labelId={`${title}-month`}
                value={month}
                input={<OutlinedInput label="Month" />}
                onChange={(e) => onMonthChange(Number(e.target.value))}
              >
                {monthsOptions.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 90 }}>
              <InputLabel id={`${title}-year`}>Year</InputLabel>
              <Select
                labelId={`${title}-year`}
                value={year}
                input={<OutlinedInput label="Year" />}
                onChange={(e) => onYearChange(Number(e.target.value))}
              >
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Stack>

        {loading && <LinearProgress sx={{ mb: 1 }} />}
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 1 }}>
            Failed to load data
          </Typography>
        )}

        <Box sx={{ flexGrow: 1, minHeight: 220 }}>
          {isClient ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                  width={50}
                />
                <RechartTooltip
                  formatter={(value: number) => [`$${Number(value).toFixed(2)}`, 'Earnings']}
                  labelFormatter={(label) => label}
                  cursor={{ fill: theme.palette.action.hover, opacity: 0.4 }}
                />
                <Bar dataKey="total" fill={theme.palette.primary.main} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Box sx={{ height: '100%', bgcolor: 'background.default', borderRadius: 2 }} />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
