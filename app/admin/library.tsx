import { useUserRole } from '@/lib/auth-context';
import { auth, db } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// FIX #1: url field matches student screen
type LibraryFile = {
  id: string;
  title: string;
  description: string;
  category: string;
  url: string;
  created_at: any;
  is_active: boolean;
};

const categories = [
  { label: 'PDF', value: 'PDF' },
  { label: 'Videos', value: 'Videos' },
  { label: 'Past Paper', value: 'Past Paper' },
  { label: 'Template', value: 'Template' },
  { label: 'Letter', value: 'Letter' },
  { label: 'Slides', value: 'Slides' },
  { label: 'Notes', value: 'Notes' },
  { label: 'Books', value: 'Books' },
];

// FIX #9: getCategoryColors — separate bg/text, not combined Tailwind classes
const getCategoryColors = (category: string) => {
  switch (category) {
    case 'PDF': return { bg: '#FDEAEA', text: '#DC2626' };
    case 'Videos': return { bg: '#F3E8FF', text: '#9333EA' };
    case 'Past Paper': return { bg: '#FEF3C7', text: '#D97706' };
    case 'Template': return { bg: '#D1FAE5', text: '#059669' };
    case 'Letter': return { bg: '#DBEAFE', text: '#2563EB' };
    case 'Slides': return { bg: '#FCE7F3', text: '#DB2777' };
    case 'Notes': return { bg: '#FEF9C3', text: '#CA8A04' };
    case 'Books': return { bg: '#F3F4F6', text: '#6B7280' };
    default: return { bg: '#F3F4F6', text: '#6B7280' };
  }
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'PDF':
    case 'Past Paper':
    case 'Letter':
    case 'Template': return 'document-text-outline';
    case 'Videos': return 'videocam-outline';
    case 'Slides': return 'layers-outline';
    case 'Notes': return 'create-outline';
    case 'Books': return 'book-outline';
    default: return 'document-outline';
  }
};

// FIX #8: formatDate crash guard
const formatDate = (timestamp: any) => {
  if (!timestamp || !timestamp.toDate) return '';
  try {
    return timestamp.toDate().toLocaleDateString();
  } catch {
    return '';
  }
};

