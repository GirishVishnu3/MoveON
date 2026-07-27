"use client";
import { APIProvider } from "@vis.gl/react-google-maps";

export default function MapsProvider({ children }: { children: React.ReactNode }) {
  // For prototyping without a key, you can still mount it.
  // The map will load in development mode or error out if invalid.
  // The user should set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  return <APIProvider apiKey={apiKey}>{children}</APIProvider>;
}
