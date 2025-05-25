// src/components/AuthGuard.js
import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { useSelector } from 'react-redux';

const AuthGuard = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isInitialized, isLoading, user } = useSelector(state => state.auth);

  useEffect(() => {
    // Don't redirect during loading or if not initialized
    if (isLoading || !isInitialized) {
      console.log('🔄 AuthGuard waiting...', { isLoading, isInitialized });
      return;
    }

    const publicRoutes = [
      '/auth/login', 
      '/auth/signup', 
      '/',
      '/index'
    ];
    
    const isPublicRoute = publicRoutes.includes(pathname);

    console.log('🛡️ AuthGuard check:', {
      pathname,
      isAuthenticated,
      isPublicRoute,
      isInitialized,
      hasUser: !!user
    });

    if (!isAuthenticated && !isPublicRoute) {
      // Redirect to login if not authenticated and trying to access private route
      console.log('🔒 Redirecting to login - not authenticated');
      router.replace('/auth/login');
    } else if (isAuthenticated && (pathname === '/auth/login' || pathname === '/auth/signup' || pathname === '/' || pathname === '/index')) {
      // Redirect to home if authenticated and trying to access auth routes or index
      console.log('🏠 Redirecting to tabs - already authenticated');
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isInitialized, isLoading, pathname, router, user]);

  // Always render children - navigation will be handled by useEffect
  return children;
};

export default AuthGuard;