export default function AdminLibrary() {
  const router = useRouter();
  // FIX #6: admin role check
  const role = useUserRole();
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingFile, setEditingFile] = useState<LibraryFile | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'PDF',
    url: '',
  });

  // FIX #10: extracted reusable fetchFiles
  // FIX #7: only fetch is_active == true
  const fetchFiles = useCallback(async () => {
    try {
      const q = query(
        collection(db, 'library'),
        where('is_active', '==', true),
        orderBy('created_at', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const data: LibraryFile[] = [];
      querySnapshot.forEach((docSnap) => {
        const docData = docSnap.data();
        data.push({
          id: docSnap.id,
          // FIX #1: read url not file_url
          title: docData.title || '',
          description: docData.description || '',
          category: docData.category || 'PDF',
          url: docData.url || '',
          created_at: docData.created_at,
          is_active: docData.is_active !== false,
        });
      });
      // FIX #3: removed broken .sort().reverse() — orderBy handles it
      setFiles(data);
    } catch (error) {
      console.error('Error fetching files:', error);
      Alert.alert('Error', 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // FIX #6: redirect non-admins
    if (role && role !== 'admin') {
      router.replace('/(tabs)');
      return;
    }
    fetchFiles();
  }, [role, fetchFiles]);

  const resetForm = () => {
    setFormData({ title: '', description: '', category: 'PDF', url: '' });
    setEditingFile(null);
    setModalVisible(false);
  };

  const handleSave = async () => {
    // FIX #4: saving guard
    if (saving) return;

    if (!formData.title.trim() || !formData.description.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // FIX #5: Strong URL validation using built-in URL parser
    if (formData.url) {
      try {
        new URL(formData.url.trim());
      } catch {
        Alert.alert('Invalid URL', 'Please enter a valid URL (e.g. https://example.com/file.pdf)');
        return;
      }
    }

    setSaving(true);
    try {
      if (editingFile) {
        await updateDoc(doc(db, 'library', editingFile.id), {
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: formData.category,
          // FIX #1: save as url not file_url
          url: formData.url.trim(),
          is_active: true,
        });

        // FIX #11: update local state instead of re-fetching
        setFiles(prev => prev.map(f =>
          f.id === editingFile.id
            ? { ...f, title: formData.title.trim(), description: formData.description.trim(), category: formData.category, url: formData.url.trim() }
            : f
        ));

        Alert.alert('Success', 'File updated successfully!');
      } else {
        const docRef = await addDoc(collection(db, 'library'), {
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: formData.category,
          // FIX #1: save as url not file_url
          url: formData.url.trim(),
          uploaded_by: auth.currentUser?.uid,
          created_at: serverTimestamp(),
          is_active: true,
        });

        // FIX #11: update local state instead of re-fetching
        setFiles(prev => [{
          id: docRef.id,
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: formData.category,
          url: formData.url.trim(),
          created_at: null,
          is_active: true,
        }, ...prev]);

        Alert.alert('Success', 'File uploaded successfully!');
      }

      resetForm();
    } catch (error) {
      console.error('Error saving file:', error);
      Alert.alert('Error', 'Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (file: LibraryFile) => {
    setEditingFile(file);
    setFormData({
      title: file.title,
      description: file.description,
      category: file.category,
      // FIX #1: use url not file_url
      url: file.url,
    });
    setModalVisible(true);
  };

  const handleDelete = (file: LibraryFile) => {
    Alert.alert(
      'Remove File',
      'Are you sure you want to remove this file?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // FIX #2: soft delete — consistent with student screen
              await updateDoc(doc(db, 'library', file.id), { is_active: false });
              // FIX #11: update local state
              setFiles(prev => prev.filter(f => f.id !== file.id));
              Alert.alert('Success', 'File removed successfully!');
            } catch (error) {
              console.error('Error removing file:', error);
              Alert.alert('Error', 'Failed to remove file');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F2F4F6]">
        <Text className="text-slate-500">Loading files...</Text>
      </View>
    );
  }

  return (
    // FIX #13: flex-1 so FAB positions correctly
    <View className="flex-1 bg-[#F2F4F6]">
      <View className="pt-12 pb-4 px-6">
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity onPress={() => router.push('/admin')} className="p-2">
            <Ionicons name="arrow-back" size={24} color="#0088CC" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-900">Manage Library</Text>
          <View className="w-12" />
        </View>
      </View>

      {/* FIX #12: Empty state UI */}
      {files.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="library-outline" size={48} color="#9CA3AF" />
          <Text className="mt-4 text-lg font-semibold text-slate-700">No files yet</Text>
          <Text className="mt-1 text-sm text-slate-500 text-center">
            Tap the + button to upload the first file.
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-6">
          <View className="pb-24">
            {files.map((file) => {
              const colors = getCategoryColors(file.category);
              return (
                <View key={file.id} className="mb-4 bg-white rounded-xl p-4 shadow-sm">
                  <View className="flex-row justify-between items-start mb-3">
                    <View className="flex-1">
                      <View className="flex-row items-center mb-2 gap-2">
                        <View className="w-10 h-10 items-center justify-center rounded-lg bg-blue-100">
                          <Ionicons name={getCategoryIcon(file.category)} size={18} color="#0088CC" />
                        </View>
                        {/* FIX #9: bg on View, text on Text separately */}
                        <View className="px-2 py-1 rounded-full" style={{ backgroundColor: colors.bg }}>
                          <Text className="text-xs font-medium" style={{ color: colors.text }}>
                            {file.category.toUpperCase()}
                          </Text>
                        </View>
                        {formatDate(file.created_at) ? (
                          <Text className="text-xs text-slate-500">
                            • {formatDate(file.created_at)}
                          </Text>
                        ) : null}
                      </View>
                      {/* FIX #14: numberOfLines={1} on title */}
                      <Text className="text-base font-semibold text-slate-900 mb-1" numberOfLines={1}>
                        {file.title}
                      </Text>
                      <Text className="text-sm text-slate-600" numberOfLines={2}>
                        {file.description}
                      </Text>
                    </View>
                    <View className="flex-row gap-2 ml-2">
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
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* FIX #13: FAB correctly positioned in flex-1 container */}
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        className="absolute bottom-8 right-6 w-14 h-14 bg-[#0088CC] rounded-full shadow-lg items-center justify-center"
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add/Edit File Modal */}
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
                {editingFile ? 'Edit File' : 'Upload New File'}
              </Text>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Title */}
                <View className="mb-4">
                  <Text className="mb-2 text-sm font-medium text-slate-700">Title</Text>
                  <TextInput
                    className="w-full rounded-lg border border-gray-300 p-3 text-slate-900"
                    value={formData.title}
                    onChangeText={(text) => setFormData({ ...formData, title: text })}
                    placeholder="Enter file title"
                    editable={!saving}
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
                    editable={!saving}
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

                {/* File URL */}
                <View className="mb-6">
                  <Text className="mb-2 text-sm font-medium text-slate-700">File URL</Text>
                  <TextInput
                    className="w-full rounded-lg border border-gray-300 p-3 text-slate-900"
                    value={formData.url}
                    onChangeText={(text) => setFormData({ ...formData, url: text })}
                    placeholder="Enter file URL (https://...)"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!saving}
                  />
                </View>

                {/* Action Buttons */}
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
                      {saving ? 'Saving...' : editingFile ? 'Update' : 'Upload'}
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
