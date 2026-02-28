import { AuthProvider } from '@/lib/auth-context';
import 'cross-fetch/polyfill';
import { Stack } from 'expo-router';
import 'react-native-url-polyfill/auto';
import '../global.css';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AuthProvider>
  );
}
