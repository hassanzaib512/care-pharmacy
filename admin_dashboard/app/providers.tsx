"use client";

import { CssBaseline, ThemeProvider, StyledEngineProvider, createTheme } from "@mui/material";
import type { ReactNode } from "react";
import EmotionCacheProvider from "./emotionCache";

// Align with Care Pharmacy Flutter primary blue
const theme = createTheme({
  palette: {
    primary: { main: "#3366CC" },
    secondary: { main: "#0F9D9D" },
    background: { default: "#f6f8fb", paper: "#ffffff" },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily:
      "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.05)" },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 700, borderRadius: 12 },
      },
    },
    MuiTableHead: {
      styleOverrides: { root: { backgroundColor: "#eef3ff" } },
    },
    MuiTableCell: {
      styleOverrides: { root: { paddingTop: 12, paddingBottom: 12 } },
    },
  },
});

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <EmotionCacheProvider>
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </StyledEngineProvider>
    </EmotionCacheProvider>
  );
}
