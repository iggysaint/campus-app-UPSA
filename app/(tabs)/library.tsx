import { db } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';

type Resource = {
  id: string;
  title: string | null;
  description: string | null;
  category: string | null;
  file_url: string | null;
  created_at: any;
};

const CATEGORIES = ['All', 'PDF', 'Video', 'Past Paper', 'Template', 'Letter', 'Project'];

function getCategoryColor(category?: string | null) {
  switch (category?.toLowerCase()) {
    case 'pdf':
      return 'bg-red-100 text-red-700';
    case 'video':
      return 'bg-purple-100 text-purple-700';
    case 'past paper':
      return 'bg-blue-100 text-blue-700';
    case 'template':
      return 'bg-green-100 text-green-700';
    case 'letter':
      return 'bg-orange-100 text-orange-700';
    case 'project':
      return 'bg-indigo-100 text-indigo-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function ResourceCard({ resource, onDownload }: { resource: Resource; onDownload: () => void }) {
  const preview = resource.description ? resource.description.substring(0, 100) + (resource.description.length > 100 ? '...' : '') : '';
  
  return (
    <View className="rounded-2xl bg-white p-4 shadow-sm">
      <View className="mb-3 flex-row items-start justify-between">
        <View className="flex-1">
          {resource.category && (
            <View className={`mb-2 self-start rounded-full px-2 py-1 ${getCategoryColor(resource.category)}`}>
              <Text className="text-xs font-medium capitalize">{resource.category}</Text>
            </View>
          )}
          <Text className="text-base font-semibold text-slate-900">
            {resource.title || 'Resource'}
          </Text>
        </View>
      </View>
      
      {preview && (
        <Text className="mb-3 text-sm text-slate-600" numberOfLines={3}>
          {preview}
        </Text>
      )}
      
      <Pressable
        onPress={onDownload}
        className="rounded-xl bg-primary px-4 py-2 active:opacity-90"
      >
        <Text className="text-center text-sm font-semibold text-white">Download/Open</Text>
      </Pressable>
    </View>
  );
}

export default function LibraryScreen() {
  const router = useRouter();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const querySnapshot = await getDocs(collection(db, 'library'));
        
        const data: Resource[] = [];
        querySnapshot.forEach((doc) => {
          const docData = doc.data();
          data.push({
            id: doc.id,
            title: docData.title || null,
            description: docData.description || null,
            category: docData.category || null,
            file_url: docData.file_url || null,
            created_at: docData.created_at || null,
          });
        });

        console.log('library data:', JSON.stringify(data));
        console.log('library error:', JSON.stringify(null));

        if (cancelled) return;
        setResources(data);
      } catch (error) {
        console.log('library data:', JSON.stringify(null));
        console.log('library error:', JSON.stringify(error));
        if (!cancelled) setResources([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredResources = selectedCategory === 'All' 
    ? resources 
    : resources.filter(resource => resource.category?.trim().toLowerCase() === selectedCategory.toLowerCase());

  const handleDownload = async (resource: Resource) => {
    if (resource.file_url) {
      try {
        await Linking.openURL(resource.file_url);
      } catch (error) {
        console.error('Failed to open resource:', error);
      }
    }
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
          <Text className="text-xl font-bold text-slate-900">Library</Text>
        </View>
      </View>

      <View className="bg-white px-5 py-3 border-b border-gray-100">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-2">
          {CATEGORIES.map((category) => (
            <Pressable
              key={category}
              onPress={() => setSelectedCategory(category)}
              className={`rounded-full px-4 py-2 ${
                selectedCategory === category
                  ? 'bg-primary'
                  : 'bg-gray-100'
              }`}
            >
              <Text className={`text-sm font-medium ${
                selectedCategory === category
                  ? 'text-white'
                  : 'text-slate-600'
              }`}>
                {category}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="px-5 py-4">
          {loading ? (
            <View className="rounded-2xl bg-white p-6 shadow-sm">
              <Text className="text-center text-sm text-slate-500">Loading resources...</Text>
            </View>
          ) : filteredResources.length === 0 ? (
            <View className="rounded-2xl bg-white p-6 shadow-sm">
              <View className="items-center">
                <View className="mb-3 h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                  <Ionicons name="library-outline" size={32} color="#9CA3AF" />
                </View>
                <Text className="text-base font-semibold text-slate-900">No resources yet</Text>
                <Text className="mt-1 text-center text-sm text-slate-500">
                  {selectedCategory === 'All' 
                    ? "Check back later for library resources."
                    : `No ${selectedCategory.toLowerCase()} resources available.`
                  }
                </Text>
              </View>
            </View>
          ) : (
            <View className="gap-3">
              {filteredResources.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  onDownload={() => handleDownload(resource)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
