"use client";

import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("admin_token");
      window.location.href = token ? "/dashboard" : "/login";
    }
  }, []);
  return null;
}
