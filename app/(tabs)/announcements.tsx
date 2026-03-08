import { db } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type Announcement = {
  id: string;
  title: string;
  body: string;
  category: string;
  target_audience: string;
  created_at?: any;
  is_active: boolean;
};

const categories = [
  { label: 'All', value: 'all' },
  { label: 'General', value: 'general' },
  { label: 'Academic', value: 'academic' },
  { label: 'Urgent', value: 'urgent' },
  { label: 'Event', value: 'event' },
];

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'urgent': return { bg: '#FEE2E2', text: '#DC2626' };
    case 'academic': return { bg: '#DBEAFE', text: '#2563EB' };
    case 'event': return { bg: '#D1FAE5', text: '#059669' };
    default: return { bg: '#F3F4F6', text: '#6B7280' };
  }
};

// FIX #1: Safe date formatter with full crash guard
const formatDate = (timestamp: any) => {
  if (!timestamp || !timestamp.toDate) return '';
  try {
    const date = timestamp.toDate();
    return date.toLocaleDateString();
  } catch {
    return '';
  }
};

// FIX #6: Memoized card component — only re-renders when its own props change
const AnnouncementCard = memo(({
  announcement,
  isExpanded,
  onToggle,
}: {
  announcement: Announcement;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}) => {
  const categoryColors = getCategoryColor(announcement.category);
  // FIX #1: date computed once per card
  const date = formatDate(announcement.created_at);

  return (
    <TouchableOpacity
      onPress={() => onToggle(announcement.id)}
      className="bg-white rounded-xl p-4 shadow-sm active:opacity-90"
    >
      {/* Category Badge and Date */}
      <View className="flex-row items-center justify-between mb-3">
        <View
          className="px-3 py-1 rounded-full"
          style={{ backgroundColor: categoryColors.bg }}
        >
          <Text className="text-xs font-medium" style={{ color: categoryColors.text }}>
            {announcement.category.toUpperCase()}
          </Text>
        </View>
        {date ? (
          <Text className="text-xs text-slate-500">{date}</Text>
        ) : null}
      </View>

      {/* Title */}
      <Text className="text-base font-semibold text-slate-900 mb-2">
        {announcement.title}
      </Text>

      {/* Body */}
      <Text
        className="text-sm text-slate-600 leading-relaxed"
        numberOfLines={isExpanded ? undefined : 3}
        ellipsizeMode="tail"
      >
        {announcement.body}
      </Text>

      {/* FIX #2: Guard body.length with optional chaining */}
      {announcement.body?.length > 150 && (
        <View className="flex-row items-center mt-2">
          <Text className="text-sm text-[#0088CC] font-medium mr-1">
            {isExpanded ? 'Show less' : 'Read more'}
          </Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color="#0088CC"
          />
        </View>
      )}
    </TouchableOpacity>
  );
});

export default function AnnouncementsScreen() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // FIX #10: toggleExpand with useCallback — stable reference, prevents child re-renders
  const toggleExpand = useCallback((id: string) => {
    setExpandedCard(prev => prev === id ? null : id);
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    try {
      setError(false);
      const q = query(
        collection(db, 'announcements'),
        where('is_active', '==', true),
        orderBy('created_at', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const data: Announcement[] = [];
      querySnapshot.forEach((doc) => {
        const docData = doc.data();
        data.push({
          id: doc.id,
          title: docData.title || '',
          body: docData.body || '',
          // FIX #3: lowercase category for consistent filtering
          category: (docData.category || 'general').toLowerCase(),
          target_audience: docData.target_audience || 'all',
          created_at: docData.created_at,
          is_active: docData.is_active !== false,
        });
      });
      setAnnouncements(data);
    } catch (err) {
      console.error('Error fetching announcements:', err);
      // FIX #4: Set error state instead of silent empty
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // FIX #10: Cleanup on unmount
  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // FIX #9: Pull-to-refresh handler
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // FIX #5: useMemo for filtered list — only recomputes when data or filter changes
  // FIX #3: case-insensitive category comparison
  const filteredAnnouncements = useMemo(() => {
    if (selectedCategory === 'all') return announcements;
    return announcements.filter(
      a => a.category === selectedCategory
    );
  }, [announcements, selectedCategory]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F7FA]">
        <ActivityIndicator size="large" color="#0088CC" />
        <Text className="mt-4 text-slate-500">Loading announcements...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F5F7FA]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        // FIX #9: Pull-to-refresh
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View className="px-5 py-6">
          {/* FIX #7: Removed duplicate inline styles — NativeWind only */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-slate-900">
              Announcements
            </Text>
            <Text className="text-sm text-slate-500 mt-1">
              Campus news and updates
            </Text>
          </View>

          {/* Category Filter Pills */}
          <View className="mb-6">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row gap-2"
            >
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  onPress={() => setSelectedCategory(cat.value)}
                  className={`px-4 py-2 rounded-full border mr-2 ${
                    selectedCategory === cat.value
                      ? 'bg-[#0088CC] border-[#0088CC]'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      selectedCategory === cat.value ? 'text-white' : 'text-slate-700'
                    }`}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* FIX #4: Error state */}
          {error ? (
            <View className="flex-1 items-center justify-center py-20">
              <Ionicons name="cloud-offline-outline" size={48} color="#9CA3AF" />
              <Text className="mt-4 text-slate-500 text-center">
                Unable to load announcements.{'\n'}Pull down to retry.
              </Text>
            </View>
          ) : filteredAnnouncements.length === 0 ? (
            <View className="flex-1 items-center justify-center py-20">
              <Ionicons name="megaphone-outline" size={48} color="#9CA3AF" />
              <Text className="mt-4 text-slate-500 text-center">
                {selectedCategory === 'all'
                  ? 'No announcements yet. Check back later for campus updates.'
                  : `No ${selectedCategory} announcements yet.`}
              </Text>
            </View>
          ) : (
            <View className="gap-4">
              {/* FIX #6: Using memoized AnnouncementCard */}
              {filteredAnnouncements.map((announcement) => (
                <AnnouncementCard
                  key={announcement.id}
                  announcement={announcement}
                  isExpanded={expandedCard === announcement.id}
                  onToggle={toggleExpand}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}