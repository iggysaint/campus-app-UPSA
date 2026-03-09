import { COLORS } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { registerForPushNotifications } from '@/lib/notifications';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Tabs, useRouter } from 'expo-router';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

const SEEN_KEYS = {
  announcements: 'last_seen_announcements',
  clubs: 'last_seen_clubs',
  library: 'last_seen_library',
  polls: 'last_seen_polls',
};

// FIX: safe number parser
const toNumber = (value: string | null) => {
  const n = Number(value);
  return isNaN(n) ? 0 : n;
};

const getLatestTimestamp = async (
  collectionName: string,
  extraWhere?: { field: string; value: any }
): Promise<number> => {
  try {
    const constraints: any[] = [orderBy('created_at', 'desc'), limit(1)];
    if (extraWhere) {
      constraints.unshift(where(extraWhere.field, '==', extraWhere.value));
    }
    const q = query(collection(db, collectionName), ...constraints);
    const snap = await getDocs(q);
    if (snap.empty) return 0;
    const ts = snap.docs[0].data().created_at;
    return ts?.toMillis?.() || 0;
  } catch (e) {
    console.log('getLatestTimestamp failed:', e);
    return 0;
  }
};

export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [hasNewAnnouncements, setHasNewAnnouncements] = useState(false);
  const [hasNewClubs, setHasNewClubs] = useState(false);
  const [hasNewLibrary, setHasNewLibrary] = useState(false);
  const [hasNewPolls, setHasNewPolls] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      registerForPushNotifications();

      const notificationListener = Notifications.addNotificationReceivedListener(() => {});
      const responseListener = Notifications.addNotificationResponseReceivedListener(() => {});

      return () => {
        notificationListener.remove();
        responseListener.remove();
      };
    }
  }, [isAuthenticated]);

  // FIX: extracted so it can be reused by AppState + useEffect
  const checkNewContent = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [
        latestAnnouncement,
        latestClub,
        latestLibrary,
        latestPoll,
        seenAnnouncements,
        seenClubs,
        seenLibrary,
        seenPolls,
      ] = await Promise.all([
        getLatestTimestamp('announcements', { field: 'is_active', value: true }),
        getLatestTimestamp('clubs'),
        getLatestTimestamp('library', { field: 'is_active', value: true }),
        getLatestTimestamp('polls', { field: 'is_active', value: true }),
        AsyncStorage.getItem(SEEN_KEYS.announcements),
        AsyncStorage.getItem(SEEN_KEYS.clubs),
        AsyncStorage.getItem(SEEN_KEYS.library),
        AsyncStorage.getItem(SEEN_KEYS.polls),
      ]);

      // FIX: use toNumber() instead of parseInt
      setHasNewAnnouncements(latestAnnouncement > toNumber(seenAnnouncements));
      setHasNewClubs(latestClub > toNumber(seenClubs));
      setHasNewLibrary(latestLibrary > toNumber(seenLibrary));
      setHasNewPolls(latestPoll > toNumber(seenPolls));
    } catch (e) {
      console.log('Dot check failed:', e);
    }
  }, [isAuthenticated]);

  // Check on app start
  useEffect(() => {
    checkNewContent();
  }, [checkNewContent]);

  // FIX: check when app resumes from background
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        checkNewContent();
      }
    });
    return () => sub.remove();
  }, [checkNewContent]);

  const badgeStyle = {
    backgroundColor: '#EF4444',
    width: 8,
    height: 8,
    borderRadius: 4,
  };

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#fff',
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: { height: 60 },
        tabBarItemStyle: { flex: 1 },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
          tabBarBadge: hasNewAnnouncements ? '' : undefined,
          tabBarBadgeStyle: badgeStyle,
        }}
      />

      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="clubs"
        options={{
          title: 'Clubs',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
          tabBarBadge: hasNewClubs ? '' : undefined,
          tabBarBadgeStyle: badgeStyle,
        }}
      />

      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="library" size={size} color={color} />
          ),
          tabBarBadge: hasNewLibrary ? '' : undefined,
          tabBarBadgeStyle: badgeStyle,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
          tabBarBadge: hasNewPolls ? '' : undefined,
          tabBarBadgeStyle: badgeStyle,
        }}
      />

      {/* Hidden routes */}
      <Tabs.Screen name="polls" options={{ href: null }} />
      <Tabs.Screen name="hostel" options={{ href: null }} />
      <Tabs.Screen name="admin" options={{ href: null }} />
      <Tabs.Screen name="announcements" options={{ href: null }} />
    </Tabs>
  );
}