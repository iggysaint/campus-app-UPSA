import { db } from '@/lib/firebase';
import { sendPushNotification } from '@/lib/notifications';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';

type Booking = {
  id: string;
  user_id: string;
  hostel_name: string;
  room_number: string;
  floor_number: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: any;
};

export default function AdminBookings() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all');

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'bookings'));
        const data: Booking[] = [];
        querySnapshot.forEach((doc) => {
          const docData = doc.data();
          data.push({
            id: doc.id,
            user_id: docData.user_id || '',
            hostel_name: docData.hostel_name || '',
            room_number: docData.room_number || '',
            floor_number: docData.floor_number || '',
            status: docData.status || 'pending',
            created_at: docData.created_at
          });
        });
        setBookings(data.sort((a, b) => b.created_at?.toMillis() - a.created_at?.toMillis()).reverse());
      } catch (error) {
        console.error('Error fetching bookings:', error);
        Alert.alert('Error', 'Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const handleConfirm = async (booking: Booking) => {
    try {
      await updateDoc(doc(db, 'bookings', booking.id), {
        status: 'confirmed'
      });
      
      // Fetch user's push token and send notification
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
      
      setBookings(bookings.map(b => 
        b.id === booking.id ? { ...b, status: 'confirmed' } : b
      ));
      Alert.alert('Success', 'Booking confirmed successfully!');
    } catch (error) {
      console.error('Error confirming booking:', error);
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
              await updateDoc(doc(db, 'bookings', booking.id), {
                status: 'cancelled'
              });
              
              // Fetch user's push token and send notification
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
              
              setBookings(bookings.map(b => 
                b.id === booking.id ? { ...b, status: 'cancelled' } : b
              ));
              Alert.alert('Success', 'Booking cancelled successfully!');
            } catch (error) {
              console.error('Error cancelling booking:', error);
              Alert.alert('Error', 'Failed to cancel booking');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'confirmed': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'PENDING';
      case 'confirmed': return 'CONFIRMED';
      case 'cancelled': return 'CANCELLED';
      default: return status.toUpperCase();
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString();
  };

  const handleBack = () => {
    router.push('/admin');
  };

  const filteredBookings = bookings.filter(booking => {
    if (activeFilter === 'all') return true;
    return booking.status === activeFilter;
  });

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F2F4F6]">
        <Text className="text-slate-500">Loading bookings...</Text>
      </View>
    );
  }

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
          <Text className="text-xl font-bold text-slate-900">Manage Hostel Bookings</Text>
          <View className="w-12" />
        </View>

        {/* Filter Tabs */}
        <View className="px-6 mb-6">
          <View className="flex-row bg-white rounded-lg p-1 shadow-sm">
            {(['all', 'pending', 'confirmed', 'cancelled'] as const).map((filter) => (
              <TouchableOpacity
                key={filter}
                onPress={() => setActiveFilter(filter)}
                className={`flex-1 py-2 px-4 ${
                  activeFilter === filter
                    ? 'bg-primary border-primary'
                    : 'bg-transparent border-transparent'
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
        </View>

        {/* Content */}
        <ScrollView showsVerticalScrollIndicator={false} className="px-6">
          {filteredBookings.map((booking) => (
            <View key={booking.id} className="mb-4 bg-white rounded-xl p-4 shadow-sm">
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-slate-900 mb-1">
                    {booking.hostel_name} - Room {booking.room_number}
                  </Text>
                  <Text className="text-sm text-slate-600 mb-2">
                    Floor: {booking.floor_number} • Student ID: {booking.user_id}
                  </Text>
                  <View className="flex-row items-center mb-2">
                    <View className={`px-2 py-1 rounded-full ${getStatusColor(booking.status)}`}>
                      <Text className="text-xs font-medium">
                        {getStatusText(booking.status)}
                      </Text>
                    </View>
                    <Text className="text-xs text-slate-500 ml-2">
                      • {formatDate(booking.created_at)}
                    </Text>
                  </View>
                </View>
                <View className="flex-row gap-2">
                  {booking.status === 'pending' && (
                    <>
                      <TouchableOpacity
                        onPress={() => handleConfirm(booking)}
                        className="px-4 py-2 rounded-lg bg-green-500"
                      >
                        <Ionicons name="checkmark-circle" size={16} color="#fff" />
                        <Text className="text-white font-medium ml-2">Confirm</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleCancel(booking)}
                        className="px-4 py-2 rounded-lg bg-red-500"
                      >
                        <Ionicons name="close-circle" size={16} color="#fff" />
                        <Text className="text-white font-medium ml-2">Cancel</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {booking.status !== 'pending' && (
                    <Text className="text-sm text-slate-500 italic">
                      {booking.status === 'confirmed' ? 'Booking confirmed' : 'Booking cancelled'}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
