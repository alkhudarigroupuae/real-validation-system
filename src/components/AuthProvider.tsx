"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

const AUTH_KEY = "dashboard-auth";
const PASSWORD = "Belal100%";

export function useAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Always allow /login and API routes
    if (pathname === "/login" || pathname.startsWith("/api/")) {
      setIsLoading(false);
      return;
    }

    const auth = localStorage.getItem(AUTH_KEY);
    if (auth !== PASSWORD) {
      router.push("/login");
    } else {
      setIsAuthorized(true);
      setIsLoading(false);
    }
  }, [pathname, router]);

  return { isAuthorized, isLoading };
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isAuthorized, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        Loading...
      </div>
    );
  }

  return <>{children}</>;
}