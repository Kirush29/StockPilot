import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { apiClient } from '../services/apiClient';

interface User {
    id: string;
    username: string;
    role: string;
    branchId: string | null;
    // Extended profile fields (may be absent for legacy tokens)
    email?: string;
    employeeNumber?: string;
    fullName?: string;
    phoneNumber?: string;
    address?: string;
    district?: string;
    profileImageUrl?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, userData: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
    getDashboardPath: (role: string) => string;
}

export const getDashboardPath = (role: string) => {
    switch (role) {
        case 'BusinessOwner':
        case 'SystemAdministrator':
            return '/owner';
        case 'ProcurementManager':
            return '/procurement';
        case 'BranchManager':
            return '/branch';
        case 'StoreEmployee':
            return '/inventory/dashboard';
        default:
            return '/';
    }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const validateSession = async () => {
            const storedToken = localStorage.getItem('token');
            if (!storedToken) {
                setIsLoading(false);
                return;
            }

            try {
                // Verify the token by fetching the user profile from the API
                const response = await apiClient.get<User>('/auth/me', {
                    headers: { Authorization: `Bearer ${storedToken}` }
                });

                setToken(storedToken);
                setUser(response);
                localStorage.setItem('user', JSON.stringify(response));
            } catch (err) {
                console.error("Session validation failed", err);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setToken(null);
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        validateSession();
        const handleUnauthorized = () => logout();
        window.addEventListener('auth:401', handleUnauthorized);
        return () => window.removeEventListener('auth:401', handleUnauthorized);
    }, []);

    const login = (newToken: string, userData: User) => {
        setToken(newToken);
        setUser(userData);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const logout = async () => {
        try {
            await apiClient.post('/auth/logout');
        } catch (e) {
            console.error("Logout API failed", e);
        }
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.replace('/login');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#121212]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[var(--text)] text-sm font-medium animate-pulse">Verifying session...</p>
                </div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, isLoading, getDashboardPath }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
