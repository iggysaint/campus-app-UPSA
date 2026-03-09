import { db } from '@/lib/firebase';
import { sendPushNotification } from '@/lib/notifications';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';

type Booking = {
  id: string;
  user_id: string;
  hostel_name: string;
  room_number: string;
  floor_number: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: any;
};

// FIX: crash guard
const formatDate = (timestamp: any) => {
  if (!timestamp?.toDate) return '';
  try {
    return timestamp.toDate().toLocaleDateString();
  } catch {
    return '';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return { bg: 'bg-yellow-100', text: 'text-yellow-700' };
    case 'confirmed': return { bg: 'bg-green-100', text: 'text-green-700' };
    case 'cancelled': return { bg: 'bg-red-100', text: 'text-red-700' };
    default: return { bg: 'bg-gray-100', text: 'text-gray-700' };
  }
};

export default function AdminBookings() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all');

  // FIX: extracted as useCallback
  const fetchBookings = useCallback(async () => {
    setError(false);
    try {
      const querySnapshot = await getDocs(collection(db, 'bookings'));
      const data: Booking[] = [];
      querySnapshot.forEach((docSnap) => {
        const d = docSnap.data();
        data.push({
          id: docSnap.id,
          user_id: d.user_id || '',
          hostel_name: d.hostel_name || '',
          room_number: d.room_number || '',
          floor_number: d.floor_number || '',
          status: d.status || 'pending',
          created_at: d.created_at,
        });
      });
      // FIX: sort fix
      setBookings(
        data.sort((a, b) => (b.created_at?.toMillis?.() || 0) - (a.created_at?.toMillis?.() || 0))
      );
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleConfirm = async (booking: Booking) => {
    try {
      await updateDoc(doc(db, 'bookings', booking.id), { status: 'confirmed' });

      try {
        const userDoc = await getDoc(doc(db, 'users', booking.user_id));
        if (userDoc.exists()) {
          const pushToken = userDoc.data().push_token;
          if (pushToken) {
            await sendPushNotification(
              pushToken,
              '🏠 Booking Confirmed',
              `Your room ${booking.room_number} in ${booking.hostel_name} has been confirmed!`,
              { type: 'booking' }
            );
          }
        }
      } catch {}

      setBookings(prev => prev.map(b =>
        b.id === booking.id ? { ...b, status: 'confirmed' } : b
      ));
      Alert.alert('Success', 'Booking confirmed successfully!');
    } catch {
      Alert.alert('Error', 'Failed to confirm booking');
    }
  };

  const handleCancel = async (booking: Booking) => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'bookings', booking.id), { status: 'cancelled' });

              try {
                const userDoc = await getDoc(doc(db, 'users', booking.user_id));
                if (userDoc.exists()) {
                  const pushToken = userDoc.data().push_token;
                  if (pushToken) {
                    await sendPushNotification(
                      pushToken,
                      '❌ Booking Cancelled',
                      'Your hostel booking has been cancelled. Please contact admin for more info.',
                      { type: 'booking' }
                    );
                  }
                }
              } catch {}

              setBookings(prev => prev.map(b =>
                b.id === booking.id ? { ...b, status: 'cancelled' } : b
              ));
              Alert.alert('Success', 'Booking cancelled successfully!');
            } catch {
              Alert.alert('Error', 'Failed to cancel booking');
            }
          },
        },
      ]
    );
  };

  const filteredBookings = bookings.filter(booking => {
    if (activeFilter === 'all') return true;
    return booking.status === activeFilter;
  });

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F2F4F6]">
        <ActivityIndicator color="#0088CC" />
        <Text className="text-slate-500 mt-2">Loading bookings...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F2F4F6]">
      <View className="pt-12 pb-4 px-6 flex-row items-center justify-between">
        {/* FIX: router.back() */}
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="#0088CC" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900">Hostel Bookings</Text>
        <View className="w-12" />
      </View>

      {/* Filter Tabs */}
      <View className="px-6 mb-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {(['all', 'pending', 'confirmed', 'cancelled'] as const).map((filter) => (
              <TouchableOpacity
                key={filter}
                onPress={() => setActiveFilter(filter)}
                className={`px-4 py-2 rounded-full border ${
                  activeFilter === filter
                    ? 'bg-[#0088CC] border-[#0088CC]'
                    : 'bg-white border-gray-300'
                }`}
              >
                <Text className={`text-sm font-medium ${
                  activeFilter === filter ? 'text-white' : 'text-slate-700'
                }`}>
                  {filter.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {error ? (
        <View className="flex-1 items-center justify-center">
          <Ionicons name="cloud-offline-outline" size={48} color="#9CA3AF" />
          <Text className="text-slate-500 mt-4 text-center">Unable to load bookings.</Text>
          <TouchableOpacity
            onPress={fetchBookings}
            className="mt-4 px-6 py-2 bg-[#0088CC] rounded-lg"
          >
            <Text className="text-white font-medium">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredBookings.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Ionicons name="bed-outline" size={48} color="#9CA3AF" />
          <Text className="text-slate-500 mt-4 font-medium">No bookings found.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} className="px-6 flex-1">
          {filteredBookings.map((booking) => {
            const statusColor = getStatusColor(booking.status);
            return (
              <View key={booking.id} className="mb-4 bg-white rounded-xl p-4 shadow-sm">
                <Text className="text-base font-semibold text-slate-900 mb-1" numberOfLines={1}>
                  {booking.hostel_name} — Room {booking.room_number}
                </Text>
                <Text className="text-sm text-slate-600 mb-2">
                  Floor: {booking.floor_number} · Student: {booking.user_id}
                </Text>
                <View className="flex-row items-center mb-3">
                  <View className={`px-2 py-1 rounded-full ${statusColor.bg}`}>
                    <Text className={`text-xs font-medium ${statusColor.text}`}>
                      {booking.status.toUpperCase()}
                    </Text>
                  </View>
                  <Text className="text-xs text-slate-400 ml-2">
                    • {formatDate(booking.created_at)}
                  </Text>
                </View>

                {booking.status === 'pending' && (
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => handleConfirm(booking)}
                      className="flex-1 flex-row items-center justify-center py-2 rounded-lg bg-green-500"
                    >
                      <Ionicons name="checkmark-circle" size={16} color="#fff" />
                      <Text className="text-white font-medium ml-2">Confirm</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleCancel(booking)}
                      className="flex-1 flex-row items-center justify-center py-2 rounded-lg bg-red-500"
                    >
                      <Ionicons name="close-circle" size={16} color="#fff" />
                      <Text className="text-white font-medium ml-2">Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {booking.status !== 'pending' && (
                  <Text className="text-sm text-slate-400 italic">
                    {booking.status === 'confirmed' ? 'Booking confirmed ✅' : 'Booking cancelled ❌'}
                  </Text>
                )}
              </View>
            );
          })}
          <View className="h-8" />
        </ScrollView>
      )}
    </View>
  );
}