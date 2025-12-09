"use client";

import useSWR from "swr";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  OutlinedInput,
  Select,
  MenuItem,
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
  Snackbar,
  Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import { useMemo, useState, useEffect } from "react";
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

export default function ConfigPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selected, setSelected] = useState<any | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" }>(
    { open: false, message: "", severity: "success" }
  );
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<{ key: string; payload: string }>({ key: "", payload: "" });
  const isClient = useIsClient();

  const listUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (search.trim().length >= 3) params.set("search", search.trim());
    return `${API_BASE}/config?${params.toString()}`;
  }, [page, limit, search]);

  const { data, error, isLoading, mutate } = useSWR(listUrl, fetcher);
  const configs = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  const openForm = (cfg?: any) => {
    if (cfg) {
      setForm({ key: cfg.key || "", payload: JSON.stringify(cfg.payload ?? {}, null, 2) });
      setSelected(cfg);
    } else {
      setForm({ key: "", payload: "" });
      setSelected(null);
    }
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.key.trim()) {
      setToast({ open: true, message: "Key is required", severity: "error" });
      return;
    }
    let parsed: any = form.payload;
    try {
      parsed = form.payload ? JSON.parse(form.payload) : {};
    } catch (_) {
      // keep as string if not valid JSON
      parsed = form.payload;
    }
    try {
      await fetch(`${API_BASE}/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(typeof window !== "undefined" && localStorage.getItem("admin_token")
            ? { Authorization: `Bearer ${localStorage.getItem("admin_token")}` }
            : {}),
        },
        body: JSON.stringify({
          key: form.key.trim(),
          payload: parsed,
          ...(selected?._id ? { id: selected._id } : {}),
        }),
      }).then(async (res) => {
        const payload = await res.json();
        if (!res.ok) throw new Error(payload?.message || "Failed to save config");
        return payload;
      });
      setFormOpen(false);
      setForm({ key: "", payload: "" });
      setSelected(null);
      mutate();
      setToast({ open: true, message: "Config saved", severity: "success" });
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : "Failed to save", severity: "error" });
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await fetch(`${API_BASE}/config/${confirmDelete}`, {
        method: "DELETE",
        headers: {
          ...(typeof window !== "undefined" && localStorage.getItem("admin_token")
            ? { Authorization: `Bearer ${localStorage.getItem("admin_token")}` }
            : {}),
        },
      }).then(async (res) => {
        const payload = await res.json();
        if (!res.ok) throw new Error(payload?.message || "Delete failed");
      });
      setConfirmDelete(null);
      mutate();
      setToast({ open: true, message: "Config deleted", severity: "error" });
    } catch (err) {
      setToast({ open: true, message: err instanceof Error ? err.message : "Delete failed", severity: "error" });
    }
  };

  if (!isClient) return null;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, background: "#f6f8fb", minHeight: "100vh" }}>
        <HeaderBar title="Config" />
        <Toolbar />
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" fontWeight={800} gutterBottom color="primary">
            Config Management
          </Typography>

          <Card sx={{ mb: 2, maxWidth: 520, mx: "auto" }}>
            <CardContent sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 2 }}>
              <TextField
                size="small"
                placeholder="Search by key"
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
                fullWidth
              />
              <FormControl size="small" sx={{ minWidth: 140, ml: 2 }}>
                <InputLabel id="config-page-size">Page size</InputLabel>
                <Select
                  labelId="config-page-size"
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
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h6" fontWeight={800} color="primary">
                  Configs
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={() => openForm()}>
                  Add Config
                </Button>
              </Stack>
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
                      <TableCell>Key</TableCell>
                      <TableCell>Value</TableCell>
                      <TableCell>Updated</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {configs.map((cfg: any) => (
                      <TableRow key={cfg._id} hover>
                        <TableCell>{cfg.key}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ maxWidth: 360, whiteSpace: "pre-wrap" }}>
                            {typeof cfg.payload === "object" ? JSON.stringify(cfg.payload) : String(cfg.payload)}
                          </Typography>
                        </TableCell>
                        <TableCell>{cfg.updatedAt ? new Date(cfg.updatedAt).toISOString().replace("T", " ").slice(0, 16) : "—"}</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <IconButton size="small" onClick={() => openForm(cfg)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => setConfirmDelete(cfg._id)}>
                              <DeleteOutlineIcon fontSize="small" color="error" />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                    {configs.length === 0 && !isLoading && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          No configs found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
                <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" size="small" />
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography component="span" variant="h6" fontWeight={800}>
            {selected ? "Update Config" : "Add Config"}
          </Typography>
          <IconButton onClick={() => setFormOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Key"
              value={form.key}
              onChange={(e) => setForm((prev) => ({ ...prev, key: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Payload (JSON or text)"
              value={form.payload}
              onChange={(e) => setForm((prev) => ({ ...prev, payload: e.target.value }))}
              multiline
              minRows={4}
              fullWidth
              placeholder='{"example": true}'
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete config?</DialogTitle>
        <DialogContent dividers>
          <Typography>Are you sure you want to delete this config? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

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
