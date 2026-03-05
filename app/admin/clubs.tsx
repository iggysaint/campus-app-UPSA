import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'academic',
    whatsapp_link: '',
    image_url: ''
  });

  const categories = [
    { label: 'Academic', value: 'academic' },
    { label: 'Sports', value: 'sports' },
    { label: 'Cultural', value: 'cultural' },
    { label: 'Professional', value: 'professional' },
    { label: 'Social', value: 'social' }
  ];

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'clubs'));
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
            created_at: docData.created_at
          });
        });
        setClubs(data.sort((a, b) => b.created_at?.toMillis() - a.created_at?.toMillis()).reverse());
      } catch (error) {
        console.error('Error fetching clubs:', error);
        Alert.alert('Error', 'Failed to load clubs');
      } finally {
        setLoading(false);
      }
    };

    fetchClubs();
  }, []);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a club name');
      return;
    }

    try {
      if (editingClub) {
        // Update existing club
        await updateDoc(doc(db, 'clubs', editingClub.id), {
          name: formData.name.trim(),
          description: formData.description.trim(),
          category: formData.category,
          whatsapp_link: formData.whatsapp_link.trim(),
          image_url: formData.image_url.trim()
        });
        Alert.alert('Success', 'Club updated successfully!');
      } else {
        // Create new club
        await addDoc(collection(db, 'clubs'), {
          name: formData.name.trim(),
          description: formData.description.trim(),
          category: formData.category,
          whatsapp_link: formData.whatsapp_link.trim(),
          image_url: formData.image_url.trim(),
          created_at: serverTimestamp()
        });
        Alert.alert('Success', 'Club created successfully!');
      }

      setModalVisible(false);
      setFormData({ name: '', description: '', category: 'academic', whatsapp_link: '', image_url: '' });
      setEditingClub(null);
      
      // Refresh the list
      const querySnapshot = await getDocs(collection(db, 'clubs'));
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
          created_at: docData.created_at
        });
      });
      setClubs(data.sort((a, b) => b.created_at?.toMillis() - a.created_at?.toMillis()).reverse());
    } catch (error) {
      console.error('Error saving club:', error);
      Alert.alert('Error', 'Failed to save club');
    }
  };

  const handleEdit = (club: Club) => {
    setEditingClub(club);
    setFormData({
      name: club.name,
      description: club.description,
      category: club.category,
      whatsapp_link: club.whatsapp_link,
      image_url: club.image_url
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
              setClubs(clubs.filter(c => c.id !== club.id));
              Alert.alert('Success', 'Club deleted successfully!');
            } catch (error) {
              console.error('Error deleting club:', error);
              Alert.alert('Error', 'Failed to delete club');
            }
          }
        }
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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'academic': return 'bg-blue-100 text-blue-700';
      case 'sports': return 'bg-green-100 text-green-700';
      case 'cultural': return 'bg-purple-100 text-purple-700';
      case 'professional': return 'bg-gray-100 text-gray-700';
      case 'social': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
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

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F2F4F6]">
        <Text className="text-slate-500">Loading clubs...</Text>
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
          <Text className="text-xl font-bold text-slate-900">Manage Campus Clubs</Text>
          <View className="w-12" />
        </View>

        {/* Content */}
        <ScrollView showsVerticalScrollIndicator={false} className="px-6">
          {clubs.map((club) => (
            <View key={club.id} className="mb-4 bg-white rounded-xl p-4 shadow-sm">
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1">
                  <View className="flex-row items-center mb-2">
                    <View className="w-12 h-12 items-center justify-center rounded-lg bg-blue-100">
                      <Ionicons name={getCategoryIcon(club.category)} size={20} color="#0088CC" />
                    </View>
                    <Text className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(club.category)}`}>
                      {club.category.toUpperCase()}
                    </Text>
                    <Text className="text-xs text-slate-500 ml-2">
                      • {formatDate(club.created_at)}
                    </Text>
                  </View>
                  <Text className="text-lg font-semibold text-slate-900 mb-1">
                    {club.name}
                  </Text>
                  <Text className="text-sm text-slate-600 line-clamp-2">
                    {club.description}
                  </Text>
                </View>
                <View className="flex-row gap-2">
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

      {/* Add/Edit Club Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setModalVisible(false);
          setEditingClub(null);
          setFormData({ name: '', description: '', category: 'academic', whatsapp_link: '', image_url: '' });
        }}
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
                {/* Name */}
                <View className="mb-4">
                  <Text className="mb-2 text-sm font-medium text-slate-700">Club Name</Text>
                  <TextInput
                    className="w-full rounded-lg border border-gray-300 p-3 text-slate-900"
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                    placeholder="Enter club name"
                  />
                </View>

                {/* Description */}
                <View className="mb-4">
                  <Text className="mb-2 text-sm font-medium text-slate-700">Description</Text>
                  <TextInput
                    className="w-full h-24 rounded-lg border border-gray-300 p-3 text-slate-900"
                    value={formData.description}
                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                    placeholder="Enter club description"
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

                {/* WhatsApp Link */}
                <View className="mb-4">
                  <Text className="mb-2 text-sm font-medium text-slate-700">WhatsApp Link (Optional)</Text>
                  <TextInput
                    className="w-full rounded-lg border border-gray-300 p-3 text-slate-900"
                    value={formData.whatsapp_link}
                    onChangeText={(text) => setFormData({ ...formData, whatsapp_link: text })}
                    placeholder="Enter WhatsApp group link"
                  />
                </View>

                {/* Image URL */}
                <View className="mb-6">
                  <Text className="mb-2 text-sm font-medium text-slate-700">Image URL (Optional)</Text>
                  <TextInput
                    className="w-full rounded-lg border border-gray-300 p-3 text-slate-900"
                    value={formData.image_url}
                    onChangeText={(text) => setFormData({ ...formData, image_url: text })}
                    placeholder="Enter image URL (optional)"
                  />
                </View>

                {/* Action Buttons */}
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className="flex-1 rounded-lg bg-gray-200 p-3"
                    onPress={() => {
                      setModalVisible(false);
                      setEditingClub(null);
                      setFormData({ name: '', description: '', category: 'academic', whatsapp_link: '', image_url: '' });
                    }}
                  >
                    <Text className="text-center font-medium text-slate-700">Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    className="flex-1 rounded-lg bg-primary p-3"
                    onPress={handleSave}
                  >
                    <Text className="text-center font-medium text-white">
                      {editingClub ? 'Update' : 'Create'}
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
