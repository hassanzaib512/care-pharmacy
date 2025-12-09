"use client";

import useSWR from "swr";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  OutlinedInput,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Stack,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Divider,
  IconButton,
  CircularProgress,
  Toolbar,
  Pagination,
  Menu,
  TableSortLabel,
  Avatar,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import SearchIcon from "@mui/icons-material/Search";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import CloseIcon from "@mui/icons-material/Close";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import HeaderBar from "../components/HeaderBar";
import StatusChip from "../components/StatusChip";

const API_BASE = process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL || "http://localhost:3000/api/admin";

const fetcher = async (url: string) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Failed to fetch");
  return data;
};

const statusOptions = ["all", "pending", "paid", "processing", "completed", "delivered", "cancelled"];
const formatDate = (dateStr?: string) => {
  if (!dateStr) return "—";
  const iso = new Date(dateStr).toISOString();
  return iso.replace("T", " ").slice(0, 16);
};
const placeholderImg =
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=400&q=60";

function useIsClient() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const listUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    params.set("page", String(page));
    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);
    if (search.trim().length >= 3) params.set("search", search.trim());
    if (status !== "all") params.set("status", status);
    return `${API_BASE}/orders?${params.toString()}`;
  }, [search, status, page, limit, sortBy, sortDir]);

  const { data, error, isLoading, mutate } = useSWR(listUrl, fetcher);

  const detailUrl = selectedId ? `${API_BASE}/orders/${selectedId}` : null;
  const {
    data: detail,
    isLoading: detailLoading,
    error: detailError,
  } = useSWR(detailUrl, fetcher);

  const orders = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const handleSort = (field: "date" | "amount") => {
    setPage(1);
    if (sortBy === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
  };

  const handleMarkComplete = async (id: string) => {
    try {
      await fetch(`${API_BASE}/orders/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(typeof window !== "undefined" && localStorage.getItem("admin_token")
            ? { Authorization: `Bearer ${localStorage.getItem("admin_token")}` }
            : {}),
        },
        body: JSON.stringify({ status: "completed", deliveryStatus: "Completed" }),
      }).then(async (res) => {
        const payload = await res.json();
        if (!res.ok) throw new Error(payload?.message || "Failed to update");
      });
      mutate();
    } catch (err) {
      console.error(err);
      alert("Failed to update order status");
    }
  };

  if (!useIsClient()) return null;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, background: "#f6f8fb", minHeight: "100vh" }}>
        <HeaderBar title="Orders" />
        <Toolbar />
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" fontWeight={800} gutterBottom color="primary">
            Orders Management
          </Typography>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems="flex-start"
                sx={{ flexWrap: "wrap" }}
              >
                <TextField
                  size="small"
                  placeholder="Search by Order ID or User"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  fullWidth
                />
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel id="status-filter">Status</InputLabel>
                  <Select
                    labelId="status-filter"
                    value={status}
                    input={<OutlinedInput label="Status" />}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {statusOptions.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s === "all" ? "All statuses" : s}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel id="page-size">Page size</InputLabel>
                  <Select
                    labelId="page-size"
                    value={limit}
                    input={<OutlinedInput label="Page size" />}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 10;
                      setLimit(val);
                      setPage(1);
                    }}
                  >
                    {[10, 20, 30, 40, 50].map((n) => (
                      <MenuItem key={n} value={n}>
                        {n} / page
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={800} color="primary" gutterBottom>
                Orders
              </Typography>
              {isLoading && <CircularProgress size={20} sx={{ mt: 1 }} />}
              {error && (
                <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                  {error.message}
                </Typography>
              )}
              <TableContainer component={Paper} sx={{ mt: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Order ID</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Delivery</TableCell>
                      <TableCell sortDirection={sortBy === "amount" ? sortDir : false}>
                        <TableSortLabel
                          active={sortBy === "amount"}
                          direction={sortBy === "amount" ? sortDir : "asc"}
                          onClick={() => handleSort("amount")}
                        >
                          Total
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sortDirection={sortBy === "date" ? sortDir : false}>
                        <TableSortLabel
                          active={sortBy === "date"}
                          direction={sortBy === "date" ? sortDir : "desc"}
                          onClick={() => handleSort("date")}
                        >
                          Date
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orders.map((order: any) => {
                      const isComplete =
                        (order.status || "").toLowerCase().includes("complete") ||
                        (order.status || "").toLowerCase().includes("deliver");
                      return (
                        <TableRow
                          key={order._id}
                          hover
                          onClick={() => setSelectedId(order._id)}
                          sx={{ cursor: "pointer" }}
                        >
                          <TableCell>#{order._id?.slice(-6)}</TableCell>
                          <TableCell>{order.user?.name || order.user?.email || "User"}</TableCell>
                          <TableCell>
                            <StatusChip label={order.status} />
                          </TableCell>
                          <TableCell>
                            <StatusChip label={order.deliveryStatus || "—"} />
                          </TableCell>
                          <TableCell>${Number(order.totalAmount || 0).toFixed(2)}</TableCell>
                          <TableCell>{formatDate(order.createdAt)}</TableCell>
                          <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                            <RowActions
                              disabled={isComplete}
                              onComplete={() => handleMarkComplete(order._id)}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {orders.length === 0 && !isLoading && (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          No orders found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, p) => setPage(p)}
                  color="primary"
                  size="small"
                />
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Box>

      <OrderDetailDialog
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        order={detail?.data}
        loading={detailLoading}
        error={detailError}
      />
    </Box>
  );
}

function OrderDetailDialog({
  open,
  onClose,
  order,
  loading,
  error,
}: {
  open: boolean;
  onClose: () => void;
  order: any;
  loading: boolean;
  error: any;
}) {
  const resolved = order?.data ?? order; // handle {success,data} or plain object

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box>
          <Typography variant="h6" fontWeight={800}>
            Order Details
          </Typography>
          {resolved?._id && (
            <Typography variant="body2" color="text.secondary">
              #{resolved._id}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading && <CircularProgress size={20} />}
        {error && (
          <Typography color="error" variant="body2">
            Failed to load order
          </Typography>
        )}
        {resolved && (
          <Stack spacing={2}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.default",
              }}
            >
              <Typography variant="subtitle1" fontWeight={800} color="primary" gutterBottom>
                User & Order Details
              </Typography>
              <Stack spacing={2}>
                <Grid container spacing={1.5} columns={12}>
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <InfoChip label="User" value={resolved.user?.name || resolved.user?.email || "—"} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <InfoChip label="Email" value={resolved.user?.email || "—"} />
                  </Grid>
                </Grid>

                <Grid container spacing={1.5} columns={12}>
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Status
                      </Typography>
                      <StatusChip label={resolved.status} />
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Delivery
                      </Typography>
                      <StatusChip label={resolved.deliveryStatus || "—"} />
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <InfoChip label="Total" value={`$${Number(resolved.totalAmount || 0).toFixed(2)}`} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <InfoChip label="Placed At" value={formatDate(resolved.createdAt)} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    <InfoChip label="Updated" value={formatDate(resolved.updatedAt)} />
                  </Grid>
                </Grid>

                {resolved.paymentSnapshot && (
                  <Grid container spacing={1.5} columns={12}>
                    <Grid size={{ xs: 12, sm: 8, md: 6 }}>
                      <InfoChip
                        label="Payment"
                        value={`${resolved.paymentSnapshot.brand || "Card"} ${
                          resolved.paymentSnapshot.maskedCardNumber || ""
                        }`.trim()}
                      />
                    </Grid>
                  </Grid>
                )}

                {resolved.addressSnapshot && (
                  <Grid container spacing={1.5} columns={12}>
                    <Grid size={{ xs: 12 }}>
                      <InfoChip
                        label="Address"
                        value={[
                          resolved.addressSnapshot.fullName,
                          resolved.addressSnapshot.line1,
                          resolved.addressSnapshot.line2,
                          resolved.addressSnapshot.city,
                          resolved.addressSnapshot.zip,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                        fullWidth
                      />
                    </Grid>
                  </Grid>
                )}
              </Stack>
            </Box>
            <Divider />
            <Typography variant="subtitle1" fontWeight={700}>
              Items
            </Typography>
            <Stack spacing={1.2}>
              {resolved.items?.map((item: any, idx: number) => {
                const img =
                  item.medicine?.imageUrls?.[0] ||
                  item.medicine?.imageUrl ||
                  placeholderImg;
                return (
                  <Box
                    key={idx}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      p: 1,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      bgcolor: "background.default",
                    }}
                  >
                    <Avatar
                      variant="rounded"
                      src={img}
                      sx={{ width: 48, height: 48, bgcolor: "primary.light" }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" fontWeight={700}>
                        {item.medicine?.name || "Medicine"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.medicine?.manufacturer || "—"}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Typography variant="body2">Qty: {item.quantity}</Typography>
                      <Typography variant="body2">
                        ${Number(item.unitPrice || 0).toFixed(2)}
                      </Typography>
                      <Typography variant="body1" fontWeight={700} color="primary">
                        ${Number((item.unitPrice || 0) * (item.quantity || 0)).toFixed(2)}
                      </Typography>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: "background.default", border: "1px solid", borderColor: "divider" }}>
      <Typography variant="body1" fontWeight={700}>
        {label}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, wordBreak: "break-word" }}>
        {value}
      </Typography>
    </Box>
  );
}

function InfoChip({
  label,
  value,
  fullWidth = false,
}: {
  label: string;
  value: string;
  fullWidth?: boolean;
}) {
  return (
    <Box
      sx={{
        p: 1.25,
        borderRadius: 3,
        bgcolor: "action.hover",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 6px 14px rgba(0,0,0,0.04)",
        minHeight: 72,
        width: fullWidth ? "100%" : "auto",
      }}
    >
      <Typography
        variant="caption"
        sx={{ letterSpacing: 0.4, textTransform: "uppercase", color: "text.secondary", fontWeight: 600 }}
      >
        {label}
      </Typography>
      <Typography
        variant="body1"
        fontWeight={700}
        sx={{ mt: 0.5, wordBreak: "break-word", color: "text.primary" }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function RowActions({ disabled, onComplete }: { disabled: boolean; onComplete: () => void }) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  return (
    <>
      <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchorEl} open={open} onClose={() => setAnchorEl(null)}>
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            onComplete();
          }}
          disabled={disabled}
        >
          <DoneAllIcon fontSize="small" sx={{ mr: 1 }} /> Mark as Complete
        </MenuItem>
      </Menu>
    </>
  );
}
