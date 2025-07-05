import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // If there's an error (like 401), we're not loading anymore
  const actuallyLoading = isLoading && !error;

  return {
    user,
    isLoading: actuallyLoading,
    isAuthenticated: !!user,
  };
}