"use client";

import { Chip } from "@mui/material";

const statusColor = (status: string) => {
  const s = status.toLowerCase();
  if (s.includes("cancel")) return { color: "error", variant: "filled" as const };
  if (s.includes("deliver") || s.includes("complete")) return { color: "success", variant: "filled" as const };
  if (s.includes("processing") || s.includes("progress")) return { color: "info", variant: "filled" as const };
  if (s.includes("paid")) return { color: "warning", variant: "filled" as const };
  if (s.includes("pending")) return { color: "warning", variant: "outlined" as const };
  return { color: "default", variant: "outlined" as const };
};

export default function StatusChip({ label }: { label: string }) {
  const { color, variant } = statusColor(label);
  return (
    <Chip
      size="small"
      color={color === "default" ? undefined : (color as "primary" | "success" | "error" | "warning" | "info")}
      variant={variant}
      label={label}
      sx={{ textTransform: "capitalize", fontWeight: 600 }}
    />
  );
}
