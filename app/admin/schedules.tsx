import { useUserRole } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Schedule = {
  id: string;
  course_name: string;
  course_code: string;
  day: string;
  start_time: string;
  end_time: string;
  venue: string;
  lecturer: string;
  level: string;
  programme: string;
  study_mode: string;
  created_at: any;
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const LEVELS = ['Level 100', 'Level 200', 'Level 300', 'Level 400', 'Postgraduate', 'Professional'];
const STUDY_MODES = ['Full-time', 'Evening', 'Weekend', 'Distance'];

const formatDate = (timestamp: any) => {
  if (!timestamp?.toDate) return '';
  try {
    return timestamp.toDate().toLocaleDateString();
  } catch {
    return '';
  }
};

export default function AdminSchedules() {
  const router = useRouter();
  const role = useUserRole();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [formData, setFormData] = useState({
    course_name: '',
    course_code: '',
    day: 'Monday',
    start_time: '09:00',
    end_time: '10:00',
    venue: '',
    lecturer: '',
    level: 'Level 100',
    programme: '',
    study_mode: 'Full-time',
  });

  useEffect(() => {
    if (role && role !== 'admin') {
      router.replace('/(tabs)');
    }
  }, [role]);

  const fetchSchedules = useCallback(async () => {
    setError(false);
    try {
      const q = query(collection(db, 'schedules'));
      const querySnapshot = await getDocs(q);
      const data: Schedule[] = [];
      querySnapshot.forEach((docSnap) => {
        const d = docSnap.data();
        data.push({
          id: docSnap.id,
          course_name: d.course_name || '',
          course_code: d.course_code || '',
          day: d.day || '',
          start_time: d.start_time || '',
          end_time: d.end_time || '',
          venue: d.venue || '',
          lecturer: d.lecturer || '',
          level: d.level || '',
          programme: d.programme || '',
          study_mode: d.study_mode || '',
          created_at: d.created_at,
        });
      });
      setSchedules(data.sort((a, b) => (b.created_at?.toMillis?.() || 0) - (a.created_at?.toMillis?.() || 0)));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const resetForm = () => {
    setFormData({
      course_name: '',
      course_code: '',
      day: 'Monday',
      start_time: '09:00',
      end_time: '10:00',
      venue: '',
      lecturer: '',
      level: 'Level 100',
      programme: '',
      study_mode: 'Full-time',
    });
    setEditingSchedule(null);
    setModalVisible(false);
  };

  const handleSave = async () => {
    if (saving) return;

    if (!formData.course_name.trim() || !formData.course_code.trim() || !formData.venue.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (formData.start_time >= formData.end_time) {
      Alert.alert('Invalid Time', 'End time must be after start time');
      return;
    }

    const exists = schedules.some(
      s =>
        s.course_code === formData.course_code &&
        s.day === formData.day &&
        s.start_time === formData.start_time &&
        s.id !== editingSchedule?.id
    );
    if (exists) {
      Alert.alert('Duplicate Schedule', 'This course schedule already exists.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        course_name: formData.course_name.trim(),
        course_code: formData.course_code.trim(),
        day: formData.day,
        start_time: formData.start_time,
        end_time: formData.end_time,
        venue: formData.venue.trim(),
        lecturer: formData.lecturer.trim(),
        level: formData.level,
        programme: formData.programme.trim(),
        study_mode: formData.study_mode,
      };

      if (editingSchedule) {
        await updateDoc(doc(db, 'schedules', editingSchedule.id), payload);
        Alert.alert('Success', 'Schedule updated successfully!');
      } else {
        await addDoc(collection(db, 'schedules'), {
          ...payload,
          created_at: serverTimestamp(),
        });
        Alert.alert('Success', 'Schedule created successfully!');
      }

      resetForm();
      await fetchSchedules();
    } catch {
      Alert.alert('Error', 'Failed to save schedule');
    } finally {
      setSaving(false);
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
      lecturer: schedule.lecturer,
      level: schedule.level || 'Level 100',
      programme: schedule.programme || '',
      study_mode: schedule.study_mode || 'Full-time',
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
          text: 'Delete Schedule',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'schedules', schedule.id));
              setSchedules(prev => prev.filter(s => s.id !== schedule.id));
              Alert.alert('Success', 'Schedule deleted successfully!');
            } catch {
              Alert.alert('Error', 'Failed to delete schedule');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F2F4F6]">
        <ActivityIndicator color="#0088CC" />
        <Text className="text-slate-500 mt-2">Loading schedules...</Text>
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
        <Text className="text-xl font-bold text-slate-900">Manage Schedules</Text>
        <View className="w-10" />
      </View>

      {error ? (
        <View className="flex-1 items-center justify-center">
          <Ionicons name="cloud-offline-outline" size={48} color="#9CA3AF" />
          <Text className="text-slate-500 mt-4 text-center">
            Unable to load schedules.{'\n'}Check your connection.
          </Text>
          <TouchableOpacity
            onPress={fetchSchedules}
            className="mt-4 px-6 py-2 bg-[#0088CC] rounded-lg"
          >
            <Text className="text-white font-medium">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : schedules.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
          <Text className="text-slate-500 mt-4 font-medium">No schedules yet.</Text>
          <Text className="text-slate-400 text-sm">Tap + to create one.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} className="px-6 flex-1">
          {schedules.map((schedule) => (
            <View key={schedule.id} className="mb-4 bg-white rounded-xl p-4 shadow-sm">
              <View className="flex-row justify-between items-start">
                <View className="flex-1 mr-2">
                  <View className="flex-row items-center gap-2 mb-2 flex-wrap">
                    <View className="px-2 py-1 rounded-full bg-blue-100">
                      <Text className="text-xs text-blue-700 font-medium">{schedule.day.toUpperCase()}</Text>
                    </View>
                    {schedule.level ? (
                      <View className="px-2 py-1 rounded-full bg-blue-50">
                        <Text className="text-xs text-blue-600">{schedule.level}</Text>
                      </View>
                    ) : null}
                    <Text className="text-xs text-slate-400">{formatDate(schedule.created_at)}</Text>
                  </View>
                  <Text className="text-base font-semibold text-slate-900 mb-1" numberOfLines={2}>
                    {schedule.course_name}
                  </Text>
                  <Text className="text-sm text-slate-600 mb-1">
                    {schedule.course_code.toUpperCase()} · {schedule.start_time} - {schedule.end_time}
                  </Text>
                  <Text className="text-sm text-slate-500 mb-1" numberOfLines={1}>
                    📍 {schedule.venue || 'TBA'}
                  </Text>
                  <Text className="text-sm text-slate-500" numberOfLines={1}>
                    👤 {schedule.lecturer || 'TBA'}
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  <TouchableOpacity onPress={() => handleEdit(schedule)} className="p-2 rounded-lg bg-blue-500">
                    <Ionicons name="create-outline" size={16} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(schedule)} className="p-2 rounded-lg bg-red-500">
                    <Ionicons name="trash-outline" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
          <View className="h-24" />
        </ScrollView>
      )}

      <TouchableOpacity
        onPress={() => !loading && setModalVisible(true)}
        className={`absolute bottom-8 right-6 w-14 h-14 bg-[#0088CC] rounded-full shadow-lg items-center justify-center ${loading ? 'opacity-50' : ''}`}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={resetForm}
      >
        <View className="flex-1 bg-[#F2F4F6]">
          <View className="flex-row items-center justify-between px-6 pt-14 pb-4">
            <Text className="text-xl font-bold text-slate-900">
              {editingSchedule ? 'Edit Schedule' : 'Create Schedule'}
            </Text>
            <TouchableOpacity onPress={resetForm}>
              <Ionicons name="close" size={24} color="#888" />
            </TouchableOpacity>
          </View>

          <ScrollView className="px-6 flex-1">
            <Text className="text-sm font-medium text-slate-700 mb-1 mt-3">Course Name *</Text>
            <TextInput
              className="bg-white rounded-xl px-4 py-3 text-slate-900 mb-3"
              value={formData.course_name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, course_name: text.trimStart() }))}
              placeholder="Enter course name"
              maxLength={120}
              editable={!saving}
            />

            <Text className="text-sm font-medium text-slate-700 mb-1">Course Code *</Text>
            <TextInput
              className="bg-white rounded-xl px-4 py-3 text-slate-900 mb-3"
              value={formData.course_code}
              onChangeText={(text) => setFormData(prev => ({ ...prev, course_code: text.toUpperCase() }))}
              placeholder="e.g. ICT 401"
              maxLength={20}
              editable={!saving}
            />

            <Text className="text-sm font-medium text-slate-700 mb-1">Programme</Text>
            <TextInput
              className="bg-white rounded-xl px-4 py-3 text-slate-900 mb-3"
              value={formData.programme}
              onChangeText={(text) => setFormData(prev => ({ ...prev, programme: text.trimStart() }))}
              placeholder="e.g. BSc IT"
              maxLength={80}
              editable={!saving}
            />

            <Text className="text-sm font-medium text-slate-700 mb-2">Day</Text>
            <View className="flex-row flex-wrap gap-2 mb-3">
              {DAYS.map((day) => (
                <TouchableOpacity
                  key={day}
                  onPress={() => setFormData(prev => ({ ...prev, day }))}
                  className={`px-3 py-2 rounded-xl border ${
                    formData.day === day ? 'bg-[#0088CC] border-[#0088CC]' : 'bg-white border-gray-300'
                  }`}
                  disabled={saving}
                >
                  <Text className={`text-sm font-medium ${formData.day === day ? 'text-white' : 'text-slate-700'}`}>
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-sm font-medium text-slate-700 mb-2">Level</Text>
            <View className="flex-row flex-wrap gap-2 mb-3">
              {LEVELS.map((level) => (
                <TouchableOpacity
                  key={level}
                  onPress={() => setFormData(prev => ({ ...prev, level }))}
                  className={`px-3 py-2 rounded-xl border ${
                    formData.level === level ? 'bg-[#0088CC] border-[#0088CC]' : 'bg-white border-gray-300'
                  }`}
                  disabled={saving}
                >
                  <Text className={`text-sm font-medium ${formData.level === level ? 'text-white' : 'text-slate-700'}`}>
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-sm font-medium text-slate-700 mb-2">Study Mode</Text>
            <View className="flex-row flex-wrap gap-2 mb-3">
              {STUDY_MODES.map((mode) => (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setFormData(prev => ({ ...prev, study_mode: mode }))}
                  className={`px-3 py-2 rounded-xl border ${
                    formData.study_mode === mode ? 'bg-[#0088CC] border-[#0088CC]' : 'bg-white border-gray-300'
                  }`}
                  disabled={saving}
                >
                  <Text className={`text-sm font-medium ${formData.study_mode === mode ? 'text-white' : 'text-slate-700'}`}>
                    {mode}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-sm font-medium text-slate-700 mb-1">Start Time</Text>
            <TextInput
              className="bg-white rounded-xl px-4 py-3 text-slate-900 mb-3"
              value={formData.start_time}
              onChangeText={(text) => setFormData(prev => ({ ...prev, start_time: text }))}
              placeholder="e.g. 09:00"
              maxLength={10}
              editable={!saving}
            />

            <Text className="text-sm font-medium text-slate-700 mb-1">End Time</Text>
            <TextInput
              className="bg-white rounded-xl px-4 py-3 text-slate-900 mb-3"
              value={formData.end_time}
              onChangeText={(text) => setFormData(prev => ({ ...prev, end_time: text }))}
              placeholder="e.g. 10:00"
              maxLength={10}
              editable={!saving}
            />

            <Text className="text-sm font-medium text-slate-700 mb-1">Venue *</Text>
            <TextInput
              className="bg-white rounded-xl px-4 py-3 text-slate-900 mb-3"
              value={formData.venue}
              onChangeText={(text) => setFormData(prev => ({ ...prev, venue: text.trimStart() }))}
              placeholder="Enter venue"
              maxLength={80}
              editable={!saving}
            />

            <Text className="text-sm font-medium text-slate-700 mb-1">Lecturer</Text>
            <TextInput
              className="bg-white rounded-xl px-4 py-3 text-slate-900 mb-6"
              value={formData.lecturer}
              onChangeText={(text) => setFormData(prev => ({ ...prev, lecturer: text.trimStart() }))}
              placeholder="Enter lecturer name"
              maxLength={80}
              editable={!saving}
            />
          </ScrollView>

          <View className="flex-row px-6 pb-10 gap-3 pt-4">
            <TouchableOpacity
              className="flex-1 bg-gray-200 rounded-xl py-3 items-center"
              onPress={resetForm}
              disabled={saving}
            >
              <Text className="font-semibold text-slate-700">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 bg-[#0088CC] rounded-xl py-3 items-center ${saving ? 'opacity-60' : ''}`}
              onPress={handleSave}
              disabled={saving}
            >
              <Text className="font-semibold text-white">
                {saving ? 'Saving...' : editingSchedule ? 'Update' : 'Create'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}