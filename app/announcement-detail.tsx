import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

function formatFullDate(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { 
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
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

export default function AnnouncementDetailScreen() {
  const router = useRouter();
  const { title, body, category, date } = useLocalSearchParams<{
    title: string;
    body: string;
    category: string;
    date: string;
  }>();

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
          <Text className="text-xl font-bold text-slate-900">Announcement</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="px-5 py-4">
          <View className="rounded-2xl bg-white p-6 shadow-sm">
            {category && (
              <View className={`mb-3 self-start rounded-full px-3 py-1 ${getCategoryColor(category)}`}>
                <Text className="text-sm font-medium capitalize">{category}</Text>
              </View>
            )}
            
            <Text className="text-xl font-bold text-slate-900 mb-3">
              {title || 'Announcement'}
            </Text>
            
            {date && (
              <View className="mb-4 flex-row items-center">
                <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                <Text className="ml-2 text-sm text-slate-500">
                  {formatFullDate(date)}
                </Text>
              </View>
            )}
            
            <View className="border-t border-gray-100 pt-4">
              <Text className="text-base text-slate-700 leading-relaxed">
                {body || 'No content available.'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
