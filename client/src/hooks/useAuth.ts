import { useQuery } from "@tanstack/react-query";
import type { UserWithCollege } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<UserWithCollege | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}
