import { db } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

type Announcement = {
  id: string;
  title: string | null;
  body: string | null;
  category: string | null;
  created_at: string | null;
  target_audience: string | null;
};

interface FirestoreAnnouncement {
  title?: string;
  body?: string;
  category?: string;
  created_at?: any;
  target_audience?: string;
}

function formatShortDate(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getCategoryColor(category?: string | null) {
  switch (category?.toLowerCase()) {
    case 'academic':
      return 'bg-blue-100 text-blue-700';
    case 'events':
      return 'bg-purple-100 text-purple-700';
    case 'urgent':
      return 'bg-red-100 text-red-700';
    case 'general':
      return 'bg-green-100 text-green-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function AnnouncementCard({ announcement, onPress }: { announcement: Announcement; onPress: () => void }) {
  const preview = announcement.body ? announcement.body.substring(0, 120) + (announcement.body.length > 120 ? '...' : '') : '';
  
  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl bg-white p-4 shadow-sm active:opacity-90"
    >
      <View className="mb-2 flex-row items-start justify-between">
        <View className="flex-1">
          {announcement.category && (
            <View className={`mb-2 self-start rounded-full px-2 py-1 ${getCategoryColor(announcement.category)}`}>
              <Text className="text-xs font-medium capitalize">{announcement.category}</Text>
            </View>
          )}
          <Text className="text-base font-semibold text-slate-900">
            {announcement.title ?? 'Announcement'}
          </Text>
        </View>
        <Text className="ml-3 text-xs text-slate-400">{formatShortDate(announcement.created_at)}</Text>
      </View>
      
      {preview && (
        <Text className="text-sm text-slate-600" numberOfLines={3}>
          {preview}
        </Text>
      )}
    </Pressable>
  );
}

export default function AnnouncementsScreen() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const q = query(collection(db, 'announcements'), orderBy('created_at', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const data: Announcement[] = [];
        querySnapshot.forEach((doc) => {
          const docData = doc.data() as FirestoreAnnouncement;
          data.push({
            id: doc.id,
            title: docData.title || null,
            body: docData.body || null,
            category: docData.category || null,
            created_at: docData.created_at?.toDate?.()?.toISOString() || null,
            target_audience: docData.target_audience || null,
          });
        });

        console.log('announcements data:', JSON.stringify(data));
        console.log('announcements error:', JSON.stringify(null));

        if (cancelled) return;
        setAnnouncements(data);
      } catch (error) {
        console.log('announcements data:', JSON.stringify(null));
        console.log('announcements error:', JSON.stringify(error));
        if (!cancelled) setAnnouncements([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleAnnouncementPress = (announcement: Announcement) => {
    router.push(`/announcement-detail?id=${announcement.id}&title=${encodeURIComponent(announcement.title || 'Announcement')}&body=${encodeURIComponent(announcement.body || '')}&category=${encodeURIComponent(announcement.category || 'general')}&date=${encodeURIComponent(announcement.created_at || '')}`);
  };

  return (
    <View className="flex-1 bg-[#F5F7FA]">
      <View className="bg-white px-5 pt-14 pb-4 shadow-sm">
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="mr-3 h-10 w-10 items-center justify-center rounded-full active:opacity-80"
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </Pressable>
          <Text className="text-xl font-bold text-slate-900">Announcements</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="px-5 py-4">
          {loading ? (
            <View className="rounded-2xl bg-white p-6 shadow-sm">
              <Text className="text-center text-sm text-slate-500">Loading announcements...</Text>
            </View>
          ) : announcements.length === 0 ? (
            <View className="rounded-2xl bg-white p-6 shadow-sm">
              <View className="items-center">
                <View className="mb-3 h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                  <Ionicons name="megaphone-outline" size={32} color="#9CA3AF" />
                </View>
                <Text className="text-base font-semibold text-slate-900">No announcements yet</Text>
                <Text className="mt-1 text-center text-sm text-slate-500">
                  Check back later for campus updates and important information.
                </Text>
              </View>
            </View>
          ) : (
            <View className="gap-3">
              {announcements.map((announcement) => (
                <AnnouncementCard
                  key={announcement.id}
                  announcement={announcement}
                  onPress={() => handleAnnouncementPress(announcement)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
