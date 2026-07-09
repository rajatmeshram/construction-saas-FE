"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useLayoutEffect, useState } from "react";
import { Provider } from "react-redux";

import { store } from "@/store";
import { hydrateSession } from "@/store/auth-slice";
import { useAppSelector } from "@/store/hooks";

function SessionGate({ children }: { children: ReactNode }) {
  const hydrated = useAppSelector((state) => state.auth.hydrated);

  useLayoutEffect(() => {
    if (!hydrated) {
      store.dispatch(hydrateSession());
    }
  }, [hydrated]);

  if (!hydrated) {
    return null;
  }

  return children;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <SessionGate>{children}</SessionGate>
      </QueryClientProvider>
    </Provider>
  );
}
