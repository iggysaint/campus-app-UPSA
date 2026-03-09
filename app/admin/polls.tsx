import { db } from '@/lib/firebase';
import { sendNotificationToAll } from '@/lib/notifications';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Poll = {
  id: string;
  question: string;
  options: string[];
  votes: number[];
  is_active: boolean;
  start_date: any;
  end_date: any;
  created_at: any;
};

type Vote = {
  poll_id: string;
  user_id: string;
  option_index: number;
  voted_at: any;
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

const formatDateForInput = (date: any) => {
  if (!date?.toDate) return '';
  try {
    const d = date.toDate();
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return '';
  }
};

const parseDate = (dateString: string) => {
  if (!dateString.trim()) return null;
  const regex = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/;
  const match = dateString.trim().match(regex);
  if (match) {
    const [, day, month, year, hours, minutes] = match;
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hours),
      parseInt(minutes)
    );
  }
  return null;
};

const getTotalVotes = (votes: number[]) => votes.reduce((sum, count) => sum + count, 0);

export default function AdminPolls() {
  const router = useRouter();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPoll, setEditingPoll] = useState<Poll | null>(null);
  const [formData, setFormData] = useState({
    question: '',
    options: ['', ''],
    start_date: '',
    end_date: ''
  });

  // FIX: extracted as useCallback
  const fetchPolls = useCallback(async () => {
    try {
      const pollsQuery = await getDocs(collection(db, 'polls'));
      const pollsData: Poll[] = [];

      pollsQuery.forEach((docSnap) => {
        const d = docSnap.data();
        pollsData.push({
          id: docSnap.id,
          question: d.question || '',
          options: d.options || [],
          votes: [],
          is_active: d.is_active !== false,
          start_date: d.start_date,
          end_date: d.end_date,
          created_at: d.created_at,
        });
      });

      const votesQuery = await getDocs(collection(db, 'votes'));
      const votesByPoll: { [key: string]: Vote[] } = {};

      votesQuery.forEach((docSnap) => {
        const voteData = docSnap.data() as Vote;
        if (!votesByPoll[voteData.poll_id]) {
          votesByPoll[voteData.poll_id] = [];
        }
        votesByPoll[voteData.poll_id].push(voteData);
      });

      pollsData.forEach((poll) => {
        const pollVotes = votesByPoll[poll.id] || [];
        const voteCounts = new Array(poll.options.length).fill(0);
        pollVotes.forEach((vote) => {
          if (vote.option_index >= 0 && vote.option_index < voteCounts.length) {
            voteCounts[vote.option_index]++;
          }
        });
        poll.votes = voteCounts;
      });

      // FIX: sort fix
      setPolls(
        pollsData.sort((a, b) => (b.created_at?.toMillis?.() || 0) - (a.created_at?.toMillis?.() || 0))
      );
    } catch {
      Alert.alert('Error', 'Failed to load polls');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  const resetForm = () => {
    setFormData({ question: '', options: ['', ''], start_date: '', end_date: '' });
    setEditingPoll(null);
    setModalVisible(false);
  };

  const handleAddOption = () => {
    if (formData.options.length < 6) {
      setFormData(prev => ({ ...prev, options: [...prev.options, ''] }));
    }
  };

  const handleRemoveOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData(prev => ({ ...prev, options: newOptions }));
  };

  const handleSave = async () => {
    // FIX: saving guard
    if (saving) return;

    if (!formData.question.trim()) {
      Alert.alert('Error', 'Please enter a question');
      return;
    }

    const validOptions = formData.options.filter(opt => opt.trim());
    if (validOptions.length < 2) {
      Alert.alert('Error', 'Please add at least 2 options');
      return;
    }

    setSaving(true);
    try {
      if (editingPoll) {
        const updatedVotes = validOptions.map((option) => {
          const originalIndex = editingPoll.options.findIndex(opt => opt.trim() === option);
          if (originalIndex !== -1 && originalIndex < editingPoll.votes.length) {
            return editingPoll.votes[originalIndex];
          }
          return 0;
        });

        await updateDoc(doc(db, 'polls', editingPoll.id), {
          question: formData.question.trim(),
          options: validOptions.map(opt => opt.trim()),
          votes: updatedVotes,
          start_date: parseDate(formData.start_date),
          end_date: parseDate(formData.end_date),
        });
        Alert.alert('Success', 'Poll updated successfully!');
      } else {
        await addDoc(collection(db, 'polls'), {
          question: formData.question.trim(),
          options: validOptions.map(opt => opt.trim()),
          votes: new Array(validOptions.length).fill(0),
          is_active: true,
          start_date: parseDate(formData.start_date),
          end_date: parseDate(formData.end_date),
          created_at: serverTimestamp(),
        });

        try {
          await sendNotificationToAll('🗳️ New Poll', formData.question, { type: 'poll' });
        } catch {}

        Alert.alert('Success', 'Poll created successfully!');
      }

      resetForm();
      await fetchPolls();
    } catch {
      Alert.alert('Error', 'Failed to save poll');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (poll: Poll) => {
    setEditingPoll(poll);
    setFormData({
      question: poll.question,
      options: [...poll.options],
      start_date: formatDateForInput(poll.start_date),
      end_date: formatDateForInput(poll.end_date),
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
              setPolls(prev => prev.filter(p => p.id !== poll.id));
              Alert.alert('Success', 'Poll deleted successfully!');
            } catch {
              Alert.alert('Error', 'Failed to delete poll');
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
        <Text className="text-slate-500 mt-2">Loading polls...</Text>
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
        <Text className="text-xl font-bold text-slate-900">Manage Polls</Text>
        <View className="w-12" />
      </View>

      {polls.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Ionicons name="stats-chart-outline" size={48} color="#9CA3AF" />
          <Text className="text-slate-500 mt-4 font-medium">No polls yet.</Text>
          <Text className="text-slate-400 text-sm">Tap + to create one.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} className="px-6 flex-1">
          {polls.map((poll) => (
            <View key={poll.id} className="mb-4 bg-white rounded-xl p-4 shadow-sm">
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1 mr-2">
                  <Text className="text-base font-semibold text-slate-900 mb-2" numberOfLines={2}>
                    {poll.question}
                  </Text>
                  <View className="flex-row items-center mb-2">
                    <View className={`px-2 py-1 rounded-full ${poll.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <Text className={`text-xs font-medium ${poll.is_active ? 'text-green-700' : 'text-gray-700'}`}>
                        {poll.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </Text>
                    </View>
                    <Text className="text-xs text-slate-500 ml-2">
                      • {formatDate(poll.created_at)}
                    </Text>
                  </View>
                  <View className="mb-1">
                    {poll.options.map((option, index) => (
                      <View key={index} className="flex-row items-center mb-1">
                        <Text className="flex-1 text-sm text-slate-700" numberOfLines={1}>{option}</Text>
                        <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center ml-2">
                          <Text className="text-xs font-bold text-blue-700">
                            {poll.votes[index] || 0}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                  <Text className="text-xs text-slate-400 mt-1">
                    Total votes: {getTotalVotes(poll.votes)}
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  <TouchableOpacity onPress={() => handleEdit(poll)} className="p-2 rounded-lg bg-blue-500">
                    <Ionicons name="create-outline" size={16} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(poll)} className="p-2 rounded-lg bg-red-500">
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
                {editingPoll ? 'Edit Poll' : 'Create New Poll'}
              </Text>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="mb-4">
                  <Text className="mb-2 text-sm font-medium text-slate-700">Question</Text>
                  <TextInput
                    className="w-full rounded-lg border border-gray-300 p-3 text-slate-900"
                    value={formData.question}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, question: text.trimStart() }))}
                    placeholder="Enter poll question"
                    maxLength={200}
                    editable={!saving}
                  />
                </View>

                <View className="mb-4">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-sm font-medium text-slate-700">Options</Text>
                    {formData.options.length < 6 && (
                      <TouchableOpacity onPress={handleAddOption} className="px-3 py-1 rounded-lg bg-green-500">
                        <Ionicons name="add" size={16} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>
                  {formData.options.map((option, index) => (
                    <View key={index} className="flex-row items-center mb-2">
                      <TextInput
                        className="flex-1 rounded-lg border border-gray-300 p-3 text-slate-900"
                        value={option}
                        onChangeText={(text) => handleOptionChange(index, text)}
                        placeholder={`Option ${index + 1}`}
                        maxLength={100}
                        editable={!saving}
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

                <View className="mb-4">
                  <Text className="mb-2 text-sm font-medium text-slate-700">Start Date</Text>
                  <TextInput
                    className="w-full rounded-lg border border-gray-300 p-3 text-slate-900"
                    value={formData.start_date}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, start_date: text }))}
                    placeholder="DD/MM/YYYY HH:MM"
                    editable={!saving}
                  />
                </View>

                <View className="mb-6">
                  <Text className="mb-2 text-sm font-medium text-slate-700">End Date</Text>
                  <TextInput
                    className="w-full rounded-lg border border-gray-300 p-3 text-slate-900"
                    value={formData.end_date}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, end_date: text }))}
                    placeholder="DD/MM/YYYY HH:MM"
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
                    className={`flex-1 rounded-lg bg-[#0088CC] p-3 ${saving ? 'opacity-60' : ''}`}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    <Text className="text-center font-medium text-white">
                      {saving ? 'Saving...' : editingPoll ? 'Update' : 'Create'}
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