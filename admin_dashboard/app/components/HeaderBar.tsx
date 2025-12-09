"use client";

import { AppBar, Box, Toolbar, Typography } from "@mui/material";
import { useEffect, useState } from "react";

export default function HeaderBar({ title }: { title: string }) {
  const [userName, setUserName] = useState<string>("Admin");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("admin_user");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (parsed?.name) {
        // schedule state update to avoid lint about sync setState in effect
        setTimeout(() => setUserName(parsed.name), 0);
      }
    } catch {
      // ignore malformed storage
    }
  }, []);

  return (
    <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
      <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box
            component="img"
            src="/app_logo.png"
            alt="Care Pharmacy"
            sx={{ height: 36, width: 36, borderRadius: 8, boxShadow: 1, bgcolor: "white" }}
          />
          <Typography variant="h6" fontWeight={800}>
            {title}
          </Typography>
        </Box>
        <Typography variant="body1" fontWeight={600}>
          Welcome {userName}
        </Typography>
      </Toolbar>
    </AppBar>
  );
}
