import { auth, db } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where
} from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';

type Hostel = {
  id: string;
  name: string | null;
  total_floors: number;
  description: string | null;
  is_active: boolean;
};

type BookingData = {
  gender: 'male' | 'female' | null;
  selectedHostel: Hostel | null;
  selectedFloor: number | null;
  selectedRoom: string | null;
  selectedBed: number | null;
};

type BedBooking = {
  id: string;
  room_number: string;
  bed_number: number;
  user_id: string;
  status: string;
};

type UserBooking = {
  id: string;
  reference: string | null;
  hostel_name: string | null;
  floor_number: number | null;
  room_number: string | null;
  bed_number: number | null;
  room_type: string | null;
  amount: number | null;
  gender: string | null;
  status: string | null;
  payment_status: string | null;
  payment_reference: string | null;
  payment_method: string | null;
  paid_at: any;
  expires_at: any;
  created_at: any;
};

type HostelPricing = {
  two_in_room: number;
  four_in_room: number;
};

// Generate reference: UPSA-HSTL-FY5Y8HH (7 alphanumeric chars)
const generateReference = (docId: string): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const base = docId.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  let result = base.slice(0, 4);
  while (result.length < 7) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return `UPSA-HSTL-${result.slice(0, 7)}`;
};

const PAYMENT_BASE_URL = 'https://pay.upsa-campus.app/hostel';

// ─── Booking Status Screen ────────────────────────────────────────────────────

