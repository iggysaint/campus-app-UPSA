import { db } from '@/lib/firebase';
import { sendNotificationToAll } from '@/lib/notifications';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Announcement = {
  id: string;
  title: string;
  body: string;
  category: string;
  target_audience: string;
  created_at: any;
  is_active: boolean;
};

const categories = [
  { label: 'General', value: 'general' },
  { label: 'Academic', value: 'academic' },
  { label: 'Urgent', value: 'urgent' },
  { label: 'Event', value: 'event' }
];

const audiences = [
  { label: 'All Users', value: 'all' },
  { label: 'Students Only', value: 'students' },
  { label: 'Staff Only', value: 'staff' }
];

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'urgent': return 'bg-red-100 text-red-700';
    case 'academic': return 'bg-blue-100 text-blue-700';
    case 'event': return 'bg-green-100 text-green-700';
    default: return 'bg-gray-100 text-gray-700';
  }
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

export default function AdminAnnouncements() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    category: 'general',
    target_audience: 'all'
  });

  // FIX: extracted as useCallback
  const fetchAnnouncements = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'announcements'));
      const data: Announcement[] = [];
      querySnapshot.forEach((docSnap) => {
        const d = docSnap.data();
        data.push({
          id: docSnap.id,
          title: d.title || '',
          body: d.body || '',
          category: d.category || 'general',
          target_audience: d.target_audience || 'all',
          created_at: d.created_at,
          is_active: d.is_active !== false,
        });
      });
      // FIX: sort fix
      setAnnouncements(
        data.sort((a, b) => (b.created_at?.toMillis?.() || 0) - (a.created_at?.toMillis?.() || 0))
      );
    } catch {
      Alert.alert('Error', 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const resetForm = () => {
    setFormData({ title: '', body: '', category: 'general', target_audience: 'all' });
    setEditingAnnouncement(null);
    setModalVisible(false);
  };

  const handleSave = async () => {
    // FIX: saving guard
    if (saving) return;

    if (!formData.title.trim() || !formData.body.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      if (editingAnnouncement) {
        await updateDoc(doc(db, 'announcements', editingAnnouncement.id), {
          title: formData.title.trim(),
          body: formData.body.trim(),
          category: formData.category,
          target_audience: formData.target_audience,
        });
        Alert.alert('Success', 'Announcement updated successfully!');
      } else {
        await addDoc(collection(db, 'announcements'), {
          title: formData.title.trim(),
          body: formData.body.trim(),
          category: formData.category,
          target_audience: formData.target_audience,
          created_at: serverTimestamp(),
          is_active: true,
        });

        try {
          await sendNotificationToAll(
            '📢 New Announcement',
            formData.title,
            { type: 'announcement' }
          );
        } catch {}

        Alert.alert('Success', 'Announcement created successfully!');
      }

      resetForm();
      await fetchAnnouncements();
    } catch {
      Alert.alert('Error', 'Failed to save announcement');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      body: announcement.body,
      category: announcement.category,
      target_audience: announcement.target_audience,
    });
    setModalVisible(true);
  };

  const handleDelete = (announcement: Announcement) => {
    Alert.alert(
      'Delete Announcement',
      'Are you sure you want to delete this announcement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'announcements', announcement.id));
              setAnnouncements(prev => prev.filter(a => a.id !== announcement.id));
              Alert.alert('Success', 'Announcement deleted successfully!');
            } catch {
              Alert.alert('Error', 'Failed to delete announcement');
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
        <Text className="text-slate-500 mt-2">Loading announcements...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F2F4F6]">
      <View className="pt-12 pb-4 px-6 flex-row items-center justify-between">
        {/* FIX: router.back() instead of router.push('/admin') */}
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="#0088CC" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900">Manage Announcements</Text>
        <View className="w-12" />
      </View>

      {announcements.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Ionicons name="megaphone-outline" size={48} color="#9CA3AF" />
          <Text className="text-slate-500 mt-4 font-medium">No announcements yet.</Text>
          <Text className="text-slate-400 text-sm">Tap + to create one.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} className="px-6 flex-1">
          {announcements.map((announcement) => (
            <View key={announcement.id} className="mb-4 bg-white rounded-xl p-4 shadow-sm">
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1 mr-2">
                  <Text className="text-base font-semibold text-slate-900 mb-1" numberOfLines={2}>
                    {announcement.title}
                  </Text>
                  <View className="flex-row items-center mb-2">
                    <Text className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(announcement.category)}`}>
                      {announcement.category.toUpperCase()}
                    </Text>
                    <Text className="text-xs text-slate-500 ml-2">
                      • {formatDate(announcement.created_at)}
                    </Text>
                  </View>
                  <Text className="text-sm text-slate-600" numberOfLines={3}>
                    {announcement.body}
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  <TouchableOpacity onPress={() => handleEdit(announcement)} className="p-2 rounded-lg bg-blue-500">
                    <Ionicons name="create-outline" size={16} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(announcement)} className="p-2 rounded-lg bg-red-500">
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
        onPress={() => setModalVisible(true)}
        className="absolute bottom-8 right-6 w-14 h-14 bg-[#0088CC] rounded-full shadow-lg items-center justify-center"
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={resetForm}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <View className="flex-1 items-center justify-center bg-black/50">
            <View className="mx-5 w-full max-w-lg rounded-2xl bg-white p-6">
              <Text className="mb-6 text-xl font-bold text-slate-900">
                {editingAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}
              </Text>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="mb-4">
                  <Text className="mb-2 text-sm font-medium text-slate-700">Title</Text>
                  <TextInput
                    className="w-full rounded-lg border border-gray-300 p-3 text-slate-900"
                    value={formData.title}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, title: text.trimStart() }))}
                    placeholder="Enter announcement title"
                    maxLength={120}
                    editable={!saving}
                  />
                </View>

                <View className="mb-4">
                  <Text className="mb-2 text-sm font-medium text-slate-700">Message</Text>
                  <TextInput
                    className="w-full h-32 rounded-lg border border-gray-300 p-3 text-slate-900"
                    value={formData.body}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, body: text.trimStart() }))}
                    placeholder="Enter announcement message"
                    multiline
                    textAlignVertical="top"
                    maxLength={500}
                    editable={!saving}
                  />
                </View>

                <View className="mb-4">
                  <Text className="mb-2 text-sm font-medium text-slate-700">Category</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat.value}
                        onPress={() => setFormData(prev => ({ ...prev, category: cat.value }))}
                        className={`px-3 py-2 rounded-lg border ${
                          formData.category === cat.value
                            ? 'bg-[#0088CC] border-[#0088CC]'
                            : 'bg-gray-100 border-gray-300'
                        }`}
                        disabled={saving}
                      >
                        <Text className={`text-sm font-medium ${
                          formData.category === cat.value ? 'text-white' : 'text-slate-700'
                        }`}>
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View className="mb-6">
                  <Text className="mb-2 text-sm font-medium text-slate-700">Target Audience</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {audiences.map((aud) => (
                      <TouchableOpacity
                        key={aud.value}
                        onPress={() => setFormData(prev => ({ ...prev, target_audience: aud.value }))}
                        className={`px-3 py-2 rounded-lg border ${
                          formData.target_audience === aud.value
                            ? 'bg-[#0088CC] border-[#0088CC]'
                            : 'bg-gray-100 border-gray-300'
                        }`}
                        disabled={saving}
                      >
                        <Text className={`text-sm font-medium ${
                          formData.target_audience === aud.value ? 'text-white' : 'text-slate-700'
                        }`}>
                          {aud.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className="flex-1 rounded-lg bg-gray-200 p-3"
                    onPress={resetForm}
                    disabled={saving}
                  >
                    <Text className="text-center font-medium text-slate-700">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`flex-1 rounded-lg bg-[#0088CC] p-3 ${saving ? 'opacity-60' : ''}`}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    <Text className="text-center font-medium text-white">
                      {saving ? 'Saving...' : editingAnnouncement ? 'Update' : 'Create'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}