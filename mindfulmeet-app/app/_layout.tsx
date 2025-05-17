// app/_layout.js
import { Stack } from 'expo-router';
import { Provider } from 'react-redux';
import { ThemeProvider } from '../src/constants/theme';
import { store } from '../src/redux/store';

export default function Layout() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="auth/login" />
          <Stack.Screen name="auth/signup" />
        </Stack>
      </ThemeProvider>
    </Provider>
  );
}