function BookingStatusScreen({ booking }: { booking: UserBooking }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (booking.reference) {
      await Clipboard.setStringAsync(booking.reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePayNow = async () => {
    const paymentUrl = `${PAYMENT_BASE_URL}?ref=${booking.reference}`;
    try {
      await Linking.openURL(paymentUrl);
    } catch (e) {
      Alert.alert('Error', 'Could not open payment link.');
    }
  };

  const isExpired = booking.status === 'expired';
  const isConfirmed = booking.status === 'confirmed';
  const isPending = booking.status === 'pending';
  const isCancelled = booking.status === 'cancelled';

  const statusColor = () => {
    if (isConfirmed) return 'bg-green-500';
    if (isExpired || isCancelled) return 'bg-red-400';
    return 'bg-orange-400';
  };

  const statusIcon = () => {
    if (isConfirmed) return 'checkmark-circle';
    if (isExpired || isCancelled) return 'close-circle';
    return 'time';
  };

  const statusLabel = () => {
    if (isConfirmed) return 'Confirmed';
    if (isExpired) return 'Expired';
    if (isCancelled) return 'Cancelled';
    return 'Pending Payment';
  };

  return (
    <View className="flex-1 bg-[#F2F4F6]">
      <View className="bg-white px-5 pt-14 pb-4 shadow-sm">
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="mr-3 h-10 w-10 items-center justify-center rounded-full active:opacity-80"
          >
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </Pressable>
          <Text className="text-xl font-bold text-slate-900">Your Booking</Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-5 py-6">
          <View className="rounded-xl bg-white p-6 shadow-sm">

            {/* Status Header */}
            <View className="mb-6 items-center">
              <View className={`mb-3 h-16 w-16 items-center justify-center rounded-full ${statusColor()}`}>
                <Ionicons name={statusIcon() as any} size={32} color="white" />
              </View>
              <Text className="mb-1 text-lg font-semibold text-slate-900">
                {booking.hostel_name || 'Hostel'}
              </Text>
              <View className={`rounded-full px-3 py-1 ${
                isConfirmed ? 'bg-green-100' :
                isExpired || isCancelled ? 'bg-red-100' : 'bg-orange-100'
              }`}>
                <Text className={`text-sm font-medium ${
                  isConfirmed ? 'text-green-700' :
                  isExpired || isCancelled ? 'text-red-700' : 'text-orange-700'
                }`}>
                  {statusLabel()}
                </Text>
              </View>
            </View>

            {/* Reference Number with Copy Button */}
            {booking.reference && (
              <View className="mb-4 rounded-xl bg-slate-50 border border-slate-200 p-4">
                <Text className="text-xs text-slate-500 mb-2 text-center">
                  Booking Reference
                </Text>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1" />
                  <Text className="text-xl font-bold text-slate-900 tracking-widest">
                    {booking.reference}
                  </Text>
                  <View className="flex-1 items-end">
                    <Pressable
                      onPress={handleCopy}
                      className="h-8 w-8 items-center justify-center rounded-lg bg-slate-200 active:opacity-70"
                    >
                      <Ionicons
                        name={copied ? 'checkmark' : 'copy-outline'}
                        size={16}
                        color={copied ? '#10B981' : '#64748B'}
                      />
                    </Pressable>
                  </View>
                </View>
                <Text className="text-xs text-slate-400 mt-2 text-center">
                  {copied ? '✓ Copied!' : 'Tap the copy icon to copy'}
                </Text>
              </View>
            )}

            {/* Payment Status Badge */}
            <View className="mb-4 flex-row justify-center">
              <View className={`rounded-full px-4 py-1 ${
                booking.payment_status === 'paid' ? 'bg-green-100' :
                booking.payment_status === 'failed' ? 'bg-red-100' : 'bg-gray-100'
              }`}>
                <Text className={`text-xs font-semibold ${
                  booking.payment_status === 'paid' ? 'text-green-700' :
                  booking.payment_status === 'failed' ? 'text-red-700' : 'text-gray-600'
                }`}>
                  Payment: {
                    booking.payment_status === 'paid' ? 'Paid' :
                    booking.payment_status === 'failed' ? 'Failed' : 'Unpaid'
                  }
                </Text>
              </View>
            </View>

            {/* Booking Details */}
            <View className="space-y-3">
              <View className="flex-row justify-between">
                <Text className="text-sm text-slate-600">Floor:</Text>
                <Text className="text-sm font-medium text-slate-900">
                  Floor {booking.floor_number ?? 'N/A'}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-slate-600">Room:</Text>
                <Text className="text-sm font-medium text-slate-900">
                  {booking.room_number || 'N/A'}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-slate-600">Bed:</Text>
                <Text className="text-sm font-medium text-slate-900">
                  Bed {booking.bed_number ?? 'N/A'}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-slate-600">Room Type:</Text>
                <Text className="text-sm font-medium text-slate-900">
                  {booking.room_type || 'N/A'}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm text-slate-600">Gender:</Text>
                <Text className="text-sm font-medium capitalize text-slate-900">
                  {booking.gender || 'N/A'}
                </Text>
              </View>
              <View className="border-t border-gray-200 pt-3">
                <View className="flex-row justify-between">
                  <Text className="text-base font-semibold text-slate-900">Amount:</Text>
                  <Text className="text-base font-bold text-primary">
                    GHS {booking.amount || 0}
                  </Text>
                </View>
              </View>

              {/* Payment metadata — shown after payment */}
              {booking.payment_reference && (
                <View className="border-t border-gray-200 pt-3 space-y-2">
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-slate-600">Payment Ref:</Text>
                    <Text className="text-sm font-medium text-slate-900">
                      {booking.payment_reference}
                    </Text>
                  </View>
                  {booking.payment_method && (
                    <View className="flex-row justify-between">
                      <Text className="text-sm text-slate-600">Method:</Text>
                      <Text className="text-sm font-medium capitalize text-slate-900">
                        {booking.payment_method}
                      </Text>
                    </View>
                  )}
                  {booking.paid_at && (
                    <View className="flex-row justify-between">
                      <Text className="text-sm text-slate-600">Paid At:</Text>
                      <Text className="text-sm font-medium text-slate-900">
                        {booking.paid_at?.toDate?.()?.toLocaleString() || 'N/A'}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <View className="border-t border-gray-200 pt-3">
                <Text className="text-xs text-slate-500">
                  Booked on: {booking.created_at?.toDate?.()?.toLocaleDateString() || 'Unknown date'}
                </Text>
                {isPending && booking.expires_at && (
                  <Text className="text-xs text-orange-500 mt-1">
                    ⚠ Expires: {booking.expires_at?.toDate?.()?.toLocaleString() || 'N/A'}
                  </Text>
                )}
              </View>
            </View>

            {/* Pending — Pay Now */}
            {isPending && booking.payment_status !== 'paid' && (
              <View className="mt-6">
                <View className="mb-4 rounded-lg bg-amber-50 p-4">
                  <View className="flex-row items-start">
                    <Ionicons name="time-outline" size={20} color="#F59E0B" />
                    <Text className="ml-2 text-sm text-amber-800 flex-1">
                      Complete your payment using the reference above. Your room is held for 8 hours.
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={handlePayNow}
                  className="rounded-xl bg-primary px-4 py-4 active:opacity-90"
                >
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="card-outline" size={20} color="white" />
                    <Text className="ml-2 text-base font-bold text-white">
                      Pay Now — GHS {booking.amount || 0}
                    </Text>
                  </View>
                </Pressable>
              </View>
            )}

            {/* Payment Failed */}
            {booking.payment_status === 'failed' && (
              <View className="mt-6">
                <View className="mb-4 rounded-lg bg-red-50 p-4">
                  <View className="flex-row items-start">
                    <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
                    <Text className="ml-2 text-sm text-red-800 flex-1">
                      Your last payment failed. Please try again.
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={handlePayNow}
                  className="rounded-xl bg-red-500 px-4 py-4 active:opacity-90"
                >
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="refresh-outline" size={20} color="white" />
                    <Text className="ml-2 text-base font-bold text-white">
                      Retry Payment — GHS {booking.amount || 0}
                    </Text>
                  </View>
                </Pressable>
              </View>
            )}

            {/* Confirmed */}
            {isConfirmed && (
              <View className="mt-6 rounded-lg bg-green-50 p-4">
                <View className="flex-row items-center">
                  <Ionicons name="checkmark-circle-outline" size={20} color="#10B981" />
                  <Text className="ml-2 text-sm text-green-800 flex-1">
                    Payment confirmed! Show your reference number at reception to check in.
                  </Text>
                </View>
              </View>
            )}

            {/* Expired */}
            {isExpired && (
              <View className="mt-6 rounded-lg bg-red-50 p-4">
                <View className="flex-row items-center">
                  <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
                  <Text className="ml-2 text-sm text-red-800 flex-1">
                    This booking has expired. Please make a new booking.
                  </Text>
                </View>
              </View>
            )}

            {/* Cancelled */}
            {isCancelled && (
              <View className="mt-6 rounded-lg bg-red-50 p-4">
                <View className="flex-row items-center">
                  <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
                  <Text className="ml-2 text-sm text-red-800 flex-1">
                    This booking has been cancelled. Please contact support if you need help.
                  </Text>
                </View>
              </View>
            )}

          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

const STEPS = ['Gender', 'Hostel', 'Floor', 'Room', 'Confirm'];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <View className="mb-6 flex-row items-center justify-between px-4">
      {STEPS.map((step, index) => (
        <View key={step} className="flex-1 flex-row items-center">
          <View className={`h-8 w-8 items-center justify-center rounded-full ${
            index < currentStep ? 'bg-green-500' :
            index === currentStep ? 'bg-primary' : 'bg-gray-300'
          }`}>
            {index < currentStep ? (
              <Ionicons name="checkmark" size={16} color="white" />
            ) : (
              <Text className="text-xs font-medium text-white">{index + 1}</Text>
            )}
          </View>
          <Text className={`ml-2 text-xs font-medium ${
            index <= currentStep ? 'text-slate-900' : 'text-gray-500'
          }`}>
            {step}
          </Text>
          {index < STEPS.length - 1 && (
            <View className={`mx-2 flex-1 h-0.5 ${
              index < currentStep ? 'bg-green-500' : 'bg-gray-300'
            }`} />
          )}
        </View>
      ))}
    </View>
  );
}

// ─── Cards ────────────────────────────────────────────────────────────────────

function GenderCard({ gender, selected, onPress }: {
  gender: 'male' | 'female';
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`mb-3 rounded-xl border-2 bg-white p-6 shadow-sm active:opacity-80 ${
        selected ? 'border-primary' : 'border-gray-200'
      }`}
    >
      <View className="items-center">
        <View className={`mb-3 h-16 w-16 items-center justify-center rounded-full ${
          gender === 'male' ? 'bg-blue-100' : 'bg-pink-100'
        }`}>
          <Ionicons
            name={gender === 'male' ? 'man' : 'woman'}
            size={32}
            color={gender === 'male' ? '#0088CC' : '#EC4899'}
          />
        </View>
        <Text className="text-lg font-semibold capitalize text-slate-900">{gender}</Text>
      </View>
    </Pressable>
  );
}

function HostelCard({ hostel, selected, onPress }: {
  hostel: Hostel;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`mb-3 rounded-xl border-2 bg-white p-4 shadow-sm active:opacity-80 ${
        selected ? 'border-primary' : 'border-gray-200'
      }`}
    >
      <View className="flex-row items-start">
        <View className="mr-3 h-10 w-10 items-center justify-center rounded-lg bg-green-100">
          <Ionicons name="business" size={20} color="#10B981" />
        </View>
        <View className="flex-1">
          <Text className="mb-1 text-base font-semibold text-slate-900">
            {hostel.name || 'Hostel'}
          </Text>
          <Text className="mb-2 text-sm text-slate-600">
            {hostel.description || 'No description'}
          </Text>
          <Text className="text-xs text-slate-500">
            {hostel.total_floors} floors available
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function FloorCard({ floor, selected, onPress }: {
  floor: number;
  selected: boolean;
  onPress: () => void;
}) {
  const roomRange = floor === 0 ? '001-050' : `${floor}01-${floor}50`;
  return (
    <Pressable
      onPress={onPress}
      className={`mb-3 rounded-xl border-2 bg-white p-4 shadow-sm active:opacity-80 ${
        selected ? 'border-primary' : 'border-gray-200'
      }`}
    >
      <View className="flex-row items-center">
        <View className="mr-3 h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
          <Ionicons name="layers" size={20} color="#9333EA" />
        </View>
        <View className="flex-1">
          <Text className="mb-1 text-base font-semibold text-slate-900">Floor {floor}</Text>
          <Text className="text-sm text-slate-500">Rooms {roomRange}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function RoomCard({ room, roomType, available, selected, onPress, pricing }: {
  room: string;
  roomType: string;
  available: boolean;
  selected: boolean;
  onPress: () => void;
  pricing: HostelPricing | null;
}) {
  const price = roomType === '2-in-room'
    ? pricing?.two_in_room ?? '...'
    : pricing?.four_in_room ?? '...';

  return (
    <Pressable
      onPress={available ? onPress : undefined}
      className={`mb-2 rounded-xl border-2 p-3 active:opacity-80 ${
        selected
          ? 'border-primary bg-primary/10'
          : available
            ? 'border-gray-200 bg-white shadow-sm'
            : 'border-gray-100 bg-gray-50 opacity-50'
      }`}
    >
      <View className="flex-row items-center justify-between">
        <Text className={`text-base font-semibold ${
          selected ? 'text-primary' : 'text-slate-900'
        }`}>
          {room}
        </Text>
        <View className="flex-row items-center gap-2">
          <Text className="text-xs text-slate-500">GHS {price}</Text>
          <View className={`rounded-full px-2 py-1 ${
            roomType === '2-in-room' ? 'bg-blue-100' : 'bg-green-100'
          }`}>
            <Text className={`text-xs font-medium ${
              roomType === '2-in-room' ? 'text-blue-700' : 'text-green-700'
            }`}>
              {roomType}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Bed Selection Modal ──────────────────────────────────────────────────────

function BedSelectionModal({
  visible, room, roomType, onClose, onConfirm
}: {
  visible: boolean;
  room: string;
  roomType: string;
  onClose: () => void;
  onConfirm: (bedNumber: number) => void;
}) {
  const [bedBookings, setBedBookings] = useState<BedBooking[]>([]);
  const [selectedBed, setSelectedBed] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const totalBeds = roomType === '2-in-room' ? 2 : 4;

  useEffect(() => {
    if (visible && room) fetchBedBookings();
  }, [visible, room]);

  const fetchBedBookings = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'bookings'),
        where('room_number', '==', room),
        where('status', 'in', ['pending', 'confirmed'])
      );
      const querySnapshot = await getDocs(q);
      const bookings: BedBooking[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        bookings.push({
          id: docSnap.id,
          room_number: data.room_number || '',
          bed_number: data.bed_number || 0,
          user_id: data.user_id || '',
          status: data.status || '',
        });
      });
      setBedBookings(bookings);
    } catch (e) {
      console.log('fetchBedBookings error:', e);
    } finally {
      setLoading(false);
    }
  };

  const isBedOccupied = (bedNumber: number) => {
    return bedBookings.some(b => b.bed_number === bedNumber);
  };

  const handleConfirm = () => {
    if (selectedBed !== null) {
      onConfirm(selectedBed);
      onClose();
    } else {
      Alert.alert('Error', 'Please select a bed to continue');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-[#F2F4F6]">
        <View className="bg-white px-5 pt-14 pb-6 shadow-sm">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-bold text-slate-900">Room {room}</Text>
            <Pressable onPress={onClose} className="active:opacity-80">
              <Ionicons name="close" size={24} color="#6B7280" />
            </Pressable>
          </View>

          <View className={`mb-4 rounded-lg p-3 ${
            roomType === '2-in-room' ? 'bg-blue-100' : 'bg-green-100'
          }`}>
            <Text className={`text-sm font-medium ${
              roomType === '2-in-room' ? 'text-blue-700' : 'text-green-700'
            }`}>
              {roomType} — {totalBeds} Beds
            </Text>
          </View>

          {loading ? (
            <Text className="text-center text-slate-500 py-8">Loading bed status...</Text>
          ) : (
            <View className="space-y-3">
              {Array.from({ length: totalBeds }, (_, i) => {
                const bedNumber = i + 1;
                const occupied = isBedOccupied(bedNumber);
                const selected = selectedBed === bedNumber;
                return (
                  <Pressable
                    key={bedNumber}
                    onPress={() => !occupied && setSelectedBed(bedNumber)}
                    disabled={occupied}
                    className={`rounded-xl border-2 p-4 active:opacity-80 ${
                      selected
                        ? 'border-primary bg-primary/10'
                        : occupied
                          ? 'border-red-300 bg-red-50 opacity-60'
                          : 'border-green-300 bg-green-50'
                    }`}
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className={`text-base font-semibold ${
                        selected ? 'text-primary' : occupied ? 'text-red-600' : 'text-green-700'
                      }`}>
                        Bed {bedNumber}
                      </Text>
                      <Text className={`text-sm font-medium ${
                        occupied ? 'text-red-600' : 'text-green-700'
                      }`}>
                        {occupied ? 'Occupied' : 'Available'}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          <View className="flex-row gap-3 mt-6">
            <Pressable
              onPress={onClose}
              className="flex-1 rounded-xl border-2 border-gray-300 px-4 py-3 active:opacity-80"
            >
              <Text className="text-center text-base font-semibold text-gray-600">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              disabled={selectedBed === null}
              className={`flex-1 rounded-xl px-4 py-3 active:opacity-90 ${
                selectedBed !== null ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <Text className={`text-center text-base font-semibold ${
                selectedBed !== null ? 'text-white' : 'text-gray-500'
              }`}>
                Confirm Bed
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Confirm Card ─────────────────────────────────────────────────────────────

function ConfirmCard({ bookingData, pricing, onConfirm }: {
  bookingData: BookingData;
  pricing: HostelPricing | null;
  onConfirm: () => void;
}) {
  const roomType = bookingData.selectedRoom
    ? (bookingData.selectedRoom.endsWith('15') || bookingData.selectedRoom.endsWith('44')
      ? '2-in-room' : '4-in-room')
    : '4-in-room';

  const price = roomType === '2-in-room'
    ? pricing?.two_in_room ?? 0
    : pricing?.four_in_room ?? 0;

  return (
    <View className="rounded-xl bg-white p-6 shadow-sm">
      <Text className="mb-4 text-lg font-semibold text-slate-900">Booking Summary</Text>
      <View className="space-y-3">
        <View className="flex-row justify-between">
          <Text className="text-sm text-slate-600">Hostel:</Text>
          <Text className="text-sm font-medium text-slate-900">
            {bookingData.selectedHostel?.name || 'N/A'}
          </Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-sm text-slate-600">Floor:</Text>
          <Text className="text-sm font-medium text-slate-900">
            Floor {bookingData.selectedFloor ?? 'N/A'}
          </Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-sm text-slate-600">Room:</Text>
          <Text className="text-sm font-medium text-slate-900">
            {bookingData.selectedRoom || 'N/A'}
          </Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-sm text-slate-600">Bed:</Text>
          <Text className="text-sm font-medium text-slate-900">
            Bed {bookingData.selectedBed ?? 'N/A'}
          </Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-sm text-slate-600">Room Type:</Text>
          <Text className="text-sm font-medium text-slate-900">{roomType}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-sm text-slate-600">Gender:</Text>
          <Text className="text-sm font-medium capitalize text-slate-900">
            {bookingData.gender || 'N/A'}
          </Text>
        </View>
        <View className="border-t border-gray-200 pt-3">
          <View className="flex-row justify-between">
            <Text className="text-base font-semibold text-slate-900">Amount:</Text>
            <Text className="text-base font-bold text-primary">GHS {price}</Text>
          </View>
        </View>
      </View>

      <View className="mt-4 rounded-lg bg-blue-50 p-3">
        <View className="flex-row items-start">
          <Ionicons name="information-circle-outline" size={18} color="#0088CC" />
          <Text className="ml-2 text-xs text-blue-700 flex-1">
            After booking you will receive a unique reference number and a payment link. Your room is held for 8 hours.
          </Text>
        </View>
      </View>

      <Pressable
        onPress={onConfirm}
        className="mt-6 rounded-xl bg-primary px-4 py-3 active:opacity-90"
      >
        <Text className="text-center text-base font-semibold text-white">Confirm Booking</Text>
      </Pressable>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HostelBookingScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(false);
  const [showBedModal, setShowBedModal] = useState(false);
  const [existingBooking, setExistingBooking] = useState<UserBooking | null>(null);
  const [pricing, setPricing] = useState<HostelPricing | null>(null);

  const [bookingData, setBookingData] = useState<BookingData>({
    gender: null,
    selectedHostel: null,
    selectedFloor: null,
    selectedRoom: null,
    selectedBed: null,
  });

  // FIX: defined OUTSIDE useEffect so it can be called from HostelCard onPress
  const fetchPricingForHostel = useCallback(async (hostelId: string) => {
    try {
      const hostelDoc = await getDoc(doc(db, 'hostels', hostelId));
      if (hostelDoc.exists()) {
        const data = hostelDoc.data();
        setPricing({
          two_in_room: data.two_in_room || 0,
          four_in_room: data.four_in_room || 0,
        });
      }
    } catch (e) {
      console.log('fetchPricingForHostel error:', e);
    }
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.replace('/login');
      return;
    }

    // Realtime listener — only pending/confirmed bookings
    const q = query(
      collection(db, 'bookings'),
      where('user_id', '==', user.uid),
      where('status', 'in', ['pending', 'confirmed'])
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const bookings: UserBooking[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        bookings.push({
          id: docSnap.id,
          reference: data.reference || null,
          hostel_name: data.hostel_name || null,
          floor_number: data.floor_number ?? null,
          room_number: data.room_number || null,
          bed_number: data.bed_number ?? null,
          room_type: data.room_type || null,
          amount: data.amount || null,
          gender: data.gender || null,
          status: data.status || null,
          payment_status: data.payment_status || 'unpaid',
          payment_reference: data.payment_reference || null,
          payment_method: data.payment_method || null,
          paid_at: data.paid_at || null,
          expires_at: data.expires_at || null,
          created_at: data.created_at || null,
        });
      });
      setExistingBooking(bookings.length > 0 ? bookings[0] : null);
    }, (e) => console.log('booking listener error:', e));

    // Fetch hostels
    const fetchHostels = async () => {
      try {
        setLoading(true);
        const hostelQuery = query(
          collection(db, 'hostels'),
          where('is_active', '==', true)
        );
        const querySnapshot = await getDocs(hostelQuery);
        const data: Hostel[] = [];
        querySnapshot.forEach((docSnap) => {
          const d = docSnap.data();
          data.push({
            id: docSnap.id,
            name: d.name || null,
            total_floors: d.total_floors || 0,
            description: d.description || null,
            is_active: d.is_active || false,
          });
        });
        setHostels(data);
      } catch (e) {
        console.log('fetchHostels error:', e);
      } finally {
        setLoading(false);
      }
    };

    // FIX: only fetchHostels here — NO fetchPricing call
    fetchHostels();
    return () => unsubscribe();
  }, [router]);

  if (existingBooking) {
    return <BookingStatusScreen booking={existingBooking} />;
  }

  const getRoomType = (roomNumber: string) => {
    return roomNumber.endsWith('15') || roomNumber.endsWith('44')
      ? '2-in-room' : '4-in-room';
  };

  const generateRooms = (floor: number) => {
    const rooms = [];
    for (let i = 1; i <= 50; i++) {
      const roomNumber = floor === 0
        ? `00${i}`.slice(-3)
        : `${floor}${i.toString().padStart(2, '0')}`;
      rooms.push(roomNumber);
    }
    return rooms;
  };

  const getAvailableFloors = (totalFloors: number, gender: 'male' | 'female') => {
    const floors = [];
    for (let i = 0; i < totalFloors; i++) {
      if (gender === 'male' && i % 2 === 0) floors.push(i);
      else if (gender === 'female' && i % 2 === 1) floors.push(i);
    }
    return floors;
  };

  const handleConfirmBooking = async () => {
    const user = auth.currentUser;
    if (!user || !bookingData.selectedHostel || !bookingData.selectedRoom || !bookingData.selectedBed) {
      Alert.alert('Error', 'Missing booking information');
      return;
    }

    try {
      const roomType = getRoomType(bookingData.selectedRoom);
      const amount = roomType === '2-in-room'
        ? pricing?.two_in_room ?? 0
        : pricing?.four_in_room ?? 0;

      const bookingRef = doc(collection(db, 'bookings'));
      const reference = generateReference(bookingRef.id);

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 8);

      await setDoc(bookingRef, {
        reference,
        user_id: user.uid,
        hostel_name: bookingData.selectedHostel.name,
        floor_number: bookingData.selectedFloor,
        room_number: bookingData.selectedRoom,
        bed_number: bookingData.selectedBed,
        room_type: roomType,
        gender: bookingData.gender,
        amount,
        status: 'pending',
        payment_status: 'unpaid',
        payment_reference: null,
        payment_method: null,
        paid_at: null,
        expires_at: expiresAt,
        created_at: serverTimestamp(),
      });

    } catch (e) {
      console.log('handleConfirmBooking error:', e);
      Alert.alert('Error', 'Failed to submit booking. Please try again.');
    }
  };

  const canContinue = () => {
    switch (currentStep) {
      case 0: return bookingData.gender !== null;
      case 1: return bookingData.selectedHostel !== null;
      case 2: return bookingData.selectedFloor !== null;
      case 3: return bookingData.selectedRoom !== null;
      case 4: return true;
      default: return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <View>
            <GenderCard gender="male" selected={bookingData.gender === 'male'} onPress={() => setBookingData({ ...bookingData, gender: 'male' })} />
            <GenderCard gender="female" selected={bookingData.gender === 'female'} onPress={() => setBookingData({ ...bookingData, gender: 'female' })} />
          </View>
        );

      case 1:
        return (
          <View>
            {loading ? (
              <Text className="text-center text-slate-500">Loading hostels...</Text>
            ) : hostels.length === 0 ? (
              <Text className="text-center text-slate-500">No hostels available</Text>
            ) : (
              hostels.map((hostel) => (
                <HostelCard
                  key={hostel.id}
                  hostel={hostel}
                  selected={bookingData.selectedHostel?.id === hostel.id}
                  // FIX: fetch pricing for this hostel when selected
                  onPress={() => {
                    setBookingData({ ...bookingData, selectedHostel: hostel });
                    fetchPricingForHostel(hostel.id);
                  }}
                />
              ))
            )}
          </View>
        );

      case 2:
        if (!bookingData.selectedHostel || !bookingData.gender) return null;
        const availableFloors = getAvailableFloors(
          bookingData.selectedHostel.total_floors,
          bookingData.gender
        );
        return (
          <View>
            {availableFloors.map((floor) => (
              <FloorCard
                key={floor}
                floor={floor}
                selected={bookingData.selectedFloor === floor}
                onPress={() => setBookingData({ ...bookingData, selectedFloor: floor })}
              />
            ))}
          </View>
        );

      case 3:
        if (bookingData.selectedFloor === null) return null;
        const rooms = generateRooms(bookingData.selectedFloor);
        return (
          <View>
            {rooms.map((room) => (
              <RoomCard
                key={room}
                room={room}
                roomType={getRoomType(room)}
                available={true}
                selected={bookingData.selectedRoom === room}
                pricing={pricing}
                onPress={() => {
                  setBookingData({ ...bookingData, selectedRoom: room });
                  setShowBedModal(true);
                }}
              />
            ))}
          </View>
        );

      case 4:
        return (
          <ConfirmCard
            bookingData={bookingData}
            pricing={pricing}
            onConfirm={handleConfirmBooking}
          />
        );

      default:
        return null;
    }
  };

  return (
    <View className="flex-1 bg-[#F2F4F6]">
      <View className="bg-white px-5 pt-14 pb-4 shadow-sm">
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="mr-3 h-10 w-10 items-center justify-center rounded-full active:opacity-80"
          >
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </Pressable>
          <Text className="text-xl font-bold text-slate-900">Hostel Booking</Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-5 py-6">
          <StepIndicator currentStep={currentStep} />
          <View className="min-h-[400px]">
            {renderStep()}
          </View>

          {currentStep < 4 && (
            <View className="mt-6 flex-row gap-3">
              {currentStep > 0 && (
                <Pressable
                  onPress={() => setCurrentStep(currentStep - 1)}
                  className="flex-1 rounded-xl border-2 border-gray-300 px-4 py-3 active:opacity-80"
                >
                  <Text className="text-center text-base font-semibold text-gray-600">Back</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => setCurrentStep(currentStep + 1)}
                disabled={!canContinue()}
                className={`flex-1 rounded-xl px-4 py-3 active:opacity-90 ${
                  canContinue() ? 'bg-primary' : 'bg-gray-300'
                }`}
              >
                <Text className={`text-center text-base font-semibold ${
                  canContinue() ? 'text-white' : 'text-gray-500'
                }`}>
                  {currentStep === 3 ? 'Review' : 'Continue'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>

      <BedSelectionModal
        visible={showBedModal}
        room={bookingData.selectedRoom || ''}
        roomType={getRoomType(bookingData.selectedRoom || '')}
        onClose={() => setShowBedModal(false)}
        onConfirm={(bedNumber) => {
          setBookingData({ ...bookingData, selectedBed: bedNumber });
          setShowBedModal(false);
          setCurrentStep(4);
        }}
      />
    </View>
  );
}