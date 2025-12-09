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
  TableSortLabel,
  Avatar,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import { useMemo, useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import HeaderBar from "../components/HeaderBar";
import Grid from "@mui/material/Grid";

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

const formatAddress = (addr?: any) =>
  [
    addr?.fullName,
    addr?.line1,
    addr?.line2,
    addr?.city,
    addr?.zip,
  ]
    .filter(Boolean)
    .join(", ") || "—";

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "—";
  const iso = new Date(dateStr).toISOString();
  return iso.replace("T", " ").slice(0, 16);
};

const useIsClient = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
};

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "total">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const listUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);
    if (search.trim().length >= 3) params.set("search", search.trim());
    return `${API_BASE}/users?${params.toString()}`;
  }, [page, limit, sortBy, sortDir, search]);

  const { data, error, isLoading } = useSWR(listUrl, fetcher);
  const detailUrl = selectedId ? `${API_BASE}/users/${selectedId}` : null;
  const { data: detail, isLoading: detailLoading, error: detailError } = useSWR(detailUrl, fetcher);

  const users = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const isClient = useIsClient();

  const handleSort = (field: "name" | "total") => {
    setPage(1);
    if (sortBy === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir(field === "name" ? "asc" : "desc");
    }
  };

  if (!isClient) return null;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, background: "#f6f8fb", minHeight: "100vh" }}>
        <HeaderBar title="Users" />
        <Toolbar />
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" fontWeight={800} gutterBottom color="primary">
            Users Management
          </Typography>

          <Card sx={{ mb: 2, maxWidth: 760, mx: "auto" }}>
            <CardContent>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="center" justifyContent="center" sx={{ flexWrap: "wrap" }}>
                <TextField
                  size="small"
                  placeholder="Search by name, email, or address"
                  value={search}
                  onChange={(e) => {
                    setPage(1);
                    setSearch(e.target.value);
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ flex: 1, minWidth: { xs: "100%", sm: 240 }, maxWidth: { sm: 360 } }}
                />
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel id="user-page-size">Page size</InputLabel>
                  <Select
                    labelId="user-page-size"
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
                Users
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
                      <TableCell sortDirection={sortBy === "name" ? sortDir : false}>
                        <TableSortLabel
                          active={sortBy === "name"}
                          direction={sortBy === "name" ? sortDir : "asc"}
                          onClick={() => handleSort("name")}
                        >
                          Name
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Address</TableCell>
                      <TableCell>Orders</TableCell>
                      <TableCell sortDirection={sortBy === "total" ? sortDir : false}>
                        <TableSortLabel
                          active={sortBy === "total"}
                          direction={sortBy === "total" ? sortDir : "desc"}
                          onClick={() => handleSort("total")}
                        >
                          Total Spent
                        </TableSortLabel>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map((u: any) => (
                      <TableRow
                        key={u._id}
                        hover
                        sx={{ cursor: "pointer" }}
                        onClick={() => setSelectedId(u._id)}
                      >
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Avatar
                              sx={{ width: 30, height: 30, bgcolor: "primary.light", color: "primary.main" }}
                              src={u.avatarUrl || undefined}
                            >
                              {(u.name || u.email || "U").slice(0, 1).toUpperCase()}
                            </Avatar>
                            <Typography>{u.name || "User"}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>{formatAddress(u.address)}</TableCell>
                        <TableCell>{u.ordersCount ?? 0}</TableCell>
                        <TableCell>${Number(u.totalSpend || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    {users.length === 0 && !isLoading && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          No users found.
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

      <UserDetailDialog
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        user={detail?.data}
        loading={detailLoading}
        error={detailError}
      />
    </Box>
  );
}

function UserDetailDialog({
  open,
  onClose,
  user,
  loading,
  error,
}: {
  open: boolean;
  onClose: () => void;
  user: any;
  loading: boolean;
  error: any;
}) {
  const resolved = user?.data ?? user;
  const u = resolved?.user ?? resolved;
  const orders = resolved?.orders ?? [];
  const ordersCount = u?.ordersCount ?? orders.length ?? 0;
  const computedSpend =
    orders.reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0) ||
    Number(u?.totalSpend || 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography component="span" variant="h6" fontWeight={800}>
          User Details
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading && <CircularProgress size={20} />}
        {error && (
          <Typography color="error" variant="body2">
            Failed to load user
          </Typography>
        )}
        {u && (
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <InfoCard label="Name" value={u.name || "—"} />
              <InfoCard label="Email" value={u.email || "—"} />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <InfoCard label="Orders" value={String(ordersCount)} />
              <InfoCard label="Total Spent" value={`$${computedSpend.toFixed(2)}`} />
            </Stack>
            <InfoCard label="Address" value={formatAddress(u.address)} fullWidth />
            <InfoCard label="Created" value={formatDate(u.createdAt)} />
            <InfoCard label="Updated" value={formatDate(u.updatedAt)} />
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoCard({
  label,
  value,
  fullWidth,
}: {
  label: string;
  value: string;
  fullWidth?: boolean;
}) {
  return (
    <Box
      sx={{
        p: 1.25,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.default",
        width: fullWidth ? "100%" : "auto",
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.3 }}>
        {label}
      </Typography>
      <Typography variant="body1" fontWeight={700} sx={{ mt: 0.5, wordBreak: "break-word" }}>
        {value}
      </Typography>
    </Box>
  );
}
