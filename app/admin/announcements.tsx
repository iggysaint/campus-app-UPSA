import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '@/lib/firebase';

type Announcement = {
  id: string;
  title: string;
  body: string;
  category: string;
  target_audience: string;
  created_at: any;
  is_active: boolean;
};

export default function AdminAnnouncements() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    category: 'general',
    target_audience: 'all'
  });

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

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'announcements'));
        const data: Announcement[] = [];
        querySnapshot.forEach((doc) => {
          const docData = doc.data();
          data.push({
            id: doc.id,
            title: docData.title || '',
            body: docData.body || '',
            category: docData.category || 'general',
            target_audience: docData.target_audience || 'all',
            created_at: docData.created_at,
            is_active: docData.is_active !== false
          });
        });
        setAnnouncements(data.sort((a, b) => b.created_at?.toMillis() - a.created_at?.toMillis()).reverse());
      } catch (error) {
        console.error('Error fetching announcements:', error);
        Alert.alert('Error', 'Failed to load announcements');
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.body.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      if (editingAnnouncement) {
        // Update existing announcement
        await updateDoc(doc(db, 'announcements', editingAnnouncement.id), {
          title: formData.title.trim(),
          body: formData.body.trim(),
          category: formData.category,
          target_audience: formData.target_audience
        });
        Alert.alert('Success', 'Announcement updated successfully!');
      } else {
        // Create new announcement
        await addDoc(collection(db, 'announcements'), {
          title: formData.title.trim(),
          body: formData.body.trim(),
          category: formData.category,
          target_audience: formData.target_audience,
          created_at: serverTimestamp(),
          is_active: true
        });
        Alert.alert('Success', 'Announcement created successfully!');
      }

      setModalVisible(false);
      setFormData({ title: '', body: '', category: 'general', target_audience: 'all' });
      setEditingAnnouncement(null);
      
      // Refresh the list
      const querySnapshot = await getDocs(collection(db, 'announcements'));
      const data: Announcement[] = [];
      querySnapshot.forEach((doc) => {
        const docData = doc.data();
        data.push({
          id: doc.id,
          title: docData.title || '',
          body: docData.body || '',
          category: docData.category || 'general',
          target_audience: docData.target_audience || 'all',
          created_at: docData.created_at,
          is_active: docData.is_active !== false
        });
      });
      setAnnouncements(data.sort((a, b) => b.created_at?.toMillis() - a.created_at?.toMillis()).reverse());
    } catch (error) {
      console.error('Error saving announcement:', error);
      Alert.alert('Error', 'Failed to save announcement');
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      body: announcement.body,
      category: announcement.category,
      target_audience: announcement.target_audience
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
              setAnnouncements(announcements.filter(a => a.id !== announcement.id));
              Alert.alert('Success', 'Announcement deleted successfully!');
            } catch (error) {
              console.error('Error deleting announcement:', error);
              Alert.alert('Error', 'Failed to delete announcement');
            }
          }
        }
      ]
    );
  };

  const handleBack = () => {
    router.push('/admin');
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'urgent': return 'bg-red-100 text-red-700';
      case 'academic': return 'bg-blue-100 text-blue-700';
      case 'event': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F2F4F6]">
        <Text className="text-slate-500">Loading announcements...</Text>
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
          <Text className="text-xl font-bold text-slate-900">Manage Announcements</Text>
          <View className="w-12" />
        </View>

        {/* Content */}
        <ScrollView showsVerticalScrollIndicator={false} className="px-6">
          {announcements.map((announcement) => (
            <View key={announcement.id} className="mb-4 bg-white rounded-xl p-4 shadow-sm">
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-slate-900 mb-1">
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
                  <Text className="text-sm text-slate-600 line-clamp-3">
                    {announcement.body}
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => handleEdit(announcement)}
                    className="p-2 rounded-lg bg-blue-500"
                  >
                    <Ionicons name="create-outline" size={16} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(announcement)}
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

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setModalVisible(false);
          setEditingAnnouncement(null);
          setFormData({ title: '', body: '', category: 'general', target_audience: 'all' });
        }}
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
                {/* Title */}
                <View className="mb-4">
                  <Text className="mb-2 text-sm font-medium text-slate-700">Title</Text>
                  <TextInput
                    className="w-full rounded-lg border border-gray-300 p-3 text-slate-900"
                    value={formData.title}
                    onChangeText={(text) => setFormData({ ...formData, title: text })}
                    placeholder="Enter announcement title"
                  />
                </View>

                {/* Body */}
                <View className="mb-4">
                  <Text className="mb-2 text-sm font-medium text-slate-700">Message</Text>
                  <TextInput
                    className="w-full h-32 rounded-lg border border-gray-300 p-3 text-slate-900"
                    value={formData.body}
                    onChangeText={(text) => setFormData({ ...formData, body: text })}
                    placeholder="Enter announcement message"
                    multiline
                    textAlignVertical="top"
                  />
                </View>

                {/* Category */}
                <View className="mb-4">
                  <Text className="mb-2 text-sm font-medium text-slate-700">Category</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat.value}
                        onPress={() => setFormData({ ...formData, category: cat.value })}
                        className={`px-3 py-2 rounded-lg border ${
                          formData.category === cat.value
                            ? 'bg-primary border-primary'
                            : 'bg-gray-100 border-gray-300'
                        }`}
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

                {/* Target Audience */}
                <View className="mb-6">
                  <Text className="mb-2 text-sm font-medium text-slate-700">Target Audience</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {audiences.map((aud) => (
                      <TouchableOpacity
                        key={aud.value}
                        onPress={() => setFormData({ ...formData, target_audience: aud.value })}
                        className={`px-3 py-2 rounded-lg border ${
                          formData.target_audience === aud.value
                            ? 'bg-primary border-primary'
                            : 'bg-gray-100 border-gray-300'
                        }`}
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

                {/* Action Buttons */}
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className="flex-1 rounded-lg bg-gray-200 p-3"
                    onPress={() => {
                      setModalVisible(false);
                      setEditingAnnouncement(null);
                      setFormData({ title: '', body: '', category: 'general', target_audience: 'all' });
                    }}
                  >
                    <Text className="text-center font-medium text-slate-700">Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    className="flex-1 rounded-lg bg-primary p-3"
                    onPress={handleSave}
                  >
                    <Text className="text-center font-medium text-white">
                      {editingAnnouncement ? 'Update' : 'Create'}
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
