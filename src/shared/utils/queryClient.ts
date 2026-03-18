import { QueryClient } from '@tanstack/react-query'

/**
 * Instancia singleton del QueryClient.
 * Centralizada aquí para que pueda usarse tanto en main.tsx (QueryClientProvider)
 * como en cualquier parte que necesite acceso al caché sin hooks.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
