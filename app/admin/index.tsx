import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

type AdminModule = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  navigateTo: string;
};

export default function AdminDashboard() {
  const router = useRouter();

  const adminModules: AdminModule[] = [
    {
      id: '1',
      title: 'Announcements',
      description: 'Create and manage announcements',
      icon: 'megaphone-outline',
      navigateTo: '/admin/announcements'
    },
    {
      id: '2',
      title: 'Polls',
      description: 'Create and monitor polls',
      icon: 'stats-chart-outline',
      navigateTo: '/admin/polls'
    },
    {
      id: '3',
      title: 'Library',
      description: 'Upload and manage files',
      icon: 'library-outline',
      navigateTo: '/admin/library'
    },
    {
      id: '4',
      title: 'Clubs',
      description: 'Manage campus clubs',
      icon: 'people-outline',
      navigateTo: '/admin/clubs'
    },
    {
      id: '5',
      title: 'Hostel Bookings',
      description: 'Confirm and cancel bookings',
      icon: 'bed-outline',
      navigateTo: '/admin/bookings'
    },
    {
      id: '6',
      title: 'Class Schedules',
      description: 'Manage class timetables',
      icon: 'calendar-outline',
      navigateTo: '/admin/schedules'
    }
  ];

  const handleModulePress = (module: AdminModule) => {
    router.push(module.navigateTo);
  };

  const handleBack = () => {
    router.push('/admin');
  };

  return (
    <View className="flex-1 bg-[#F2F4F6]">
      <View className="pt-12 pb-8">
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 mb-8">
          <TouchableOpacity
            onPress={handleBack}
            className="p-2"
          >
            <Ionicons name="arrow-back" size={24} color="#0088CC" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-900">Admin Dashboard</Text>
          <View className="w-12" />
        </View>

        {/* Module Grid */}
        <ScrollView showsVerticalScrollIndicator={false} className="px-6">
          <View className="flex-row flex-wrap justify-between">
            {adminModules.map((module) => (
              <TouchableOpacity
                key={module.id}
                onPress={() => handleModulePress(module)}
                className="w-[48%] mb-4 bg-white rounded-xl p-6 shadow-sm active:opacity-90"
              >
                <View className="items-center mb-4">
                  <View className="w-16 h-16 items-center justify-center rounded-full bg-primary/10">
                    <Ionicons name={module.icon} size={32} color="#0088CC" />
                  </View>
                </View>
                <Text className="text-center text-lg font-semibold text-slate-900 mb-2">
                  {module.title}
                </Text>
                <Text className="text-center text-sm text-slate-500 text-center">
                  {module.description}
                </Text>
                <View className="items-center">
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
