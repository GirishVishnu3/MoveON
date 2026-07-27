"use client";
import { Provider } from "react-redux";
import { store } from "shared/src";
import GlobalNotificationListener from "./GlobalNotificationListener";
import { useEffect } from "react";
import { hydrateAuth } from "shared/src/store/authSlice";
import LocationPrompt from "shared/src/components/location/LocationPrompt";

function AuthHydrator({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    store.dispatch(hydrateAuth());
  }, []);
  return <>{children}</>;
}

export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Provider store={store}>
      <AuthHydrator>
        <GlobalNotificationListener />
        <LocationPrompt />
        {children}
      </AuthHydrator>
    </Provider>
  );
}
