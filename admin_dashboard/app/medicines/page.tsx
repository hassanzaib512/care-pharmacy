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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  CircularProgress,
  Toolbar,
  Pagination,
  TableSortLabel,
  Avatar,
  Snackbar,
  Alert,
  Chip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import { useMemo, useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import HeaderBar from "../components/HeaderBar";

const API_BASE = process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL || "http://localhost:3000/api/admin";
const placeholderImg =
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=400&q=60";
const resolveImageUrl = (url?: string) => {
  if (!url) return placeholderImg;
  if (url.startsWith("http")) return url;
  const base = (process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL || "").replace(/\/api\/admin$/, "");
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
};

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
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Failed to fetch");
  return data;
};

const formatCurrency = (v?: number) => `$${Number(v || 0).toFixed(2)}`;

export default function MedicinesPage() {
  const [search, setSearch] = useState("");
  const [minRating, setMinRating] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "price" | "rating">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });
  const isClient = useIsClient();

  const listUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);
    if (search.trim().length >= 3) params.set("search", search.trim());
    if (minRating !== "all") params.set("rating", minRating);
    return `${API_BASE}/medicines?${params.toString()}`;
  }, [page, limit, sortBy, sortDir, search, minRating]);

  const { data, error, isLoading, mutate } = useSWR(listUrl, fetcher);
  const detailUrl = selectedId ? `${API_BASE}/medicines/${selectedId}` : null;
  const { data: detail, isLoading: detailLoading, error: detailError } = useSWR(detailUrl, fetcher);
  const editUrl = editId && editId !== "new" ? `${API_BASE}/medicines/${editId}` : null;
  const { data: editData } = useSWR(editUrl, fetcher);

  const medicines = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  const handleSort = (field: "name" | "price" | "rating") => {
    setPage(1);
    if (sortBy === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir(field === "name" ? "asc" : "desc");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await fetch(`${API_BASE}/medicines/${deleteId}`, {
        method: "DELETE",
        headers: {
          ...(typeof window !== "undefined" && localStorage.getItem("admin_token")
            ? { Authorization: `Bearer ${localStorage.getItem("admin_token")}` }
            : {}),
        },
      }).then(async (res) => {
        const payload = await res.json();
        if (!res.ok) throw new Error(payload?.message || "Failed to delete");
      });
      setDeleteId(null);
      mutate();
      setToast({ open: true, message: "Medicine deleted", severity: "error" });
    } catch (err) {
      setToast({ open: true, message: "Failed to delete medicine", severity: "error" });
      return;
    }
  };

