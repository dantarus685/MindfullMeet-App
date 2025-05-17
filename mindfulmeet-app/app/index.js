import { Redirect } from 'expo-router';
// Option 1: Redirect to tabs
export default function Index() {
  return <Redirect href="/(tabs)" />;
}