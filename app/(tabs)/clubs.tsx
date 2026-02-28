import { db } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';

type Club = {
  id: string;
  name: string | null;
  description: string | null;
  category: string | null;
  whatsapp_link: string | null;
  image_url: string | null;
};

function getCategoryColor(category?: string | null) {
  switch (category?.toLowerCase()) {
    case 'academic':
      return 'bg-blue-100 text-blue-700';
    case 'sports':
      return 'bg-green-100 text-green-700';
    case 'cultural':
      return 'bg-purple-100 text-purple-700';
    case 'social':
      return 'bg-orange-100 text-orange-700';
    case 'technical':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function ClubCard({ club, onJoin }: { club: Club; onJoin: () => void }) {
  const preview = club.description ? club.description.substring(0, 100) + (club.description.length > 100 ? '...' : '') : '';
  
  return (
    <View className="rounded-2xl bg-white p-4 shadow-sm">
      <View className="mb-3 flex-row items-start justify-between">
        <View className="flex-1">
          {club.category && (
            <View className={`mb-2 self-start rounded-full px-2 py-1 ${getCategoryColor(club.category)}`}>
              <Text className="text-xs font-medium capitalize">{club.category}</Text>
            </View>
          )}
          <Text className="text-base font-semibold text-slate-900">
            {club.name || 'Club'}
          </Text>
        </View>
        {club.image_url && (
          <View className="ml-3 h-12 w-12 rounded-lg bg-gray-100">
            {/* Image component could be added here if needed */}
          </View>
        )}
      </View>
      
      {preview && (
        <Text className="mb-3 text-sm text-slate-600" numberOfLines={3}>
          {preview}
        </Text>
      )}
      
      <Pressable
        onPress={onJoin}
        className="rounded-xl bg-primary px-4 py-2 active:opacity-90"
      >
        <Text className="text-center text-sm font-semibold text-white">Join Club</Text>
      </Pressable>
    </View>
  );
}

export default function ClubsScreen() {
  const router = useRouter();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const querySnapshot = await getDocs(collection(db, 'clubs'));
        
        const data: Club[] = [];
        querySnapshot.forEach((doc) => {
          const docData = doc.data();
          data.push({
            id: doc.id,
            name: docData.name || null,
            description: docData.description || null,
            category: docData.category || null,
            whatsapp_link: docData.whatsapp_link || null,
            image_url: docData.image_url || null,
          });
        });

        console.log('clubs data:', JSON.stringify(data));
        console.log('clubs error:', JSON.stringify(null));

        if (cancelled) return;
        setClubs(data);
      } catch (error) {
        console.log('clubs data:', JSON.stringify(null));
        console.log('clubs error:', JSON.stringify(error));
        if (!cancelled) setClubs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleJoinClub = async (club: Club) => {
    if (club.whatsapp_link) {
      try {
        await Linking.openURL(club.whatsapp_link);
      } catch (error) {
        console.error('Failed to open WhatsApp link:', error);
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
          <Text className="text-xl font-bold text-slate-900">Clubs & Societies</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="px-5 py-4">
          {loading ? (
            <View className="rounded-2xl bg-white p-6 shadow-sm">
              <Text className="text-center text-sm text-slate-500">Loading clubs...</Text>
            </View>
          ) : clubs.length === 0 ? (
            <View className="rounded-2xl bg-white p-6 shadow-sm">
              <View className="items-center">
                <View className="mb-3 h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                  <Ionicons name="people-outline" size={32} color="#9CA3AF" />
                </View>
                <Text className="text-base font-semibold text-slate-900">No clubs yet</Text>
                <Text className="mt-1 text-center text-sm text-slate-500">
                  Check back later for campus clubs and societies to join.
                </Text>
              </View>
            </View>
          ) : (
            <View className="gap-3">
              {clubs.map((club) => (
                <ClubCard
                  key={club.id}
                  club={club}
                  onJoin={() => handleJoinClub(club)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
