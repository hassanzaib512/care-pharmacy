"use client";

import { Box, Typography } from "@mui/material";
import { ReactNode } from "react";

export default function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number | string;
  icon?: ReactNode;
}) {
  return (
    <Box
      sx={{
        borderRadius: 4,
        p: 2.5,
        background: "linear-gradient(135deg, #f1f5ff, #f8fbff)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        minHeight: 130,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <Box display="flex" alignItems="center" gap={1}>
        {icon}
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
      </Box>
      <Typography variant="h4" fontWeight={800} color="primary">
        {value}
      </Typography>
    </Box>
  );
}
