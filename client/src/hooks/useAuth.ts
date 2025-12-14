import { useQuery } from "@tanstack/react-query";
import type { UserWithCollege } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<UserWithCollege | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn<UserWithCollege | null>({ on401: "returnNull" }),
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}
