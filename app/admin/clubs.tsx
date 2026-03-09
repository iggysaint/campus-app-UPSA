import { useAuth, useUserRole } from '@/lib/auth-context';
import { sendNotificationToAll } from '@/lib/notifications';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../../lib/firebase';

type Club = {
  id: string;
  name: string;
  description: string;
  category: string;
  whatsapp_link: string;
  image_url: string;
  created_at: any;
};

export default function AdminClubs() {
  const router = useRouter();
  const { user } = useAuth();
  const role = useUserRole();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'academic',
    whatsapp_link: '',
    image_url: '',
  });

  const categories = [
    { label: 'Academic', value: 'academic' },
    { label: 'Sports', value: 'sports' },
    { label: 'Cultural', value: 'cultural' },
    { label: 'Professional', value: 'professional' },
    { label: 'Social', value: 'social' },
  ];

  const fetchClubs = useCallback(async () => {
    try {
      const q = query(collection(db, 'clubs'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      const data: Club[] = [];
      querySnapshot.forEach((doc) => {
        const docData = doc.data();
        data.push({
          id: doc.id,
          name: docData.name || '',
          description: docData.description || '',
          category: docData.category || 'academic',
          whatsapp_link: docData.whatsapp_link || '',
          image_url: docData.image_url || '',
          created_at: docData.created_at,
        });
      });
      setClubs(data);
    } catch {
      Alert.alert('Error', 'Failed to load clubs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role && role !== 'admin') {
      router.replace('/(tabs)');
      return;
    }
    fetchClubs();
  }, [role, fetchClubs]);

  const formatDate = (timestamp: any) => {
    if (!timestamp?.toDate) return '';
    try {
      return timestamp.toDate().toLocaleDateString();
    } catch {
      return '';
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', category: 'academic', whatsapp_link: '', image_url: '' });
    setEditingClub(null);
    setModalVisible(false);
  };

  const handleSave = async () => {
    if (saving) return;

    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a club name');
      return;
    }

    setSaving(true);
    try {
      if (editingClub) {
        await updateDoc(doc(db, 'clubs', editingClub.id), {
          name: formData.name.trim(),
          description: formData.description.trim(),
          category: formData.category,
          whatsapp_link: formData.whatsapp_link.trim(),
          image_url: formData.image_url.trim(),
        });

        setClubs(prev => prev.map(c =>
          c.id === editingClub.id
            ? { ...c, ...formData, name: formData.name.trim(), description: formData.description.trim() }
            : c
        ));

        Alert.alert('Success', 'Club updated successfully!');
      } else {
        const docRef = await addDoc(collection(db, 'clubs'), {
          name: formData.name.trim(),
          description: formData.description.trim(),
          category: formData.category,
          whatsapp_link: formData.whatsapp_link.trim(),
          image_url: formData.image_url.trim(),
          created_at: serverTimestamp(),
        });

        setClubs(prev => [{
          id: docRef.id,
          name: formData.name.trim(),
          description: formData.description.trim(),
          category: formData.category,
          whatsapp_link: formData.whatsapp_link.trim(),
          image_url: formData.image_url.trim(),
          created_at: null,
        }, ...prev]);

        try {
          await sendNotificationToAll(
            '🎉 New Club',
            `${formData.name} has been added!`,
            { type: 'club' }
          );
        } catch {}

        Alert.alert('Success', 'Club created successfully!');
      }

      resetForm();
    } catch {
      Alert.alert('Error', 'Failed to save club');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (club: Club) => {
    setEditingClub(club);
    setFormData({
      name: club.name,
      description: club.description,
      category: club.category,
      whatsapp_link: club.whatsapp_link,
      image_url: club.image_url,
    });
    setModalVisible(true);
  };

  const handleDelete = (club: Club) => {
    Alert.alert(
      'Delete Club',
      'Are you sure you want to delete this club?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'clubs', club.id));
              setClubs(prev => prev.filter(c => c.id !== club.id));
              Alert.alert('Success', 'Club deleted successfully!');
            } catch {
              Alert.alert('Error', 'Failed to delete club');
            }
          },
        },
      ]
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'academic': return 'school-outline';
      case 'sports': return 'football-outline';
      case 'cultural': return 'musical-notes-outline';
      case 'professional': return 'briefcase-outline';
      case 'social': return 'people-outline';
      default: return 'help-circle-outline';
    }
  };

  const getCategoryColors = (category: string) => {
    switch (category) {
      case 'academic': return { bg: '#DBEAFE', text: '#1D4ED8' };
      case 'sports': return { bg: '#DCFCE7', text: '#15803D' };
      case 'cultural': return { bg: '#F3E8FF', text: '#7E22CE' };
      case 'professional': return { bg: '#F3F4F6', text: '#374151' };
      case 'social': return { bg: '#FFEDD5', text: '#C2410C' };
      default: return { bg: '#F3F4F6', text: '#374151' };
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F2F4F6]">
        <Text className="text-slate-500">Loading clubs...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F2F4F6]">
      <View className="pt-12 pb-4 px-6">
        <View className="flex-row items-center justify-between mb-4">
          {/* FIX: router.back() */}
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="#0088CC" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-900">Manage Campus Clubs</Text>
          <View className="w-12" />
        </View>
      </View>

      {clubs.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="people-outline" size={48} color="#9CA3AF" />
          <Text className="mt-4 text-lg font-semibold text-slate-700">No clubs yet</Text>
          <Text className="mt-1 text-sm text-slate-500 text-center">
            Tap the + button to add the first club.
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-6">
          <View className="pb-24">
            {clubs.map((club) => {
              const colors = getCategoryColors(club.category);
              return (
                <View key={club.id} className="mb-4 bg-white rounded-xl overflow-hidden shadow-sm">
                  {!!club.image_url && (
                    <Image
                      source={{ uri: club.image_url }}
                      className="w-full h-40"
                      resizeMode="cover"
                    />
                  )}
                  <View className="p-4">
                    <View className="flex-row justify-between items-start mb-3">
                      <View className="flex-1">
                        <View className="flex-row items-center mb-2 gap-2">
                          <View className="w-10 h-10 items-center justify-center rounded-lg bg-blue-100">
                            <Ionicons name={getCategoryIcon(club.category)} size={18} color="#0088CC" />
                          </View>
                          <View className="px-2 py-1 rounded-full" style={{ backgroundColor: colors.bg }}>
                            <Text className="text-xs font-medium" style={{ color: colors.text }}>
                              {club.category.toUpperCase()}
                            </Text>
                          </View>
                          {formatDate(club.created_at) ? (
                            <Text className="text-xs text-slate-500">
                              • {formatDate(club.created_at)}
                            </Text>
                          ) : null}
                        </View>
                        <Text className="text-lg font-semibold text-slate-900 mb-1" numberOfLines={2}>
                          {club.name}
                        </Text>
                        <Text className="text-sm text-slate-600" numberOfLines={2}>
                          {club.description}
                        </Text>
                      </View>
                      <View className="flex-row gap-2 ml-2">
                        <TouchableOpacity
                          onPress={() => handleEdit(club)}
                          className="p-2 rounded-lg bg-blue-500"
                        >
                          <Ionicons name="create-outline" size={16} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDelete(club)}
                          className="p-2 rounded-lg bg-red-500"
                        >
                          <Ionicons name="trash-outline" size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        className="absolute bottom-8 right-6 w-14 h-14 bg-[#0088CC] rounded-full shadow-lg items-center justify-center"
      >
        <Ionicons name="add" size={28} color="#fff" />
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
                {editingClub ? 'Edit Club' : 'Create New Club'}
              </Text>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="mb-4">
                  <Text className="mb-2 text-sm font-medium text-slate-700">Club Name</Text>
                  <TextInput
                    className="w-full rounded-lg border border-gray-300 p-3 text-slate-900"
                    value={formData.name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, name: text.trimStart() }))}
                    placeholder="Enter club name"
                    maxLength={80}
                    editable={!saving}
                  />
                </View>

                <View className="mb-4">
                  <Text className="mb-2 text-sm font-medium text-slate-700">Description</Text>
                  <TextInput
                    className="w-full h-24 rounded-lg border border-gray-300 p-3 text-slate-900"
                    value={formData.description}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, description: text.trimStart() }))}
                    placeholder="Enter club description"
                    multiline
                    textAlignVertical="top"
                    maxLength={300}
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
                        disabled={saving}
                        className={`px-3 py-2 rounded-lg border ${
                          formData.category === cat.value
                            ? 'bg-[#0088CC] border-[#0088CC]'
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

                <View className="mb-4">
                  <Text className="mb-2 text-sm font-medium text-slate-700">WhatsApp Link (Optional)</Text>
                  <TextInput
                    className="w-full rounded-lg border border-gray-300 p-3 text-slate-900"
                    value={formData.whatsapp_link}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, whatsapp_link: text.trim() }))}
                    placeholder="Enter WhatsApp group link"
                    autoCapitalize="none"
                    editable={!saving}
                  />
                </View>

                <View className="mb-6">
                  <Text className="mb-2 text-sm font-medium text-slate-700">Image URL (Optional)</Text>
                  <TextInput
                    className="w-full rounded-lg border border-gray-300 p-3 text-slate-900"
                    value={formData.image_url}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, image_url: text.trim() }))}
                    placeholder="Enter image URL (optional)"
                    autoCapitalize="none"
                    editable={!saving}
                  />
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
                    className={`flex-1 rounded-lg p-3 ${saving ? 'bg-[#0088CC]/50' : 'bg-[#0088CC]'}`}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    <Text className="text-center font-medium text-white">
                      {saving ? 'Saving...' : editingClub ? 'Update' : 'Create'}
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