"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const AUTH_KEY = "dashboard-auth";
const PASSWORD = "Belal100%";

export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthWrapper(props: P) {
    const [authorized, setAuthorized] = useState(false);
    const router = useRouter();

    useEffect(() => {
      const auth = localStorage.getItem(AUTH_KEY);
      if (auth !== PASSWORD) {
        router.push("/login");
      } else {
        setAuthorized(true);
      }
    }, [router]);

    if (!authorized) {
      return null;
    }

    return <Component {...props} />;
  };
}