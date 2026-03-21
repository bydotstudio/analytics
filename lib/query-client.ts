import { QueryClient } from "@tanstack/react-query";

let browserClient: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === "undefined") {
    return new QueryClient({
      defaultOptions: { queries: { staleTime: 30_000 } },
    });
  }
  if (!browserClient) {
    browserClient = new QueryClient({
      defaultOptions: { queries: { staleTime: 30_000 } },
    });
  }
  return browserClient;
}
