import { db } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Poll = {
  id: string;
  question: string;
  options: string[];
  votes: number[];
  is_active: boolean;
  created_at: any;
};

export default function AdminPolls() {
  const router = useRouter();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPoll, setEditingPoll] = useState<Poll | null>(null);
  const [formData, setFormData] = useState({
    question: '',
    options: ['', '']
  });

  useEffect(() => {
    const fetchPolls = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'polls'));
        const data: Poll[] = [];
        querySnapshot.forEach((doc) => {
          const docData = doc.data();
          data.push({
            id: doc.id,
            question: docData.question || '',
            options: docData.options || [],
            votes: docData.votes || [],
            is_active: docData.is_active !== false,
            created_at: docData.created_at
          });
        });
        setPolls(data.sort((a, b) => b.created_at?.toMillis() - a.created_at?.toMillis()).reverse());
      } catch (error) {
        console.error('Error fetching polls:', error);
        Alert.alert('Error', 'Failed to load polls');
      } finally {
        setLoading(false);
      }
    };

    fetchPolls();
  }, []);

  const handleAddOption = () => {
    if (formData.options.length < 6) {
      setFormData({
        ...formData,
        options: [...formData.options, '']
      });
    }
  };

  const handleRemoveOption = (index: number) => {
    const newOptions = formData.options.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      options: newOptions
    });
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({
      ...formData,
      options: newOptions
    });
  };

  const handleSave = async () => {
    if (!formData.question.trim()) {
      Alert.alert('Error', 'Please enter a question');
      return;
    }

    const validOptions = formData.options.filter(opt => opt.trim());
    if (validOptions.length < 2) {
      Alert.alert('Error', 'Please add at least 2 options');
      return;
    }

    try {
      if (editingPoll) {
        // Update existing poll
        await updateDoc(doc(db, 'polls', editingPoll.id), {
          question: formData.question.trim(),
          options: validOptions.map(opt => opt.trim()),
          votes: editingPoll.votes || new Array(validOptions.length).fill(0)
        });
        Alert.alert('Success', 'Poll updated successfully!');
      } else {
        // Create new poll
        await addDoc(collection(db, 'polls'), {
          question: formData.question.trim(),
          options: validOptions.map(opt => opt.trim()),
          votes: new Array(validOptions.length).fill(0),
          is_active: true,
          created_at: serverTimestamp()
        });
        Alert.alert('Success', 'Poll created successfully!');
      }

      setModalVisible(false);
      setFormData({ question: '', options: ['', ''] });
      setEditingPoll(null);
      
      // Refresh the list
      const querySnapshot = await getDocs(collection(db, 'polls'));
      const data: Poll[] = [];
      querySnapshot.forEach((doc) => {
        const docData = doc.data();
        data.push({
          id: doc.id,
          question: docData.question || '',
          options: docData.options || [],
          votes: docData.votes || [],
          is_active: docData.is_active !== false,
          created_at: docData.created_at
        });
      });
      setPolls(data.sort((a, b) => b.created_at?.toMillis() - a.created_at?.toMillis()).reverse());
    } catch (error) {
      console.error('Error saving poll:', error);
      Alert.alert('Error', 'Failed to save poll');
    }
  };

  const handleEdit = (poll: Poll) => {
    setEditingPoll(poll);
    setFormData({
      question: poll.question,
      options: [...poll.options]
    });
    setModalVisible(true);
  };

  const handleDelete = (poll: Poll) => {
    Alert.alert(
      'Delete Poll',
      'Are you sure you want to delete this poll?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'polls', poll.id));
              setPolls(polls.filter(p => p.id !== poll.id));
              Alert.alert('Success', 'Poll deleted successfully!');
            } catch (error) {
              console.error('Error deleting poll:', error);
              Alert.alert('Error', 'Failed to delete poll');
            }
          }
        }
      ]
    );
  };

  const getTotalVotes = (votes: number[]) => {
    return votes.reduce((sum, count) => sum + count, 0);
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
        <Text className="text-slate-500">Loading polls...</Text>
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
          <Text className="text-xl font-bold text-slate-900">Manage Polls</Text>
          <View className="w-12" />
        </View>

        {/* Content */}
        <ScrollView showsVerticalScrollIndicator={false} className="px-6">
          {polls.map((poll) => (
            <View key={poll.id} className="mb-4 bg-white rounded-xl p-4 shadow-sm">
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-slate-900 mb-2">
                    {poll.question}
                  </Text>
                  <View className="flex-row items-center mb-2">
                    <View className={`px-2 py-1 rounded-full ${
                      poll.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      <Text className="text-xs font-medium">
                        {poll.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </Text>
                    </View>
                    <Text className="text-xs text-slate-500 ml-2">
                      • {formatDate(poll.created_at)}
                    </Text>
                  </View>
                  <View className="mb-3">
                    <Text className="text-sm text-slate-600 mb-2">Options:</Text>
                    {poll.options.map((option, index) => (
                      <View key={index} className="flex-row items-center mb-1">
                        <Text className="flex-1 text-sm text-slate-700">{option}</Text>
                        <View className="flex-row items-center">
                          <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center">
                            <Text className="text-xs font-bold text-blue-700">
                              {poll.votes[index] || 0}
                            </Text>
                          </View>
                          <Text className="text-xs text-slate-500 ml-2">
                            {getTotalVotes(poll.votes)} votes
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => handleEdit(poll)}
                    className="p-2 rounded-lg bg-blue-500"
                  >
                    <Ionicons name="create-outline" size={16} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(poll)}
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

      {/* Add/Edit Poll Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setModalVisible(false);
          setEditingPoll(null);
          setFormData({ question: '', options: ['', ''] });
        }}
      >
        <View className="flex-1 items-center justify-center bg-black/50">
          <View className="mx-5 w-full max-w-lg rounded-2xl bg-white p-6">
            <Text className="mb-6 text-xl font-bold text-slate-900">
              {editingPoll ? 'Edit Poll' : 'Create New Poll'}
            </Text>

            {/* Question */}
            <View className="mb-4">
              <Text className="mb-2 text-sm font-medium text-slate-700">Question</Text>
              <TextInput
                className="w-full rounded-lg border border-gray-300 p-3 text-slate-900"
                value={formData.question}
                onChangeText={(text) => setFormData({ ...formData, question: text })}
                placeholder="Enter poll question"
              />
            </View>

            {/* Options */}
            <View className="mb-4">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-sm font-medium text-slate-700">Options</Text>
                {formData.options.length < 6 && (
                  <TouchableOpacity
                    onPress={handleAddOption}
                    className="px-3 py-1 rounded-lg bg-green-500"
                  >
                    <Ionicons name="add" size={16} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View className="mb-6">
              {formData.options.map((option, index) => (
                <View key={index} className="flex-row items-center mb-2">
                  <TextInput
                    className="flex-1 rounded-lg border border-gray-300 p-3 text-slate-900"
                    value={option}
                    onChangeText={(text) => handleOptionChange(index, text)}
                    placeholder={`Option ${index + 1}`}
                  />
                  {formData.options.length > 2 && (
                    <TouchableOpacity
                      onPress={() => handleRemoveOption(index)}
                      className="ml-2 p-2 rounded-lg bg-red-500"
                    >
                      <Ionicons name="remove" size={16} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 rounded-lg bg-gray-200 p-3"
                onPress={() => {
                  setModalVisible(false);
                  setEditingPoll(null);
                  setFormData({ question: '', options: ['', ''] });
                }}
              >
                <Text className="text-center font-medium text-slate-700">Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                className="flex-1 rounded-lg bg-primary p-3"
                onPress={handleSave}
              >
                <Text className="text-center font-medium text-white">
                  {editingPoll ? 'Update' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
