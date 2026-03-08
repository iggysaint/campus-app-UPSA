import { db } from '@/lib/firebase';
import { sendNotificationToAll } from '@/lib/notifications';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

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

export default function AdminPolls() {
  const router = useRouter();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPoll, setEditingPoll] = useState<Poll | null>(null);
  const [formData, setFormData] = useState({
    question: '',
    options: ['', ''],
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    const fetchPolls = async () => {
      try {
        // Fetch polls
        const pollsQuery = await getDocs(collection(db, 'polls'));
        const pollsData: Poll[] = [];
        
        pollsQuery.forEach((doc) => {
          const docData = doc.data();
          pollsData.push({
            id: doc.id,
            question: docData.question || '',
            options: docData.options || [],
            votes: [], // Will be populated from votes collection
            is_active: docData.is_active !== false,
            start_date: docData.start_date,
            end_date: docData.end_date,
            created_at: docData.created_at
          });
        });

        // Fetch votes for each poll
        const votesQuery = await getDocs(collection(db, 'votes'));
        const votesByPoll: { [key: string]: Vote[] } = {};
        
        votesQuery.forEach((doc) => {
          const voteData = doc.data() as Vote;
          if (!votesByPoll[voteData.poll_id]) {
            votesByPoll[voteData.poll_id] = [];
          }
          votesByPoll[voteData.poll_id].push(voteData);
        });

        // Calculate vote counts for each poll
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

        setPolls(pollsData.sort((a, b) => b.created_at?.toMillis() - a.created_at?.toMillis()).reverse());
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

  const parseDate = (dateString: string) => {
    if (!dateString.trim()) return null;
    
    // Parse DD/MM/YYYY HH:MM format
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
        // Update existing poll - preserve existing vote counts for unchanged options
        const updatedVotes = validOptions.map((option, index) => {
          // Check if this option existed in the original poll
          const originalIndex = editingPoll.options.findIndex(opt => opt.trim() === option);
          if (originalIndex !== -1 && originalIndex < editingPoll.votes.length) {
            // Preserve existing vote count for unchanged option
            return editingPoll.votes[originalIndex];
          } else {
            // Set 0 for newly added options
            return 0;
          }
        });

        const parsedStartDate = formData.start_date ? parseDate(formData.start_date) : null;
        const parsedEndDate = formData.end_date ? parseDate(formData.end_date) : null;
        
        await updateDoc(doc(db, 'polls', editingPoll.id), {
          question: formData.question.trim(),
          options: validOptions.map(opt => opt.trim()),
          votes: updatedVotes,
          start_date: parsedStartDate,
          end_date: parsedEndDate
        });
        Alert.alert('Success', 'Poll updated successfully!');
      } else {
        // Create new poll
        const parsedStartDate = formData.start_date ? parseDate(formData.start_date) : null;
        const parsedEndDate = formData.end_date ? parseDate(formData.end_date) : null;
        
        await addDoc(collection(db, 'polls'), {
          question: formData.question.trim(),
          options: validOptions.map(opt => opt.trim()),
          votes: new Array(validOptions.length).fill(0),
          is_active: true,
          start_date: parsedStartDate,
          end_date: parsedEndDate,
          created_at: serverTimestamp()
        });
        
        // Send push notification to all users
        await sendNotificationToAll(
          '🗳️ New Poll',
          formData.question,
          { type: 'poll' }
        );
        
        Alert.alert('Success', 'Poll created successfully!');
      }

      setModalVisible(false);
      setFormData({ question: '', options: ['', ''], start_date: '', end_date: '' });
      setEditingPoll(null);
      
      // Refresh the list
      const pollsQuery = await getDocs(collection(db, 'polls'));
      const pollsData: Poll[] = [];
      
      pollsQuery.forEach((doc) => {
        const docData = doc.data();
        pollsData.push({
          id: doc.id,
          question: docData.question || '',
          options: docData.options || [],
          votes: [], // Will be populated from votes collection
          is_active: docData.is_active !== false,
          start_date: docData.start_date,
          end_date: docData.end_date,
          created_at: docData.created_at
        });
      });

      // Fetch votes for each poll
      const votesQuery = await getDocs(collection(db, 'votes'));
      const votesByPoll: { [key: string]: Vote[] } = {};
      
      votesQuery.forEach((doc) => {
        const voteData = doc.data() as Vote;
        if (!votesByPoll[voteData.poll_id]) {
          votesByPoll[voteData.poll_id] = [];
        }
        votesByPoll[voteData.poll_id].push(voteData);
      });

      // Calculate vote counts for each poll
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

      setPolls(pollsData.sort((a, b) => b.created_at?.toMillis() - a.created_at?.toMillis()).reverse());
    } catch (error) {
      console.error('Error saving poll:', error);
      Alert.alert('Error', 'Failed to save poll');
    }
  };

  const formatDateForInput = (date: any) => {
    if (!date) return '';
    const d = date.toDate();
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const handleEdit = (poll: Poll) => {
    setEditingPoll(poll);
    setFormData({
      question: poll.question,
      options: [...poll.options],
      start_date: formatDateForInput(poll.start_date),
      end_date: formatDateForInput(poll.end_date)
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
          setFormData({ question: '', options: ['', ''], start_date: '', end_date: '' });
        }}
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

                {/* Date Fields */}
                <View className="mb-4">
                  <Text className="mb-2 text-sm font-medium text-slate-700">Start Date</Text>
                  <TextInput
                    className="w-full rounded-lg border border-gray-300 p-3 text-slate-900"
                    value={formData.start_date}
                    onChangeText={(text) => setFormData({ ...formData, start_date: text })}
                    placeholder="DD/MM/YYYY HH:MM"
                  />
                </View>

                <View className="mb-6">
                  <Text className="mb-2 text-sm font-medium text-slate-700">End Date</Text>
                  <TextInput
                    className="w-full rounded-lg border border-gray-300 p-3 text-slate-900"
                    value={formData.end_date}
                    onChangeText={(text) => setFormData({ ...formData, end_date: text })}
                    placeholder="DD/MM/YYYY HH:MM"
                  />
                </View>

                {/* Action Buttons */}
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className="flex-1 rounded-lg bg-gray-200 p-3"
                    onPress={() => {
                      setModalVisible(false);
                      setEditingPoll(null);
                      setFormData({ question: '', options: ['', ''], start_date: '', end_date: '' });
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
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
