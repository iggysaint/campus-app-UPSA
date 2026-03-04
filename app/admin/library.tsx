import { db } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

type LibraryFile = {
  id: string;
  title: string;
  description: string;
  category: string;
  file_url: string;
  created_at: any;
};

export default function AdminLibrary() {
  const router = useRouter();
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingFile, setEditingFile] = useState<LibraryFile | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'PDF',
    file_url: ''
  });

  const categories = [
    { label: 'PDF', value: 'PDF' },
    { label: 'Video', value: 'Video' },
    { label: 'Past Paper', value: 'Past Paper' },
    { label: 'Template', value: 'Template' },
    { label: 'Letter', value: 'Letter' },
    { label: 'Project', value: 'Project' }
  ];

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'library'));
        const data: LibraryFile[] = [];
        querySnapshot.forEach((doc) => {
          const docData = doc.data();
          data.push({
            id: doc.id,
            title: docData.title || '',
            description: docData.description || '',
            category: docData.category || 'PDF',
            file_url: docData.file_url || '',
            created_at: docData.created_at
          });
        });
        setFiles(data.sort((a, b) => b.created_at?.toMillis() - a.created_at?.toMillis()).reverse());
      } catch (error) {
        console.error('Error fetching files:', error);
        Alert.alert('Error', 'Failed to load files');
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, []);

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      if (editingFile) {
        // Update existing file
        await updateDoc(doc(db, 'library', editingFile.id), {
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: formData.category,
          file_url: formData.file_url
        });
        Alert.alert('Success', 'File updated successfully!');
      } else {
        // Create new file
        await addDoc(collection(db, 'library'), {
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: formData.category,
          file_url: formData.file_url,
          created_at: serverTimestamp()
        });
        Alert.alert('Success', 'File uploaded successfully!');
      }

      setModalVisible(false);
      setFormData({ title: '', description: '', category: 'PDF', file_url: '' });
      setEditingFile(null);
      
      // Refresh the list
      const querySnapshot = await getDocs(collection(db, 'library'));
      const data: LibraryFile[] = [];
      querySnapshot.forEach((doc) => {
        const docData = doc.data();
        data.push({
          id: doc.id,
          title: docData.title || '',
          description: docData.description || '',
          category: docData.category || 'PDF',
          file_url: docData.file_url || '',
          created_at: docData.created_at
        });
      });
      setFiles(data.sort((a, b) => b.created_at?.toMillis() - a.created_at?.toMillis()).reverse());
    } catch (error) {
      console.error('Error saving file:', error);
      Alert.alert('Error', 'Failed to save file');
    }
  };

  const handleEdit = (file: LibraryFile) => {
    setEditingFile(file);
    setFormData({
      title: file.title,
      description: file.description,
      category: file.category,
      file_url: file.file_url
    });
    setModalVisible(true);
  };

  const handleDelete = (file: LibraryFile) => {
    Alert.alert(
      'Delete File',
      'Are you sure you want to delete this file?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'library', file.id));
              setFiles(files.filter(f => f.id !== file.id));
              Alert.alert('Success', 'File deleted successfully!');
            } catch (error) {
              console.error('Error deleting file:', error);
              Alert.alert('Error', 'Failed to delete file');
            }
          }
        }
      ]
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'PDF': return 'document-text-outline';
      case 'Video': return 'videocam-outline';
      case 'Past Paper': return 'school-outline';
      case 'Template': return 'clipboard-outline';
      case 'Letter': return 'mail-outline';
      case 'Project': return 'folder-outline';
      default: return 'document-outline';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'PDF': return 'bg-red-100 text-red-700';
      case 'Video': return 'bg-purple-100 text-purple-700';
      case 'Past Paper': return 'bg-blue-100 text-blue-700';
      case 'Template': return 'bg-green-100 text-green-700';
      case 'Letter': return 'bg-yellow-100 text-yellow-700';
      case 'Project': return 'bg-indigo-100 text-indigo-700';
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
        <Text className="text-slate-500">Loading files...</Text>
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
          <Text className="text-xl font-bold text-slate-900">Manage Library</Text>
          <View className="w-12" />
        </View>

        {/* Content */}
        <ScrollView showsVerticalScrollIndicator={false} className="px-6">
          {files.map((file) => (
            <View key={file.id} className="mb-4 bg-white rounded-xl p-4 shadow-sm">
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1">
                  <View className="flex-row items-center mb-2">
                    <View className="w-12 h-12 items-center justify-center rounded-lg bg-blue-100">
                      <Ionicons name={getCategoryIcon(file.category)} size={20} color="#0088CC" />
                    </View>
                    <Text className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(file.category)}`}>
                      {file.category.toUpperCase()}
                    </Text>
                    <Text className="text-xs text-slate-500 ml-2">
                      • {formatDate(file.created_at)}
                    </Text>
                  </View>
                  <Text className="text-lg font-semibold text-slate-900 mb-1">
                    {file.title}
                  </Text>
                  <Text className="text-sm text-slate-600 line-clamp-2">
                    {file.description}
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => handleEdit(file)}
                    className="p-2 rounded-lg bg-blue-500"
                  >
                    <Ionicons name="create-outline" size={16} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(file)}
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

      {/* Add/Edit File Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setModalVisible(false);
          setEditingFile(null);
          setFormData({ title: '', description: '', category: 'PDF', file_url: '' });
        }}
      >
        <View className="flex-1 items-center justify-center bg-black/50">
          <View className="mx-5 w-full max-w-lg rounded-2xl bg-white p-6">
            <Text className="mb-6 text-xl font-bold text-slate-900">
              {editingFile ? 'Edit File' : 'Upload New File'}
            </Text>

            {/* Title */}
            <View className="mb-4">
              <Text className="mb-2 text-sm font-medium text-slate-700">Title</Text>
              <TextInput
                className="w-full rounded-lg border border-gray-300 p-3 text-slate-900"
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                placeholder="Enter file title"
              />
            </View>

            {/* Description */}
            <View className="mb-4">
              <Text className="mb-2 text-sm font-medium text-slate-700">Description</Text>
              <TextInput
                className="w-full h-24 rounded-lg border border-gray-300 p-3 text-slate-900"
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Enter file description"
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

            {/* File URL */}
            <View className="mb-6">
              <Text className="mb-2 text-sm font-medium text-slate-700">File URL (Optional)</Text>
              <TextInput
                className="w-full rounded-lg border border-gray-300 p-3 text-slate-900"
                value={formData.file_url}
                onChangeText={(text) => setFormData({ ...formData, file_url: text })}
                placeholder="Enter file URL (optional)"
              />
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 rounded-lg bg-gray-200 p-3"
                onPress={() => {
                  setModalVisible(false);
                  setEditingFile(null);
                  setFormData({ title: '', description: '', category: 'PDF', file_url: '' });
                }}
              >
                <Text className="text-center font-medium text-slate-700">Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                className="flex-1 rounded-lg bg-primary p-3"
                onPress={handleSave}
              >
                <Text className="text-center font-medium text-white">
                  {editingFile ? 'Update' : 'Upload'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