const handleSave = async (payload: any) => {
  try {
    const isEditing = !!editId && editId !== "new";
      const norm = (v: string) => v.trim().toLowerCase();
      const dup = medicines.some(
        (m: any) =>
          (!isEditing || m._id !== editId) &&
          norm(m.name || "") === norm(payload.name || "") &&
          norm(m.manufacturer || "") === norm(payload.manufacturer || "") &&
          norm(m.category || "") === norm(payload.category || "")
      );
      if (dup) {
        setToast({ open: true, message: "Medicine already exists", severity: "error" });
        return false;
      }

    const removed = Array.isArray(payload.removedImages) ? payload.removedImages : [];
    const cleanExisting = Array.from(new Set(payload.imageUrls || [])).filter((u) => u && !removed.includes(u));
    let imageUrls = [...cleanExisting];
      if (payload.files && payload.files.length) {
        const formData = new FormData();
        Array.from(payload.files as FileList).forEach((file) => formData.append("images", file));
        const uploadRes = await fetch(`${API_BASE}/medicines/images`, {
          method: "POST",
          headers: {
            ...(typeof window !== "undefined" && localStorage.getItem("admin_token")
              ? { Authorization: `Bearer ${localStorage.getItem("admin_token")}` }
              : {}),
          },
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData?.message || "Failed to upload images");
        imageUrls = [...imageUrls, ...(uploadData.data || [])];
      }

      const body = {
        ...payload,
        imageUrls,
        composition: (payload.composition || []).map((c: string) => c.trim()).filter(Boolean),
        precautions: (payload.precautions || []).map((p: string) => p.trim()).filter(Boolean),
      };
      delete body.files;
      delete body.removedImages;

      const method = isEditing ? "PUT" : "POST";
      const url = isEditing ? `${API_BASE}/medicines/${editId}` : `${API_BASE}/medicines`;

      await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(typeof window !== "undefined" && localStorage.getItem("admin_token")
            ? { Authorization: `Bearer ${localStorage.getItem("admin_token")}` }
            : {}),
        },
        body: JSON.stringify(body),
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Failed to save");
        return data;
      });
      if (removed.length) {
        await Promise.all(
          removed.map(async (url) => {
            try {
              await fetch(`${API_BASE}/medicines/image`, {
                method: "DELETE",
                headers: {
                  "Content-Type": "application/json",
                  ...(typeof window !== "undefined" && localStorage.getItem("admin_token")
                    ? { Authorization: `Bearer ${localStorage.getItem("admin_token")}` }
                    : {}),
                },
                body: JSON.stringify({ url }),
              });
            } catch (_) {
              // ignore image delete errors
            }
          })
        );
      }
      setEditId(null);
      mutate();
      setToast({ open: true, message: "Medicine saved", severity: "success" });
      return true;
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : "Failed to save medicine", severity: "error" });
      return false;
    }
  };

  if (!isClient) return null;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, background: "#f6f8fb", minHeight: "100vh" }}>
        <HeaderBar title="Medicines" />
        <Toolbar />
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" fontWeight={800} gutterBottom color="primary">
            Medicines Management
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
                  placeholder="Search by name or manufacturer"
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
                  sx={{ flex: 1, minWidth: { xs: "100%", sm: 260 } }}
                />
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel id="rating-filter">Rating</InputLabel>
                  <Select
                    labelId="rating-filter"
                    value={minRating}
                    input={<OutlinedInput label="Rating" />}
                    onChange={(e) => {
                      setPage(1);
                      setMinRating(e.target.value);
                    }}
                  >
                    <MenuItem value="all">All ratings</MenuItem>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <MenuItem key={n} value={String(n)}>
                        {n}+
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel id="meds-page-size">Page size</InputLabel>
                  <Select
                    labelId="meds-page-size"
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
                Medicines
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setEditId("new")}
                  size="small"
                >
                  Add Medicine
                </Button>
              </Box>
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
                      <TableCell>Image</TableCell>
                      <TableCell sortDirection={sortBy === "name" ? sortDir : false}>
                        <TableSortLabel
                          active={sortBy === "name"}
                          direction={sortBy === "name" ? sortDir : "asc"}
                          onClick={() => handleSort("name")}
                        >
                          Name
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>Manufacturer</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell sortDirection={sortBy === "rating" ? sortDir : false}>
                        <TableSortLabel
                          active={sortBy === "rating"}
                          direction={sortBy === "rating" ? sortDir : "desc"}
                          onClick={() => handleSort("rating")}
                        >
                          Rating
                        </TableSortLabel>
                      </TableCell>
                      <TableCell sortDirection={sortBy === "price" ? sortDir : false}>
                        <TableSortLabel
                          active={sortBy === "price"}
                          direction={sortBy === "price" ? sortDir : "asc"}
                          onClick={() => handleSort("price")}
                        >
                          Price
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="center">Deleted</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {medicines.map((m: any) => {
                      const img = resolveImageUrl(m.imageUrls?.[0] || m.imageUrl);
                      return (
                        <TableRow
                          key={m._id}
                          hover
                          sx={{ cursor: "pointer" }}
                          onClick={() => setSelectedId(m._id)}
                        >
                          <TableCell>
                            <Avatar variant="rounded" src={img} sx={{ width: 40, height: 40 }} />
                          </TableCell>
                          <TableCell>{m.name}</TableCell>
                          <TableCell>{m.manufacturer || "—"}</TableCell>
                          <TableCell>{m.category || "—"}</TableCell>
                          <TableCell>
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
                                    clipPath: `inset(0 ${100 - Math.max(0, Math.min(5, Number(m.rating || 0))) * 20}% 0 0)`,
                                  }}
                                />
                              </Box>
                              <Typography variant="body2">
                                {Number(m.rating || 0).toFixed(1)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ({m.reviewsCount || 0})
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>{formatCurrency(m.price)}</TableCell>
                          <TableCell align="center">
                            <Chip
                              label={m.is_deleted ? "Deleted" : "Active"}
                              size="small"
                              color={m.is_deleted ? "error" : "success"}
                              variant={m.is_deleted ? "filled" : "outlined"}
                            />
                          </TableCell>
                          <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <IconButton size="small" onClick={() => setEditId(m._id)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" onClick={() => setDeleteId(m._id)}>
                                <DeleteOutlineIcon fontSize="small" color="error" />
                              </IconButton>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {medicines.length === 0 && !isLoading && (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          No medicines found.
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

      <MedicineDetailDialog
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        medicineId={selectedId}
      />
      <MedicineEditDialog
        open={Boolean(editId)}
        onClose={() => setEditId(null)}
        medicineId={editId === "new" ? null : editId}
        onSave={handleSave}
        medicine={editData?.data}
      />
      <DeleteConfirmDialog
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
      />
      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        open={toast.open}
        autoHideDuration={2500}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      >
        <Alert
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          severity={toast.severity}
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function MedicineDetailDialog({
  open,
  onClose,
  medicineId,
}: {
  open: boolean;
  onClose: () => void;
  medicineId: string | null;
}) {
  const url = medicineId ? `${API_BASE}/medicines/${medicineId}` : null;
  const { data, error, isLoading } = useSWR(url, fetcher);
  const med = data?.data;
  const img = resolveImageUrl(med?.imageUrls?.[0] || med?.imageUrl);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography component="span" variant="h6" fontWeight={800}>
          Medicine Details
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {isLoading && <CircularProgress size={20} />}
        {error && (
          <Typography color="error" variant="body2">
            Failed to load medicine
          </Typography>
        )}
        {med && (
          <Stack spacing={2}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar variant="rounded" src={img} sx={{ width: 56, height: 56 }} />
              <Box>
                <Typography variant="h6" fontWeight={800}>
                  {med.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {med.manufacturer || "—"}
                </Typography>
              </Box>
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <InfoCard label="Category" value={med.category || "—"} />
              <InfoCard label="Price" value={formatCurrency(med.price)} />
            </Stack>
            <InfoCard label="Description" value={med.description || "—"} fullWidth />
            <InfoCard label="Usage" value={med.usage || "—"} fullWidth />
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
                Composition
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {(med.composition || []).length
                  ? med.composition.map((c: string, idx: number) => (
                      <Chip key={`comp-${idx}`} label={c} size="small" color="primary" variant="outlined" />
                    ))
                  : <Typography variant="body2" color="text.secondary">—</Typography>}
              </Stack>
            </Stack>
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
                Precautions
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {(med.precautions || []).length
                  ? med.precautions.map((p: string, idx: number) => (
                      <Chip key={`prec-${idx}`} label={p} size="small" color="secondary" variant="outlined" />
                    ))
                  : <Typography variant="body2" color="text.secondary">—</Typography>}
              </Stack>
            </Stack>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MedicineEditDialog({
  open,
  onClose,
  medicineId,
  onSave,
  medicine,
}: {
  open: boolean;
  onClose: () => void;
  medicineId: string | null;
  onSave: (payload: any) => Promise<boolean>;
  medicine?: any;
}) {
  const med = medicineId ? medicine : null;
  const [form, setForm] = useState({
    name: med?.name || "",
    manufacturer: med?.manufacturer || "",
    category: med?.category || "",
    price: med?.price || 0,
    description: med?.description || "",
    usage: med?.usage || "",
    imageUrls: med?.imageUrls || [],
    composition: med?.composition || [],
    precautions: med?.precautions || [],
  });
  const [files, setFiles] = useState<FileList | null>(null);
  const [compInput, setCompInput] = useState("");
  const [precInput, setPrecInput] = useState("");
  const [removedImages, setRemovedImages] = useState<string[]>([]);
  const handleRemoveImage = async (url: string) => {
    setForm((prev) => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((u: string) => u !== url),
    }));
    setRemovedImages((prev) => (prev.includes(url) ? prev : [...prev, url]));
  };

  useEffect(() => {
    if (med) {
      setForm({
        name: med.name || "",
        manufacturer: med.manufacturer || "",
        category: med.category || "",
        price: med.price || 0,
        description: med.description || "",
        usage: med.usage || "",
        imageUrls: med.imageUrls || [],
        composition: med.composition || [],
        precautions: med.precautions || [],
      });
      setFiles(null);
      setCompInput("");
      setPrecInput("");
      setRemovedImages([]);
    } else if (!medicineId) {
      setForm({
        name: "",
        manufacturer: "",
        category: "",
        price: 0,
        description: "",
        usage: "",
        imageUrls: [],
        composition: [],
        precautions: [],
      });
      setFiles(null);
      setCompInput("");
      setPrecInput("");
      setRemovedImages([]);
    }
  }, [med, medicineId]);

  const handleChange = (field: keyof typeof form, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const title = medicineId ? "Update Medicine" : "Add Medicine";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography component="span" variant="h6" fontWeight={800}>
          {title}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Name"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Manufacturer"
            value={form.manufacturer}
            onChange={(e) => handleChange("manufacturer", e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Category"
            value={form.category}
            onChange={(e) => handleChange("category", e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Price"
            type="number"
            value={form.price}
            onChange={(e) => handleChange("price", Number(e.target.value))}
            required
            fullWidth
          />
          <TextField
            label="Description"
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
          <TextField
            label="Usage"
            value={form.usage}
            onChange={(e) => handleChange("usage", e.target.value)}
            multiline
            minRows={2}
            required
            fullWidth
          />
          <Stack spacing={1}>
            <Typography variant="body2" fontWeight={600}>
              Images
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {form.imageUrls?.map((url: string, idx: number) => (
                <Box key={idx} sx={{ position: "relative" }}>
                  <Avatar
                    variant="rounded"
                    src={resolveImageUrl(url)}
                    sx={{ width: 60, height: 60, bgcolor: "primary.light" }}
                  />
                  <IconButton
                    size="small"
                    sx={{ position: "absolute", top: -8, right: -8, bgcolor: "white" }}
                    onClick={() => handleRemoveImage(url)}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              {(!form.imageUrls || form.imageUrls.length === 0) && (
                <Typography variant="caption" color="text.secondary">
                  No images yet
                </Typography>
              )}
            </Stack>
            <Button variant="outlined" component="label" size="small">
              Upload Images
              <input
                hidden
                multiple
                accept="image/*"
                type="file"
                onChange={(e) => setFiles(e.target.files)}
              />
            </Button>
            {files && files.length > 0 && (
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {Array.from(files).map((file, idx) => (
                  <Box key={idx} sx={{ position: "relative" }}>
                    <Avatar
                      variant="rounded"
                      src={URL.createObjectURL(file)}
                      sx={{ width: 60, height: 60, bgcolor: "primary.light" }}
                    />
                    <IconButton
                      size="small"
                      sx={{ position: "absolute", top: -8, right: -8, bgcolor: "white" }}
                      onClick={() => {
                        const next = Array.from(files);
                        next.splice(idx, 1);
                        const dt = new DataTransfer();
                        next.forEach((f) => dt.items.add(f));
                        setFiles(dt.files);
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            )}
            <Stack spacing={1}>
              <Typography variant="body2" fontWeight={600}>
                Composition
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {(form.composition || []).map((c: string, idx: number) => (
                  <Chip key={idx} label={c} onDelete={() =>
                    setForm((prev) => ({
                      ...prev,
                      composition: prev.composition.filter((val: string, i: number) => i !== idx),
                    }))
                  } />
                ))}
              </Stack>
              <TextField
                size="small"
                placeholder="Add composition and press Enter"
                value={compInput}
                onChange={(e) => setCompInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const val = compInput.trim();
                    if (val.length >= 1) {
                      setForm((prev) => ({
                        ...prev,
                        composition: [...(prev.composition || []), val],
                      }));
                      setCompInput("");
                    }
                  }
                }}
                required
              />
            </Stack>
            <Stack spacing={1}>
              <Typography variant="body2" fontWeight={600}>
                Precautions
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {(form.precautions || []).map((p: string, idx: number) => (
                  <Chip key={idx} label={p} onDelete={() =>
                    setForm((prev) => ({
                      ...prev,
                      precautions: prev.precautions.filter((val: string, i: number) => i !== idx),
                    }))
                  } />
                ))}
              </Stack>
              <TextField
                size="small"
                placeholder="Add precaution and press Enter"
                value={precInput}
                onChange={(e) => setPrecInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const val = precInput.trim();
                    if (val.length >= 1) {
                      setForm((prev) => ({
                        ...prev,
                        precautions: [...(prev.precautions || []), val],
                      }));
                      setPrecInput("");
                    }
                  }
                }}
              />
            </Stack>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
        onClick={async () => {
          if (
            !form.name.trim() ||
            !form.manufacturer.trim() ||
            !form.category.trim() ||
            !form.usage.trim() ||
            !form.composition.length
          ) {
            alert("Please fill all required fields (name, manufacturer, category, usage, composition).");
            return;
          }
          const ok = await onSave({ ...form, files, removedImages });
          if (ok) {
            setForm({
              name: "",
              manufacturer: "",
              category: "",
              price: 0,
              description: "",
              usage: "",
              imageUrls: [],
              composition: [],
              precautions: [],
            });
            setFiles(null);
            setCompInput("");
            setPrecInput("");
            setRemovedImages([]);
            onClose();
          }
          }}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Delete medicine?</DialogTitle>
      <DialogContent dividers>
        <Typography>Are you sure you want to delete this medicine? This cannot be undone.</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="error" variant="contained" onClick={onConfirm}>
          Delete
        </Button>
      </DialogActions>
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
