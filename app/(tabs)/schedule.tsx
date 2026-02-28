import { db } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

type Schedule = {
  id: string;
  course_name: string | null;
  course_code: string | null;
  day: string | null;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  lecturer: string | null;
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const DAY_MAP: { [key: string]: string } = {
  'Mon': 'Monday',
  'Tue': 'Tuesday',
  'Wed': 'Wednesday',
  'Thu': 'Thursday',
  'Fri': 'Friday',
};

function getTodayDay(): string {
  const today = new Date().getDay();
  const dayMap: { [key: number]: string } = {
    1: 'Mon',
    2: 'Tue',
    3: 'Wed',
    4: 'Thu',
    5: 'Fri',
    6: 'Sat',
    0: 'Sun',
  };
  return dayMap[today] || 'Mon';
}

function formatTime(time?: string | null) {
  if (!time) return '';
  // Convert 24h format to 12h format
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${minutes || '00'} ${ampm}`;
}

function ScheduleCard({ schedule }: { schedule: Schedule }) {
  return (
    <View className="rounded-2xl bg-white p-4 shadow-sm">
      <View className="mb-2 flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-base font-semibold text-slate-900">
            {schedule.course_code || 'Course'}
          </Text>
          <Text className="text-sm text-slate-600">
            {schedule.course_name || 'Course Name'}
          </Text>
        </View>
        <View className="rounded-lg bg-blue-100 px-2 py-1">
          <Text className="text-xs font-medium text-blue-700">
            {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
          </Text>
        </View>
      </View>
      
      <View className="flex-row items-center gap-4">
        <View className="flex-row items-center">
          <Ionicons name="location-outline" size={14} color="#6B7280" />
          <Text className="ml-1 text-sm text-slate-500">
            {schedule.venue || 'Venue'}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Ionicons name="person-outline" size={14} color="#6B7280" />
          <Text className="ml-1 text-sm text-slate-500">
            {schedule.lecturer || 'Lecturer'}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function ScheduleScreen() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(getTodayDay());

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const querySnapshot = await getDocs(collection(db, 'schedules'));
        
        const data: Schedule[] = [];
        querySnapshot.forEach((doc) => {
          const docData = doc.data();
          data.push({
            id: doc.id,
            course_name: docData.course_name || null,
            course_code: docData.course_code || null,
            day: docData.day || null,
            start_time: docData.start_time || null,
            end_time: docData.end_time || null,
            venue: docData.venue || null,
            lecturer: docData.lecturer || null,
          });
        });

        console.log('schedules data:', JSON.stringify(data));
        console.log('schedules error:', JSON.stringify(null));

        if (cancelled) return;
        setSchedules(data);
      } catch (error) {
        console.log('schedules data:', JSON.stringify(null));
        console.log('schedules error:', JSON.stringify(error));
        if (!cancelled) setSchedules([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredSchedules = schedules.filter(schedule => schedule.day === DAY_MAP[selectedDay]);

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
          <Text className="text-xl font-bold text-slate-900">Schedule</Text>
        </View>
      </View>

      <View className="bg-white px-5 py-3 border-b border-gray-100">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-2">
          {DAYS.map((day) => (
            <Pressable
              key={day}
              onPress={() => setSelectedDay(day)}
              className={`rounded-full px-4 py-2 ${
                selectedDay === day
                  ? 'bg-primary'
                  : 'bg-gray-100'
              }`}
            >
              <Text className={`text-sm font-medium ${
                selectedDay === day
                  ? 'text-white'
                  : 'text-slate-600'
              }`}>
                {day}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="px-5 py-4">
          {loading ? (
            <View className="rounded-2xl bg-white p-6 shadow-sm">
              <Text className="text-center text-sm text-slate-500">Loading schedule...</Text>
            </View>
          ) : filteredSchedules.length === 0 ? (
            <View className="rounded-2xl bg-white p-6 shadow-sm">
              <View className="items-center">
                <View className="mb-3 h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                  <Ionicons name="calendar-outline" size={32} color="#9CA3AF" />
                </View>
                <Text className="text-base font-semibold text-slate-900">No classes today</Text>
                <Text className="mt-1 text-center text-sm text-slate-500">
                  {selectedDay === getTodayDay() 
                    ? "You don't have any classes scheduled for today."
                    : `No classes scheduled for ${selectedDay}.`
                  }
                </Text>
              </View>
            </View>
          ) : (
            <View className="gap-3">
              {filteredSchedules.map((schedule) => (
                <ScheduleCard
                  key={schedule.id}
                  schedule={schedule}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
