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
  Toolbar,
  Pagination,
  TableSortLabel,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import HeaderBar from "../components/HeaderBar";

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

const useIsClient = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "—";
  const iso = new Date(dateStr).toISOString();
  return iso.replace("T", " ").slice(0, 16);
};

const RatingChip = ({ value }: { value: number }) => {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Box sx={{ position: "relative", width: 18, height: 18, display: "inline-flex" }}>
        <StarRoundedIcon
          fontSize="small"
          sx={{ position: "absolute", inset: 0, color: "action.disabled" }}
        />
        <StarRoundedIcon
          fontSize="small"
          sx={{
            position: "absolute",
            inset: 0,
            color: "warning.main",
            clipPath: `inset(0 ${100 - pct}% 0 0)`,
          }}
        />
      </Box>
      <Typography variant="body2">{value.toFixed(1)}</Typography>
    </Stack>
  );
};

export default function ReviewsPage() {
  const [search, setSearch] = useState("");
  const [rating, setRating] = useState<string>("all");
  const [sortField, setSortField] = useState<"createdAt" | "rating">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const listUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    params.set("sortField", sortField);
    params.set("sortDirection", sortDir);
    if (search.trim().length >= 3) params.set("search", search.trim());
    if (rating !== "all") params.set("rating", rating);
    return `${API_BASE}/reviews?${params.toString()}`;
  }, [page, limit, sortField, sortDir, search, rating]);

  const { data, error, isLoading } = useSWR(listUrl, fetcher);
  const isClient = useIsClient();

  const reviews = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  const handleSort = (field: "createdAt" | "rating") => {
    setPage(1);
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "rating" ? "desc" : "desc");
    }
  };

  if (!isClient) return null;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, background: "#f6f8fb", minHeight: "100vh" }}>
        <HeaderBar title="Reviews" />
        <Toolbar />
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" fontWeight={800} gutterBottom color="primary">
            Reviews
          </Typography>

          <Card sx={{ mb: 2, maxWidth: 760, mx: "auto" }}>
            <CardContent>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                alignItems="center"
                justifyContent="center"
                sx={{ flexWrap: "wrap" }}
              >
                <TextField
                  size="small"
                  placeholder="Search review, user, or medicine"
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
                  <InputLabel id="rating-filter">Rating</InputLabel>
                  <Select
                    labelId="rating-filter"
                    value={rating}
                    input={<OutlinedInput label="Rating" />}
                    onChange={(e) => {
                      setPage(1);
                      setRating(e.target.value);
                    }}
                  >
                    <MenuItem value="all">All ratings</MenuItem>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <MenuItem key={n} value={String(n)}>
                        {n} star{n > 1 ? "s" : ""}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel id="review-page-size">Page size</InputLabel>
                  <Select
                    labelId="review-page-size"
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
                Reviews
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
                      <TableCell>Review</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell>Medicine</TableCell>
                      <TableCell sortDirection={sortField === "rating" ? sortDir : false}>
                        <TableSortLabel
                          active={sortField === "rating"}
                          direction={sortField === "rating" ? sortDir : "desc"}
                          onClick={() => handleSort("rating")}
                        >
                          Rating
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>Comment</TableCell>
                      <TableCell sortDirection={sortField === "createdAt" ? sortDir : false}>
                        <TableSortLabel
                          active={sortField === "createdAt"}
                          direction={sortField === "createdAt" ? sortDir : "desc"}
                          onClick={() => handleSort("createdAt")}
                        >
                          Created
                        </TableSortLabel>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reviews.map((review: any) => (
                      <TableRow key={review._id} hover>
                        <TableCell>#{review._id?.slice(-6)}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700}>
                            {review.user?.name || "—"}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {review.user?.email || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>{review.medicine?.name || "—"}</TableCell>
                        <TableCell>
                          <RatingChip value={Number(review.rating || 0)} />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 280 }}>
                          <Tooltip title={review.comment || ""} arrow disableInteractive>
                            <Typography variant="body2" noWrap>
                              {review.comment || "—"}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>{formatDate(review.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                    {reviews.length === 0 && !isLoading && (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          No reviews found.
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
    </Box>
  );
}
