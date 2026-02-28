import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';

export default function HostelScreen() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) router.replace('/login');
  }, [isAuthenticated, isLoading, router]);

  return (
    <View className="flex-1 bg-[#F5F7FA] px-5 pt-14">
      <Text className="text-2xl font-extrabold text-slate-900">Hostel</Text>
      <Text className="mt-2 text-sm text-slate-500">Coming soon.</Text>
    </View>
  );
}

