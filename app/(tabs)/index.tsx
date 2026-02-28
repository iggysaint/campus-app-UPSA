import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

type Announcement = {
  id: string;
  title: string | null;
  body: string | null;
  created_at: string | null;
};

interface FirestoreAnnouncement {
  title?: string;
  body?: string;
  created_at?: any;
}

function getDayGreeting(date = new Date()): 'morning' | 'afternoon' | 'evening' {
  const hour = date.getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function formatShortDate(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function ActionCard(props: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      className="flex-1 rounded-2xl bg-white p-4 shadow-sm active:opacity-90"
    >
      <View className="mb-3 h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
        <Ionicons name={props.icon} size={20} color="#0088CC" />
      </View>
      <Text className="text-base font-semibold text-slate-900">{props.title}</Text>
      <Text className="mt-1 text-xs text-slate-500">{props.subtitle}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();

  const name = useMemo(() => {
    const raw = profile?.full_name ?? profile?.email ?? 'Student';
    const first = raw.split(' ')[0]?.trim();
    return first || 'Student';
  }, [profile?.email, profile?.full_name]);

  const greeting = useMemo(() => getDayGreeting(), []);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoadingAnnouncements(true);
        const q = query(collection(db, 'announcements'), orderBy('created_at', 'desc'), limit(3));
        const querySnapshot = await getDocs(q);
        
        const data: Announcement[] = [];
        querySnapshot.forEach((doc) => {
          const docData = doc.data() as FirestoreAnnouncement;
          data.push({
            id: doc.id,
            title: docData.title || null,
            body: docData.body || null,
            created_at: docData.created_at?.toDate?.()?.toISOString() || null,
          });
        });

        if (cancelled) return;
        setAnnouncements(data);
      } catch {
        if (!cancelled) setAnnouncements([]);
      } finally {
        if (!cancelled) setLoadingAnnouncements(false);
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
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-sm text-slate-500">UPSA Campus</Text>
              <Text className="mt-1 text-2xl font-extrabold text-slate-900">
                Good {greeting} {name}
              </Text>
            </View>

            <Pressable
              onPress={() => router.push('/notifications')}
              className="h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm active:opacity-90"
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={22} color="#111827" />
            </Pressable>
          </View>

          <View className="mt-6">
            <Text className="mb-3 text-base font-semibold text-slate-900">Quick actions</Text>

            <View className="flex-row gap-3">
              <ActionCard
                title="Announcements"
                subtitle="Campus updates"
                icon="megaphone-outline"
                onPress={() => router.push('/announcements')}
              />
              <ActionCard
                title="Schedule"
                subtitle="Today’s classes"
                icon="calendar-outline"
                onPress={() => router.push('/(tabs)/schedule')}
              />
            </View>

            <View className="mt-3 flex-row gap-3">
              <ActionCard
                title="Hostel"
                subtitle="Room & notices"
                icon="home-outline"
                onPress={() => router.push('/hostel')}
              />
              <ActionCard
                title="Polls"
                subtitle="Vote & feedback"
                icon="stats-chart-outline"
                onPress={() => router.push('/polls')}
              />
            </View>

            <View className="mt-3 flex-row gap-3">
              <ActionCard
                title="Clubs"
                subtitle="Join communities"
                icon="people-outline"
                onPress={() => router.push('/(tabs)/clubs')}
              />
              <ActionCard
                title="Library"
                subtitle="Resources & hours"
                icon="library-outline"
                onPress={() => router.push('/(tabs)/library')}
              />
            </View>
          </View>

          <View className="mt-8">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-base font-semibold text-slate-900">Recent announcements</Text>
              <Pressable onPress={() => router.push('/announcements')} className="active:opacity-80">
                <Text className="text-sm font-semibold text-primary">See all</Text>
              </Pressable>
            </View>

            {loadingAnnouncements ? (
              <View className="rounded-2xl bg-white p-4 shadow-sm">
                <Text className="text-sm text-slate-500">Loading latest updates…</Text>
              </View>
            ) : announcements.length === 0 ? (
              <View className="rounded-2xl bg-white p-4 shadow-sm">
                <Text className="text-sm text-slate-500">No announcements yet.</Text>
              </View>
            ) : (
              <View className="gap-3">
                {announcements.map((a) => (
                  <Pressable
                    key={a.id}
                    onPress={() => router.push('/announcements')}
                    className="rounded-2xl bg-white p-4 shadow-sm active:opacity-90"
                  >
                    <View className="flex-row items-start justify-between">
                      <Text className="flex-1 pr-3 text-base font-semibold text-slate-900">
                        {a.title ?? 'Announcement'}
                      </Text>
                      <Text className="text-xs text-slate-400">{formatShortDate(a.created_at)}</Text>
                    </View>
                    {!!a.body && (
                      <Text className="mt-2 text-sm text-slate-600" numberOfLines={2}>
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
