import { db } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Announcement = {
  id: string;
  title: string;
  body: string;
  category: string;
  target_audience: string;
  created_at: any;
  is_active: boolean;
};

const categories = [
  { label: 'All', value: 'all' },
  { label: 'General', value: 'general' },
  { label: 'Academic', value: 'academic' },
  { label: 'Urgent', value: 'urgent' },
  { label: 'Event', value: 'event' }
];

export default function AnnouncementsScreen() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        let q = query(
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
            category: docData.category || 'general',
            target_audience: docData.target_audience || 'all',
            created_at: docData.created_at,
            is_active: docData.is_active !== false
          });
        });
        setAnnouncements(data);
      } catch (error) {
        console.error('Error fetching announcements:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'urgent': return { bg: '#FEE2E2', text: '#DC2626' };
      case 'academic': return { bg: '#DBEAFE', text: '#2563EB' };
      case 'event': return { bg: '#D1FAE5', text: '#059669' };
      default: return { bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString();
  };

  const filteredAnnouncements = selectedCategory === 'all' 
    ? announcements 
    : announcements.filter(a => a.category === selectedCategory);

  const toggleExpand = (id: string) => {
    setExpandedCard(expandedCard === id ? null : id);
  };

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
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="px-5 py-6">
          {/* Header */}
          <View className="mb-6">
            <Text className="text-xl font-semibold text-slate-900" style={{ fontSize: 18, fontWeight: '600' }}>
              Announcements
            </Text>
            <Text className="text-sm text-slate-500 mt-1" style={{ fontSize: 13, color: '#888888' }}>
              Campus news and updates
            </Text>
          </View>

          {/* Category Filter Pills */}
          <View className="mb-6">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  onPress={() => setSelectedCategory(cat.value)}
                  className={`px-4 py-2 rounded-full border ${
                    selectedCategory === cat.value
                      ? 'bg-[#0088CC] border-[#0088CC]'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  <Text className={`text-sm font-medium ${
                    selectedCategory === cat.value ? 'text-white' : 'text-slate-700'
                  }`}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Announcements List */}
          {filteredAnnouncements.length === 0 ? (
            <View className="flex-1 items-center justify-center py-20">
              <Ionicons name="megaphone-outline" size={48} color="#9CA3AF" />
              <Text className="mt-4 text-slate-500 text-center">
                {selectedCategory === 'all' 
                  ? 'No announcements yet.' 
                  : `No ${selectedCategory} announcements yet.`
                }
              </Text>
            </View>
          ) : (
            <View className="gap-4">
              {filteredAnnouncements.map((announcement) => {
                const categoryColors = getCategoryColor(announcement.category);
                const isExpanded = expandedCard === announcement.id;
                
                return (
                  <TouchableOpacity
                    key={announcement.id}
                    onPress={() => toggleExpand(announcement.id)}
                    className="bg-white rounded-xl p-4 shadow-sm active:opacity-90"
                  >
                    {/* Category Badge and Date */}
                    <View className="flex-row items-center justify-between mb-3">
                      <View 
                        className="px-3 py-1 rounded-full"
                        style={{ backgroundColor: categoryColors.bg }}
                      >
                        <Text 
                          className="text-xs font-medium"
                          style={{ color: categoryColors.text }}
                        >
                          {announcement.category.toUpperCase()}
                        </Text>
                      </View>
                      <Text className="text-xs text-slate-500">
                        {formatDate(announcement.created_at)}
                      </Text>
                    </View>

                    {/* Title */}
                    <Text className="text-base font-semibold text-slate-900 mb-2">
                      {announcement.title}
                    </Text>

                    {/* Body */}
                    <Text 
                      className="text-sm text-slate-600 leading-relaxed"
                      numberOfLines={isExpanded ? undefined : 3}
                    >
                      {announcement.body}
                    </Text>

                    {/* Expand/Collapse Indicator */}
                    {announcement.body.length > 150 && (
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
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
});
