// app/_layout.js
import { Stack } from 'expo-router';
import { Provider } from 'react-redux';
import { ThemeProvider } from '../src/constants/theme';
import { store } from '../src/redux/store';
import AuthGuard from '../src/components/AuthGuard';  // Import the AuthGuard

// Create a Layout component to use hooks inside
function StackLayout() {
  return (
    <ThemeProvider>
      <AuthGuard>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth/login" />
          <Stack.Screen name="auth/signup" />
        </Stack>
      </AuthGuard>
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