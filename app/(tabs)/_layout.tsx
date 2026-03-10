import { COLORS } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { registerForPushNotifications } from '@/lib/notifications';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Tabs, useRouter } from 'expo-router';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

const SEEN_KEYS = {
  announcements: 'last_seen_announcements',
  clubs: 'last_seen_clubs',
  library: 'last_seen_library',
  polls: 'last_seen_polls',
};

const toNumber = (value: string | null) => {
  const n = Number(value);
  return isNaN(n) ? 0 : n;
};

const dotStyle = {
  position: 'absolute' as const,
  top: -3,
  right: -6,
  width: 10,
  height: 10,
  borderRadius: 5,
  backgroundColor: '#EF4444',
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

  // Announcements — realtime listener
  useEffect(() => {
    if (!isAuthenticated) return;
    const q = query(
      collection(db, 'announcements'),
      where('is_active', '==', true),
      orderBy('created_at', 'desc'),
      limit(1)
    );
    const unsub = onSnapshot(q, async (snap) => {
      if (snap.empty) return;
      const latest = snap.docs[0].data().created_at?.toMillis?.() || 0;
      const seen = await AsyncStorage.getItem(SEEN_KEYS.announcements);
      setHasNewAnnouncements(latest > toNumber(seen));
    }, (e) => console.log('announcements listener error:', e));
    return () => unsub();
  }, [isAuthenticated]);

  // Clubs — realtime listener
  useEffect(() => {
    if (!isAuthenticated) return;
    const q = query(
      collection(db, 'clubs'),
      orderBy('created_at', 'desc'),
      limit(1)
    );
    const unsub = onSnapshot(q, async (snap) => {
      if (snap.empty) return;
      const latest = snap.docs[0].data().created_at?.toMillis?.() || 0;
      const seen = await AsyncStorage.getItem(SEEN_KEYS.clubs);
      setHasNewClubs(latest > toNumber(seen));
    }, (e) => console.log('clubs listener error:', e));
    return () => unsub();
  }, [isAuthenticated]);

  // Library — realtime listener
  useEffect(() => {
    if (!isAuthenticated) return;
    const q = query(
      collection(db, 'library'),
      where('is_active', '==', true),
      orderBy('created_at', 'desc'),
      limit(1)
    );
    const unsub = onSnapshot(q, async (snap) => {
      if (snap.empty) return;
      const latest = snap.docs[0].data().created_at?.toMillis?.() || 0;
      const seen = await AsyncStorage.getItem(SEEN_KEYS.library);
      setHasNewLibrary(latest > toNumber(seen));
    }, (e) => console.log('library listener error:', e));
    return () => unsub();
  }, [isAuthenticated]);

  // FIX: Polls — use start_date instead of created_at
  useEffect(() => {
    if (!isAuthenticated) return;
    const q = query(
      collection(db, 'polls'),
      where('is_active', '==', true),
      orderBy('start_date', 'desc'),
      limit(1)
    );
    const unsub = onSnapshot(q, async (snap) => {
      if (snap.empty) return;
      const latest = snap.docs[0].data().start_date?.toMillis?.() || 0;
      const seen = await AsyncStorage.getItem(SEEN_KEYS.polls);
      setHasNewPolls(latest > toNumber(seen));
    }, (e) => console.log('polls listener error:', e));
    return () => unsub();
  }, [isAuthenticated]);

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
            <View style={{ width: size, height: size }}>
              <Ionicons name="home" size={size} color={color} />
              {hasNewAnnouncements && <View style={dotStyle} />}
            </View>
          ),
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
            <View style={{ width: size, height: size }}>
              <Ionicons name="people" size={size} color={color} />
              {hasNewClubs && <View style={dotStyle} />}
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <View style={{ width: size, height: size }}>
              <Ionicons name="library" size={size} color={color} />
              {hasNewLibrary && <View style={dotStyle} />}
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <View style={{ width: size, height: size }}>
              <Ionicons name="person" size={size} color={color} />
              {hasNewPolls && <View style={dotStyle} />}
            </View>
          ),
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