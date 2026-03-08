import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

type Announcement = {
  id: string;
  title: string;
  body: string;
  category: string;
  target_audience: string;
  created_at?: any;
  is_active: boolean;
};

// FIX #9: Plain function — recalculates every render so greeting stays accurate
function getDayGreeting(date = new Date()): 'morning' | 'afternoon' | 'evening' {
  const hour = date.getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

// FIX #3: Safer date formatter — checks for toDate method before calling it
function formatShortDate(timestamp: any) {
  if (!timestamp || !timestamp.toDate) return '';
  try {
    const d = timestamp.toDate();
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
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
  const { user } = useAuth();
  const [userName, setUserName] = useState('Student');
  const [loadingName, setLoadingName] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [announcementError, setAnnouncementError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // FIX #9: greeting recalculates every render
  const greeting = getDayGreeting();

  // FIX #4: Name fetch with cancellation guard
  useEffect(() => {
    let cancelled = false;

    if (user) {
      const fetchUserName = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (!cancelled && userDoc.exists()) {
            const userData = userDoc.data();
            const fullName = userData?.full_name || userData?.name || 'Student';
            const first = fullName.split(' ')[0]?.trim();
            setUserName(first || 'Student');
          }
        } catch (error) {
          if (!cancelled) setUserName('Student');
        } finally {
          if (!cancelled) setLoadingName(false);
        }
      };
      fetchUserName();
    } else {
      setUserName('Student');
      setLoadingName(false);
    }

    return () => { cancelled = true; };
  }, [user]);

  // FIX #2: orderBy newest first | FIX #7: error state | FIX #5: console.logs removed
  const fetchAnnouncements = useCallback(async () => {
    try {
      setAnnouncementError(false);
      const q = query(
        collection(db, 'announcements'),
        where('is_active', '==', true),
        orderBy('created_at', 'desc'),
        limit(10)
      );

      const querySnapshot = await getDocs(q);

      const data: Announcement[] = [];
      querySnapshot.forEach((doc) => {
        const docData = doc.data();
        data.push({
          id: doc.id,
          title: docData.title || '',
          body: docData.body || '',
          category: docData.category || 'general',
          target_audience: docData.target_audience || 'all',
          created_at: docData.created_at,
          is_active: docData.is_active !== false,
        });
      });

      setAnnouncements(data);
    } catch (err) {
      console.error('Announcements fetch error:', err);
      setAnnouncements([]);
      setAnnouncementError(true);
    } finally {
      setLoadingAnnouncements(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // FIX #12: Pull-to-refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  return (
    <View className="flex-1 bg-[#F5F7FA]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        // FIX #12: Pull-to-refresh control
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View className="px-5 pb-10 pt-14">
          {/* FIX #1: Bell icon removed — simplified header */}
          <View className="items-start">
            <Text className="text-sm text-slate-500">UPSA Campus</Text>
            <Text className="mt-1 text-2xl font-extrabold text-slate-900">
              Good {greeting} {loadingName ? '...' : userName}
            </Text>
          </View>

          <View className="mt-6">
            <Text className="mb-3 text-base font-semibold text-slate-900">Quick actions</Text>

            <View className="flex-row gap-3">
              <ActionCard
                title="Announcements"
                subtitle="Campus updates"
                icon="megaphone-outline"
                onPress={() => router.push('/(tabs)/announcements')}
              />
              <ActionCard
                title="Schedule"
                subtitle="Today's classes"
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
              <Pressable onPress={() => router.push('/(tabs)/announcements')} className="active:opacity-80">
                <Text className="text-sm font-semibold text-primary">See all</Text>
              </Pressable>
            </View>

            {loadingAnnouncements ? (
              <View className="rounded-2xl bg-white p-4 shadow-sm">
                <Text className="text-sm text-slate-500">Loading latest updates…</Text>
              </View>
            ) : announcementError ? (
              // FIX #7: Show error state instead of silent empty
              <View className="rounded-2xl bg-white p-4 shadow-sm">
                <Text className="text-sm text-red-500">Unable to load announcements. Pull down to retry.</Text>
              </View>
            ) : announcements.length === 0 ? (
              // FIX #10: Better empty state text
              <View className="rounded-2xl bg-white p-4 shadow-sm">
                <Text className="text-sm text-slate-500">No announcements yet. Check back later for campus updates.</Text>
              </View>
            ) : (
              <View className="gap-3">
                {announcements.map((a) => (
                  <Pressable
                    key={a.id}
                    onPress={() => router.push('/(tabs)/announcements')}
                    className="rounded-2xl bg-white p-4 shadow-sm active:opacity-90"
                  >
                    {(() => {
                      const date = formatShortDate(a.created_at);
                      return (
                    <View className="items-start">
                      <Text className="text-base font-semibold text-slate-900">
                        {a.title}
                      </Text>
                      <View className="flex-row items-center mb-2">
                        <View
                          className="px-2 py-1 rounded-full mr-2"
                          style={{
                            backgroundColor:
                              a.category === 'urgent' ? '#FEE2E2' :
                              a.category === 'academic' ? '#DBEAFE' :
                              a.category === 'event' ? '#D1FAE5' :
                              '#F3F4F6',
                          }}
                        >
                          <Text
                            className="text-xs font-medium"
                            style={{
                              color:
                                a.category === 'urgent' ? '#DC2626' :
                                a.category === 'academic' ? '#2563EB' :
                                a.category === 'event' ? '#059669' :
                                '#6B7280',
                            }}
                          >
                            {a.category.toUpperCase()}
                          </Text>
                        </View>
                        {date ? (
                          <Text className="text-xs text-slate-400">{date}</Text>
                        ) : null}
                      </View>
                      {!!a.body && (
                        <Text className="mt-2 text-sm text-slate-600" numberOfLines={2} ellipsizeMode="tail">
                          {a.body}
                        </Text>
                      )}
                    </View>
                      );
                    })()}
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
