"use client";

import {
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  useTheme,
} from "@mui/material";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PeopleIcon from "@mui/icons-material/People";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: <DashboardIcon /> },
  { label: "Orders", href: "/orders", icon: <ReceiptLongIcon /> },
  { label: "Users", href: "/users", icon: <PeopleIcon /> },
  { label: "Medicines", href: "/medicines", icon: <MedicalServicesIcon /> },
  { label: "Config", href: "/config", icon: <SettingsIcon /> },
];

const DRAWER_WIDTH = 230;
const DRAWER_COLLAPSED = 74;
const HEADER_OFFSET_PX = 64; // height of your top header/appbar

export default function Sidebar() {
  const theme = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false); // default expanded

  const toggleCollapsed = () => {
    setCollapsed((prev) => !prev);
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user");
    }
    router.push("/login");
  };

  const drawerWidth = collapsed ? DRAWER_COLLAPSED : DRAWER_WIDTH;

  return (
    <Drawer
      variant="permanent"
      sx={(t) => ({
        width: drawerWidth,
        flexShrink: 0,
        whiteSpace: "nowrap",
        overflowX: "hidden",
        transition: t.transitions.create("width", {
          easing: t.transitions.easing.sharp,
          duration: t.transitions.duration.enteringScreen,
        }),
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          borderRight: "none",
          backgroundColor: theme.palette.primary.main,
          color: "#fff",
          overflowY: "auto",
          overflowX: "hidden",
          position: "fixed",
          top: HEADER_OFFSET_PX,
          left: 0,
          height: `calc(100vh - ${HEADER_OFFSET_PX}px)`,
          transition: t.transitions.create("width", {
            easing: t.transitions.easing.sharp,
            duration: t.transitions.duration.enteringScreen,
          }),
        },
      })}
    >
      {/* Sidebar Content */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          position: "relative",
          pt: 1.5,
        }}
      >
        {/* Navigation Links */}
        <List sx={{ flexGrow: 1, py: 0.5 }}>
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`) ||
              (item.href === "/dashboard" &&
                (pathname === "/" || pathname === ""));

            return (
              <ListItemButton
                key={item.href}
                selected={active}
                onClick={() => router.push(item.href)}
                sx={{
                  borderRadius: 2,
                  mx: collapsed ? 1 : 2,
                  mb: 0.5,
                  transition:
                    "background 0.2s ease, color 0.2s ease, padding 0.2s ease",
                  justifyContent: collapsed ? "center" : "flex-start",
                  px: collapsed ? 1.2 : 2,
                  "&.Mui-selected": {
                    backgroundColor: "#fff",
                    color: theme.palette.primary.main,
                    "& .MuiListItemIcon-root": {
                      color: theme.palette.primary.main,
                    },
                    "&:hover": {
                      backgroundColor: "#fff",
                    },
                  },
                  "&:hover": {
                    backgroundColor: active
                      ? "#fff"
                      : "rgba(255,255,255,0.15)",
                  },
                  color: "rgba(255,255,255,0.92)",
                }}
                title={collapsed ? item.label : undefined}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: collapsed ? 0 : 1.5,
                    justifyContent: "center",
                    color: active
                      ? theme.palette.primary.main
                      : "rgba(255,255,255,0.9)",
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      noWrap: true,
                      fontSize: 14,
                      fontWeight: active ? 600 : 400,
                    }}
                  />
                )}
              </ListItemButton>
            );
          })}
        </List>

        {/* Logout Button at Bottom */}
        <Stack spacing={0.5} sx={{ px: collapsed ? 1 : 2, pb: 2 }}>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              backgroundColor: "rgba(235, 36, 22, 0.71)",
              color: "#fff",
              justifyContent: collapsed ? "center" : "flex-start",
              px: collapsed ? 1.2 : 2,
              transition: "background 0.2s ease, opacity 0.2s",
              "&:hover": {
                opacity: 1,
                backgroundColor: "rgba(244,67,54,0.2)",
              },
            }}
            title={collapsed ? "Logout" : undefined}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: collapsed ? 0 : 1.5,
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <LogoutIcon />
            </ListItemIcon>
            {!collapsed && (
              <ListItemText
                primary="Logout"
                primaryTypographyProps={{
                  noWrap: true,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              />
            )}
          </ListItemButton>
        </Stack>

        {/* Collapse / Expand Action Button anchored to middle right edge */}
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            right: -14,
            transform: "translateY(-50%)",
            zIndex: 2,
          }}
        >
          <Tooltip title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <IconButton
              size="medium"
              onClick={toggleCollapsed}
              sx={{
                backgroundColor: "#ffffff",
                borderRadius: "50%",
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                border: "1px solid #cdd7f5",
                transition: "transform 0.2s ease, background 0.2s ease",
                "&:hover": {
                  backgroundColor: "#f3f4ff",
                  transform: "scale(1.08)",
                },
              }}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <ChevronRightIcon
                  htmlColor={theme.palette.primary.main}
                  fontSize="medium"
                />
              ) : (
                <ChevronLeftIcon
                  htmlColor={theme.palette.primary.main}
                  fontSize="medium"
                />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Drawer>
  );
}
