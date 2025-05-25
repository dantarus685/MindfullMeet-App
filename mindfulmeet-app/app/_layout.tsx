// app/_layout.tsx
import { Stack } from 'expo-router';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { ThemeProvider, useTheme } from '../src/constants/theme';
import { store } from '../src/redux/store';
import AuthGuard from '../src/components/AuthGuard';
import { checkAuth } from '../src/redux/authSlice';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import type { ReactNode } from 'react';

// Types
interface AuthState {
  isInitialized: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  user: any;
  token: string | null;
  error: string | null;
}

interface RootState {
  auth: AuthState;
  events: any;
  rsvp: any;
  chat: any;
}

// Auth initializer component with proper typing
function AuthInitializer({ children }: { children: ReactNode }) {
  const { colors, typography, spacing } = useTheme();
  const dispatch = useDispatch<any>();
  const { isInitialized, isLoading, isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth
  );
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  useEffect(() => {
    // Only check auth once when component mounts
    if (!hasCheckedAuth) {
      console.log('🔄 Checking stored authentication...');
      dispatch(checkAuth()).finally(() => {
        setHasCheckedAuth(true);
        console.log('✅ Auth check completed');
      });
    }
  }, [dispatch, hasCheckedAuth]);

  // Show loading screen while checking auth or during initial load
  if (!hasCheckedAuth || !isInitialized || isLoading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: colors.background 
      }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{
          marginTop: spacing.md,
          color: colors.textSecondary,
          fontSize: typography.fontSizes.md
        }}>
          Loading...
        </Text>
      </View>
    );
  }

  console.log('🎯 Auth state:', { isAuthenticated, user: !!user, hasCheckedAuth });

  return <>{children}</>;
}

// Create a Layout component to use hooks inside
function StackLayout() {
  return (
    <ThemeProvider>
      <AuthInitializer>
        <AuthGuard>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="auth/login" />
            <Stack.Screen name="auth/signup" />
            <Stack.Screen name="events" />
            <Stack.Screen name="chat" />
          </Stack>
        </AuthGuard>
      </AuthInitializer>
    </ThemeProvider>
  );
}

// Root layout - can't use hooks here
export default function Layout() {
  return (
    <Provider store={store}>
      <StackLayout />
    </Provider>
  );
}