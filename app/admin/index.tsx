import { db } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type AdminModule = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  navigateTo: string;
};

type Hostel = {
  id: string;
  name: string;
  two_in_room: number;
  four_in_room: number;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [selectedHostel, setSelectedHostel] = useState<Hostel | null>(null);
  const [twoInRoom, setTwoInRoom] = useState('');
  const [fourInRoom, setFourInRoom] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingHostels, setLoadingHostels] = useState(false);

  const adminModules: AdminModule[] = [
    {
      id: '1',
      title: 'Announcements',
      description: 'Create and manage announcements',
      icon: 'megaphone-outline',
      navigateTo: '/admin/announcements',
    },
    {
      id: '2',
      title: 'Polls',
      description: 'Create and monitor polls',
      icon: 'stats-chart-outline',
      navigateTo: '/admin/polls',
    },
    {
      id: '3',
      title: 'Library',
      description: 'Upload and manage files',
      icon: 'library-outline',
      navigateTo: '/admin/library',
    },
    {
      id: '4',
      title: 'Clubs',
      description: 'Manage campus clubs',
      icon: 'people-outline',
      navigateTo: '/admin/clubs',
    },
    {
      id: '5',
      title: 'Hostel Bookings',
      description: 'Confirm and cancel bookings',
      icon: 'bed-outline',
      navigateTo: '/admin/bookings',
    },
    {
      id: '6',
      title: 'Class Schedules',
      description: 'Manage class timetables',
      icon: 'calendar-outline',
      navigateTo: '/admin/schedules',
    },
  ];

  useEffect(() => {
    if (showPricingModal) loadHostels();
  }, [showPricingModal]);

  const loadHostels = async () => {
    setLoadingHostels(true);
    try {
      const q = query(collection(db, 'hostels'), where('is_active', '==', true));
      const snap = await getDocs(q);
      const data: Hostel[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        data.push({
          id: docSnap.id,
          name: d.name || 'Unnamed Hostel',
          two_in_room: d.two_in_room || 0,
          four_in_room: d.four_in_room || 0,
        });
      });
      // Sort: Hostel A, Hostel B, Hostel C
      data.sort((a, b) => a.name.localeCompare(b.name));
      setHostels(data);
    } catch (e) {
      console.log('loadHostels error:', e);
    } finally {
      setLoadingHostels(false);
    }
  };

  const handleSelectHostel = (hostel: Hostel) => {
    setSelectedHostel(hostel);
    setTwoInRoom(hostel.two_in_room > 0 ? String(hostel.two_in_room) : '');
    setFourInRoom(hostel.four_in_room > 0 ? String(hostel.four_in_room) : '');
  };

  const savePricing = async () => {
    if (!selectedHostel) {
      Alert.alert('Error', 'Please select a hostel first');
      return;
    }
    const two = Number(twoInRoom);
    const four = Number(fourInRoom);
    if (!twoInRoom || !fourInRoom || isNaN(two) || isNaN(four)) {
      Alert.alert('Error', 'Please enter valid prices for both room types');
      return;
    }
    if (two <= 0 || four <= 0) {
      Alert.alert('Error', 'Prices must be greater than 0');
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, 'hostels', selectedHostel.id), {
        two_in_room: two,
        four_in_room: four,
      });
      // Update local state
      setHostels(prev => prev.map(h =>
        h.id === selectedHostel.id
          ? { ...h, two_in_room: two, four_in_room: four }
          : h
      ));
      setSelectedHostel(null);
      setTwoInRoom('');
      setFourInRoom('');
      Alert.alert('Success', `Prices updated for ${selectedHostel.name}`);
    } catch (e) {
      console.log('savePricing error:', e);
      Alert.alert('Error', 'Failed to save pricing. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F2F4F6]">
      <View className="pt-12 pb-8">

        {/* Header */}
        <View className="flex-row items-center justify-between px-6 mb-8">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="#0088CC" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-900">Admin Dashboard</Text>
          <View className="w-12" />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} className="px-6">
          <View className="flex-row flex-wrap justify-between">

            {adminModules.map((module) => (
              <TouchableOpacity
                key={module.id}
                onPress={() => router.push(module.navigateTo as any)}
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
                <Text className="text-center text-sm text-slate-500">
                  {module.description}
                </Text>
                <View className="items-center mt-2">
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            ))}

            {/* Hostel Pricing — full width */}
            <TouchableOpacity
              onPress={() => setShowPricingModal(true)}
              className="w-full mb-4 bg-white rounded-xl p-5 shadow-sm active:opacity-90 flex-row items-center"
            >
              <View className="w-14 h-14 items-center justify-center rounded-full bg-green-100 mr-4">
                <Ionicons name="pricetag-outline" size={28} color="#10B981" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-slate-900">Hostel Pricing</Text>
                <Text className="text-sm text-slate-500 mt-1">
                  Set room prices per hostel
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

          </View>
        </ScrollView>
      </View>

      {/* Pricing Modal */}
      <Modal
        visible={showPricingModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowPricingModal(false);
          setSelectedHostel(null);
          setTwoInRoom('');
          setFourInRoom('');
        }}
      >
        <View className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-6 pt-14 pb-4 border-b border-gray-100">
            <Text className="text-lg font-semibold text-slate-900">Hostel Pricing</Text>
            <TouchableOpacity onPress={() => {
              setShowPricingModal(false);
              setSelectedHostel(null);
              setTwoInRoom('');
              setFourInRoom('');
            }}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-6 pt-6">

            {/* Step 1 — Select Hostel */}
            <Text className="text-sm font-semibold text-slate-700 mb-3">
              Select Hostel
            </Text>

            {loadingHostels ? (
              <Text className="text-sm text-slate-500 mb-4">Loading hostels...</Text>
            ) : hostels.length === 0 ? (
              <Text className="text-sm text-slate-500 mb-4">No active hostels found</Text>
            ) : (
              <View className="mb-6 gap-2">
                {hostels.map((hostel) => (
                  <TouchableOpacity
                    key={hostel.id}
                    onPress={() => handleSelectHostel(hostel)}
                    className={`rounded-xl border-2 p-4 flex-row items-center justify-between ${
                      selectedHostel?.id === hostel.id
                        ? 'border-primary bg-blue-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <View className="flex-row items-center">
                      <View className="w-10 h-10 rounded-full bg-green-100 items-center justify-center mr-3">
                        <Ionicons name="business-outline" size={20} color="#10B981" />
                      </View>
                      <View>
                        <Text className={`text-base font-semibold ${
                          selectedHostel?.id === hostel.id ? 'text-primary' : 'text-slate-900'
                        }`}>
                          {hostel.name}
                        </Text>
                        {hostel.two_in_room > 0 ? (
                          <Text className="text-xs text-slate-500">
                            2-in-room: GHS {hostel.two_in_room} · 4-in-room: GHS {hostel.four_in_room}
                          </Text>
                        ) : (
                          <Text className="text-xs text-orange-500">No prices set yet</Text>
                        )}
                      </View>
                    </View>
                    {selectedHostel?.id === hostel.id && (
                      <Ionicons name="checkmark-circle" size={22} color="#0088CC" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Step 2 — Set Prices (only show when hostel selected) */}
            {selectedHostel && (
              <View>
                <Text className="text-sm font-semibold text-slate-700 mb-3">
                  Set Prices for {selectedHostel.name}
                </Text>

                <View className="mb-4">
                  <Text className="text-sm text-slate-600 mb-2">2-in-Room Price (GHS)</Text>
                  <TextInput
                    value={twoInRoom}
                    onChangeText={setTwoInRoom}
                    placeholder="e.g. 1500"
                    keyboardType="numeric"
                    className="border border-gray-200 rounded-xl px-4 py-3 text-base text-slate-900 bg-gray-50"
                  />
                </View>

                <View className="mb-6">
                  <Text className="text-sm text-slate-600 mb-2">4-in-Room Price (GHS)</Text>
                  <TextInput
                    value={fourInRoom}
                    onChangeText={setFourInRoom}
                    placeholder="e.g. 800"
                    keyboardType="numeric"
                    className="border border-gray-200 rounded-xl px-4 py-3 text-base text-slate-900 bg-gray-50"
                  />
                </View>

                <View className="rounded-xl bg-blue-50 p-4 mb-6">
                  <View className="flex-row items-start">
                    <Ionicons name="information-circle-outline" size={18} color="#0088CC" />
                    <Text className="ml-2 text-xs text-blue-700 flex-1">
                      Prices will update immediately for all students booking {selectedHostel.name}.
                    </Text>
                  </View>
                </View>
              </View>
            )}

          </ScrollView>

          {/* Footer Buttons */}
          <View className="flex-row px-6 pb-10 pt-4 gap-3 border-t border-gray-100">
            <TouchableOpacity
              onPress={() => {
                setShowPricingModal(false);
                setSelectedHostel(null);
                setTwoInRoom('');
                setFourInRoom('');
              }}
              className="flex-1 border border-gray-200 rounded-xl py-3 items-center"
              disabled={saving}
            >
              <Text className="text-base font-semibold text-gray-600">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={savePricing}
              disabled={saving || !selectedHostel}
              className={`flex-1 rounded-xl py-3 items-center ${
                saving || !selectedHostel ? 'bg-primary/40' : 'bg-primary'
              }`}
            >
              <Text className="text-base font-semibold text-white">
                {saving ? 'Saving...' : 'Save Prices'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}