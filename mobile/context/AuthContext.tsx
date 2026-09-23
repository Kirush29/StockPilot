import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';
import { useRouter, useSegments } from 'expo-router';

type AuthContextType = {
  user: any;
  token: string | null;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => {},
  logout: async () => {},
  isLoading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

function useProtectedRoute(user: any, isLoading: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, segments, isLoading, router]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadToken() {
      try {
        const storedToken = await SecureStore.getItemAsync('token');
        if (storedToken) {
          const decoded: any = jwtDecode(storedToken);
          const currentTime = Date.now() / 1000;
          if (decoded.exp && decoded.exp > currentTime) {
            setToken(storedToken);
            setUser({
              userId: decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'],
              email: decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
              role: decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'],
              branchId: decoded['BranchId'],
              mustChangePassword: decoded['MustChangePassword'] === 'True'
            });
          } else {
            await SecureStore.deleteItemAsync('token');
          }
        }
      } catch (error) {
        console.error('Failed to load token', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadToken();
  }, []);

  useProtectedRoute(user, isLoading);

  const login = async (newToken: string) => {
    await SecureStore.setItemAsync('token', newToken);
    setToken(newToken);
    const decoded: any = jwtDecode(newToken);
    setUser({
      userId: decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'],
      email: decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
      role: decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'],
      branchId: decoded['BranchId'],
      mustChangePassword: decoded['MustChangePassword'] === 'True'
    });
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
