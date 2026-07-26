"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SplashScreen } from "shared/src";

export default function RootPage() {
  const router = useRouter();
  const [splashDone, setSplashDone] = useState(false);

  const handleSplashComplete = () => {
    setSplashDone(true);
  };

  // After splash completes, navigate to /auth to show phone login
  useEffect(() => {
    if (splashDone) {
      router.push("/auth");
    }
  }, [splashDone, router]);

  if (!splashDone) {
    return <SplashScreen onComplete={handleSplashComplete} durationMs={2000} />;
  }

  return null;
}

