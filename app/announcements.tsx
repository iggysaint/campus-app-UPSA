import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

type Announcement = {
  id: string;
  title: string | null;
  body: string | null;
  created_at: string | null;
};

export default function AnnouncementsScreen() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login');
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingItems(true);
        const { data, error } = await supabase
          .from('announcements')
          .select('id, title, body, created_at')
          .order('created_at', { ascending: false })
          .limit(50);
        if (cancelled) return;
        if (error || !data) {
          setItems([]);
          return;
        }
        setItems(data as Announcement[]);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoadingItems(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View className="flex-1 bg-[#F5F7FA]">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-5 pb-10 pt-14">
          <Text className="text-2xl font-extrabold text-slate-900">Announcements</Text>
          <Text className="mt-2 text-sm text-slate-500">Latest campus updates</Text>

          <View className="mt-5">
            {loadingItems ? (
              <View className="rounded-2xl bg-white p-4 shadow-sm">
                <Text className="text-sm text-slate-500">Loading…</Text>
              </View>
            ) : items.length === 0 ? (
              <View className="rounded-2xl bg-white p-4 shadow-sm">
                <Text className="text-sm text-slate-500">No announcements yet.</Text>
              </View>
            ) : (
              <View className="gap-3">
                {items.map((a) => (
                  <Pressable key={a.id} className="rounded-2xl bg-white p-4 shadow-sm active:opacity-90">
                    <Text className="text-base font-semibold text-slate-900">{a.title ?? 'Announcement'}</Text>
                    {!!a.body && (
                      <Text className="mt-2 text-sm text-slate-600" numberOfLines={3}>
                        {a.body}
                      </Text>
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

