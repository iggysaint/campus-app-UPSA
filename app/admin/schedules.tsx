import { db } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Schedule = {
  id: string;
  course_name: string;
  course_code: string;
  day: string;
  start_time: string;
  end_time: string;
  venue: string;
  lecturer: string;
  created_at: any;
};

export default function AdminSchedules() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [formData, setFormData] = useState({
    course_name: '',
    course_code: '',
    day: 'Monday',
    start_time: '09:00',
    end_time: '10:00',
    venue: '',
    lecturer: ''
  });

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'schedules'));
        const data: Schedule[] = [];
        querySnapshot.forEach((doc) => {
          const docData = doc.data();
          data.push({
            id: doc.id,
            course_name: docData.course_name || '',
            course_code: docData.course_code || '',
            day: docData.day || '',
            start_time: docData.start_time || '',
            end_time: docData.end_time || '',
            venue: docData.venue || '',
            lecturer: docData.lecturer || '',
            created_at: docData.created_at
          });
        });
        setSchedules(data.sort((a, b) => b.created_at?.toMillis() - a.created_at?.toMillis()).reverse());
      } catch (error) {
        console.error('Error fetching schedules:', error);
        Alert.alert('Error', 'Failed to load schedules');
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, []);

  const handleSave = async () => {
    if (!formData.course_name.trim() || !formData.course_code.trim() || !formData.venue.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      if (editingSchedule) {
        // Update existing schedule
        await updateDoc(doc(db, 'schedules', editingSchedule.id), {
          course_name: formData.course_name.trim(),
          course_code: formData.course_code.trim(),
          day: formData.day,
          start_time: formData.start_time,
          end_time: formData.end_time,
          venue: formData.venue.trim(),
          lecturer: formData.lecturer.trim()
        });
        Alert.alert('Success', 'Schedule updated successfully!');
      } else {
        // Create new schedule
        await addDoc(collection(db, 'schedules'), {
          course_name: formData.course_name.trim(),
          course_code: formData.course_code.trim(),
          day: formData.day,
          start_time: formData.start_time,
          end_time: formData.end_time,
          venue: formData.venue.trim(),
          lecturer: formData.lecturer.trim(),
          created_at: serverTimestamp()
        });
        Alert.alert('Success', 'Schedule created successfully!');
      }

      setModalVisible(false);
      setFormData({
        course_name: '',
        course_code: '',
        day: 'Monday',
        start_time: '09:00',
        end_time: '10:00',
        venue: '',
        lecturer: ''
      });
      setEditingSchedule(null);
      
      // Refresh the list
      const querySnapshot = await getDocs(collection(db, 'schedules'));
      const data: Schedule[] = [];
      querySnapshot.forEach((doc) => {
        const docData = doc.data();
        data.push({
          id: doc.id,
          course_name: docData.course_name || '',
          course_code: docData.course_code || '',
          day: docData.day || '',
          start_time: docData.start_time || '',
          end_time: docData.end_time || '',
          venue: docData.venue || '',
          lecturer: docData.lecturer || '',
          created_at: docData.created_at
        });
      });
      setSchedules(data.sort((a, b) => b.created_at?.toMillis() - a.created_at?.toMillis()).reverse());
    } catch (error) {
      console.error('Error saving schedule:', error);
      Alert.alert('Error', 'Failed to save schedule');
    }
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      course_name: schedule.course_name,
      course_code: schedule.course_code,
      day: schedule.day,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      venue: schedule.venue,
      lecturer: schedule.lecturer
    });
    setModalVisible(true);
  };

  const handleDelete = (schedule: Schedule) => {
    Alert.alert(
      'Delete Schedule',
      'Are you sure you want to delete this schedule?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'schedules', schedule.id));
              setSchedules(schedules.filter(s => s.id !== schedule.id));
              Alert.alert('Success', 'Schedule deleted successfully!');
            } catch (error) {
              console.error('Error deleting schedule:', error);
              Alert.alert('Error', 'Failed to delete schedule');
            }
          }
        }
      ]
    );
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString();
  };

  const handleBack = () => {
    router.push('/admin');
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F2F4F6]">
        <Text className="text-slate-500">Loading schedules...</Text>
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
          <Text className="text-xl font-bold text-slate-900">Manage Class Schedules</Text>
          <View className="w-12" />
        </View>

        {/* Content */}
        <ScrollView showsVerticalScrollIndicator={false} className="px-6">
          {schedules.map((schedule) => (
            <View key={schedule.id} className="mb-4 bg-white rounded-xl p-4 shadow-sm">
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1">
                  <View className="flex-row items-center mb-2">
                    <View className="w-12 h-12 items-center justify-center rounded-lg bg-blue-100">
                      <Ionicons name="calendar-outline" size={20} color="#0088CC" />
                    </View>
                    <Text className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                      {schedule.day.toUpperCase()}
                    </Text>
                    <Text className="text-xs text-slate-500 ml-2">
                      • {formatDate(schedule.created_at)}
                    </Text>
                  </View>
                  <Text className="text-lg font-semibold text-slate-900 mb-1">
                    {schedule.course_name}
                  </Text>
                  <Text className="text-sm text-slate-600 mb-2">
                    {schedule.course_code} • {schedule.start_time} - {schedule.end_time}
                  </Text>
                  <Text className="text-sm text-slate-600 mb-2">
                    <Ionicons name="location-outline" size={14} color="#666" className="mr-1" />
                    {schedule.venue}
                  </Text>
                  <Text className="text-sm text-slate-600 mb-2">
                    <Ionicons name="person-outline" size={14} color="#666" className="mr-1" />
                    {schedule.lecturer}
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => handleEdit(schedule)}
                    className="p-2 rounded-lg bg-blue-500"
                  >
                    <Ionicons name="create-outline" size={16} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(schedule)}
                    className="p-2 rounded-lg bg-red-500"
                  >
                    <Ionicons name="trash-outline" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Floating Action Button */}
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          className="absolute bottom-8 right-6 w-14 h-14 bg-primary rounded-full shadow-lg items-center justify-center"
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Add/Edit Schedule Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setModalVisible(false);
          setEditingSchedule(null);
          setFormData({
            course_name: '',
            course_code: '',
            day: 'Monday',
            start_time: '09:00',
            end_time: '10:00',
            venue: '',
            lecturer: ''
          });
        }}
      >
        <View className="flex-1 items-center justify-center bg-black/50">
          <View className="mx-5 w-full max-w-lg rounded-2xl bg-white p-6">
            <Text className="mb-6 text-xl font-bold text-slate-900">
              {editingSchedule ? 'Edit Schedule' : 'Create New Schedule'}
            </Text>

            {/* Course Name */}
            <View className="mb-4">
              <Text className="mb-2 text-sm font-medium text-slate-700">Course Name</Text>
              <TextInput
                className="w-full rounded-lg border border-gray-300 p-3 text-slate-900"
                value={formData.course_name}
                onChangeText={(text) => setFormData({ ...formData, course_name: text })}
                placeholder="Enter course name"
              />
            </View>

            {/* Course Code */}
            <View className="mb-4">
              <Text className="mb-2 text-sm font-medium text-slate-700">Course Code</Text>
              <TextInput
                className="w-full rounded-lg border border-gray-300 p-3 text-slate-900"
                value={formData.course_code}
                onChangeText={(text) => setFormData({ ...formData, course_code: text })}
                placeholder="Enter course code"
              />
            </View>

            {/* Day */}
            <View className="mb-4">
              <Text className="mb-2 text-sm font-medium text-slate-700">Day</Text>
              <View className="flex-row flex-wrap gap-2">
                {days.map((day) => (
                  <TouchableOpacity
                    key={day}
                    onPress={() => setFormData({ ...formData, day })}
                    className={`px-3 py-2 rounded-lg border ${
                      formData.day === day
                        ? 'bg-primary border-primary'
                        : 'bg-gray-100 border-gray-300'
                    }`}
                  >
                    <Text className={`text-sm font-medium ${
                      formData.day === day ? 'text-white' : 'text-slate-700'
                    }`}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Time */}
            <View className="mb-4">
              <Text className="mb-2 text-sm font-medium text-slate-700">Time</Text>
              <View className="flex-row gap-2">
                <TextInput
                  className="flex-1 rounded-lg border border-gray-300 p-3 text-slate-900"
                  value={formData.start_time}
                  onChangeText={(text) => setFormData({ ...formData, start_time: text })}
                  placeholder="Start time (e.g., 09:00)"
                />
                <TextInput
                  className="flex-1 rounded-lg border border-gray-300 p-3 text-slate-900"
                  value={formData.end_time}
                  onChangeText={(text) => setFormData({ ...formData, end_time: text })}
                  placeholder="End time (e.g., 10:00)"
                />
              </View>
            </View>

            {/* Venue */}
            <View className="mb-4">
              <Text className="mb-2 text-sm font-medium text-slate-700">Venue</Text>
              <TextInput
                className="w-full rounded-lg border border-gray-300 p-3 text-slate-900"
                value={formData.venue}
                onChangeText={(text) => setFormData({ ...formData, venue: text })}
                placeholder="Enter venue"
              />
            </View>

            {/* Lecturer */}
            <View className="mb-6">
              <Text className="mb-2 text-sm font-medium text-slate-700">Lecturer</Text>
              <TextInput
                className="w-full rounded-lg border border-gray-300 p-3 text-slate-900"
                value={formData.lecturer}
                onChangeText={(text) => setFormData({ ...formData, lecturer: text })}
                placeholder="Enter lecturer name"
              />
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 rounded-lg bg-gray-200 p-3"
                onPress={() => {
                  setModalVisible(false);
                  setEditingSchedule(null);
                  setFormData({
                    course_name: '',
                    course_code: '',
                    day: 'Monday',
                    start_time: '09:00',
                    end_time: '10:00',
                    venue: '',
                    lecturer: ''
                  });
                }}
              >
                <Text className="text-center font-medium text-slate-700">Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                className="flex-1 rounded-lg bg-primary p-3"
                onPress={handleSave}
              >
                <Text className="text-center font-medium text-white">
                  {editingSchedule ? 'Update' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
