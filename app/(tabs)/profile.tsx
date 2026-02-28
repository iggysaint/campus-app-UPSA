import { auth, db } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

type UserProfile = {
  name: string | null;
  email: string | null;
  role: string | null;
  programme: string | null;
  student_id: string | null;
};

function ProfileHeader({ profile }: { profile: UserProfile }) {
  const initials = profile.name ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'U';
  const roleText = profile.role === 'admin' ? 'Admin' : 'Student';
  
  return (
    <View className="mb-6 items-center">
      <View className="mb-3 h-20 w-20 items-center justify-center rounded-full bg-primary">
        <Text className="text-2xl font-bold text-white">{initials}</Text>
      </View>
      <Text className="mb-1 text-xl font-bold text-slate-900">{profile.name || 'User'}</Text>
      <Text className="mb-3 text-sm text-slate-500">{profile.email || 'No email'}</Text>
      <View className="rounded-full bg-blue-100 px-3 py-1">
        <Text className="text-sm font-medium text-blue-700">{roleText}</Text>
      </View>
    </View>
  );
}

function StudentInfoCard({ profile }: { profile: UserProfile }) {
  return (
    <View className="mb-6 rounded-xl bg-white p-4 shadow-sm">
      <View className="mb-3 flex-row items-center">
        <View className="mr-3 h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
          <Ionicons name="school-outline" size={20} color="#0088CC" />
        </View>
        <View className="flex-1">
          <Text className="text-xs font-medium uppercase text-gray-500">Programme</Text>
          <Text className="text-base text-slate-900">{profile.programme || 'Not specified'}</Text>
        </View>
      </View>
      
      <View className="flex-row items-center">
        <View className="mr-3 h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
          <Ionicons name="card-outline" size={20} color="#0088CC" />
        </View>
        <View className="flex-1">
          <Text className="text-xs font-medium uppercase text-gray-500">Student ID</Text>
          <Text className="text-base text-slate-900">{profile.student_id || 'Not specified'}</Text>
        </View>
      </View>
    </View>
  );
}

function ActionRow({ 
  icon, 
  iconColor, 
  label, 
  onPress 
}: { 
  icon: keyof typeof Ionicons.glyphMap; 
  iconColor: string; 
  label: string; 
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between rounded-xl bg-white p-4 shadow-sm active:opacity-80"
    >
      <View className="flex-row items-center">
        <View className={`mr-3 h-10 w-10 items-center justify-center rounded-lg ${iconColor}`}>
          <Ionicons name={icon} size={20} color="white" />
        </View>
        <Text className="text-base text-slate-900">{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
    </Pressable>
  );
}

function LogoutRow({ onLogout }: { onLogout: () => void }) {
  return (
    <Pressable
      onPress={onLogout}
      className="mb-6 flex-row items-center justify-between rounded-xl bg-white p-4 shadow-sm active:opacity-80"
    >
      <View className="flex-row items-center">
        <View className="mr-3 h-10 w-10 items-center justify-center rounded-lg bg-red-100">
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        </View>
        <Text className="text-base text-red-600">Log Out</Text>
      </View>
    </Pressable>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <Text className="mb-3 text-xs font-medium uppercase text-gray-500">{label}</Text>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = auth.currentUser;
        console.log('Current Firebase Auth user:', user?.uid);
        
        if (!user) {
          console.log('No authenticated user found, redirecting to login');
          router.replace('/login');
          return;
        }

        console.log('Fetching Firestore document for uid:', user.uid);
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        console.log('Firestore document exists:', docSnap.exists());
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log('Fetched document data:', JSON.stringify(data));
          
          const profileData = {
            name: data.name || null,
            email: data.email || null,
            role: data.role || null,
            programme: data.programme || null,
            student_id: data.student_id || null,
          };
          
          console.log('Processed profile data:', JSON.stringify(profileData));
          setProfile(profileData);
        } else {
          console.log('No document found for uid:', user.uid);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await auth.signOut();
              router.replace('/login');
            } catch (error) {
              console.error('Failed to log out:', error);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F2F4F6]">
        <Text className="text-slate-500">Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-[#F2F4F6]" showsVerticalScrollIndicator={false}>
      <View className="px-5 py-6">
        <ProfileHeader profile={profile || {} as UserProfile} />
        
        <StudentInfoCard profile={profile || {} as UserProfile} />
        
        <SectionLabel label="QUICK ACTIONS" />
        <View className="mb-6 gap-3">
          <ActionRow
            icon="bed-outline"
            iconColor="bg-green-500"
            label="Hostel Booking"
            onPress={() => router.push('/hostel-booking')}
          />
          <ActionRow
            icon="stats-chart-outline"
            iconColor="bg-purple-500"
            label="Voting & Polls"
            onPress={() => router.push('/(tabs)/polls')}
          />
        </View>
        
        <SectionLabel label="SETTINGS" />
        <View className="mb-6 gap-3">
          <ActionRow
            icon="notifications-outline"
            iconColor="bg-amber-500"
            label="Notifications"
            onPress={() => router.push('/notifications')}
          />
          <ActionRow
            icon="shield-checkmark-outline"
            iconColor="bg-blue-500"
            label="Privacy & Security"
            onPress={() => router.push('/privacy')}
          />
          <ActionRow
            icon="help-circle-outline"
            iconColor="bg-gray-500"
            label="Help & Support"
            onPress={() => router.push('/help')}
          />
        </View>
        
        <LogoutRow onLogout={handleLogout} />
        
        <View className="mb-6 items-center">
          <Text className="text-xs text-[#AAAAAA]">Campus App UPSA v1.0.0</Text>
        </View>
      </View>
    </ScrollView>
  );
}
