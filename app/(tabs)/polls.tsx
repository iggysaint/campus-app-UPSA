import { db } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

type PollOption = {
  text: string;
  votes: number;
};

type Poll = {
  id: string;
  question: string | null;
  options: string[]; // Array of strings from Firestore
  created_at: any;
  expires_at: any;
  is_active: boolean;
};

function PollCard({ 
  poll, 
  onVote, 
  hasVoted, 
  selectedOption,
  voteCounts 
}: { 
  poll: Poll; 
  onVote: (optionIndex: number) => void;
  hasVoted: boolean;
  selectedOption: number | null;
  voteCounts?: { [key: number]: number };
}) {
  const totalVotes = voteCounts ? Object.values(voteCounts).reduce((sum, count) => sum + count, 0) : 0;

  return (
    <View className="rounded-2xl bg-white p-4 shadow-sm">
      <Text className="mb-4 text-base font-semibold text-slate-900">
        {poll.question || 'Poll Question'}
      </Text>
      
      {!hasVoted ? (
        <View className="gap-2">
          {poll.options.map((option, index) => (
            <Pressable
              key={index}
              onPress={() => onVote(index)}
              className={`rounded-xl border-2 p-3 ${
                selectedOption === index
                  ? 'border-primary bg-primary/10'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <Text className={`text-sm font-medium ${
                selectedOption === index
                  ? 'text-primary'
                  : 'text-slate-700'
              }`}>
                {option || `Option ${index + 1}`}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View className="gap-2">
          {poll.options.map((option, index) => {
            const votes = voteCounts?.[index] || 0;
            const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
            return (
              <View key={index} className="rounded-xl border-2 border-gray-200 p-3">
                <View className="flex-row items-center justify-between">
                  <Text className="flex-1 text-sm font-medium text-slate-700">
                    {option || `Option ${index + 1}`}
                  </Text>
                  <Text className="text-sm font-semibold text-slate-900">
                    {percentage.toFixed(1)}%
                  </Text>
                </View>
                <View className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <View 
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${percentage}%` }}
                  />
                </View>
                <Text className="mt-1 text-xs text-slate-500">
                  {votes} vote{votes !== 1 ? 's' : ''}
                </Text>
              </View>
            );
          })}
        </View>
      )}
      
      <View className="mt-3 flex-row items-center justify-between">
        <Text className="text-xs text-slate-500">
          {poll.created_at?.toDate?.()?.toLocaleDateString() || 'No date'}
        </Text>
        <View className={`rounded-full px-2 py-1 ${
          poll.is_active ? 'bg-green-100' : 'bg-gray-100'
        }`}>
          <Text className={`text-xs font-medium ${
            poll.is_active ? 'text-green-700' : 'text-gray-600'
          }`}>
            {poll.is_active ? 'Active' : 'Closed'}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function PollsScreen() {
  const router = useRouter();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [votedPolls, setVotedPolls] = useState<Set<string>>(new Set());
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: number | null }>({});
  const [voteCounts, setVoteCounts] = useState<{ [key: string]: { [key: number]: number } }>({});

  useEffect(() => {
    let cancelled = false;

    // Load voted polls from AsyncStorage
    (async () => {
      try {
        const voted = await AsyncStorage.getItem('votedPolls');
        if (voted && !cancelled) {
          setVotedPolls(new Set(JSON.parse(voted)));
        }
      } catch (error) {
        console.error('Failed to load voted polls:', error);
      }
    })();

    // Fetch polls from Firestore
    (async () => {
      try {
        setLoading(true);
        const querySnapshot = await getDocs(collection(db, 'polls'));
        
        const data: Poll[] = [];
        const counts: { [key: string]: { [key: number]: number } } = {};
        
        querySnapshot.forEach((doc) => {
          const docData = doc.data();
          const pollData = {
            id: doc.id,
            question: docData.question || null,
            options: docData.options || [],
            created_at: docData.created_at || null,
            expires_at: docData.expires_at || null,
            is_active: docData.is_active || false,
          };
          data.push(pollData);
          
          // Initialize vote counts (assuming Firestore stores vote counts separately or as array of numbers)
          if (Array.isArray(docData.vote_counts)) {
            counts[doc.id] = docData.vote_counts.reduce((acc: { [key: number]: number }, count: number, index: number) => {
              acc[index] = count;
              return acc;
            }, {});
          } else {
            // If no vote counts in Firestore, initialize to zeros
            counts[doc.id] = (docData.options || []).reduce((acc: { [key: number]: number }, _: any, index: number) => {
              acc[index] = 0;
              return acc;
            }, {});
          }
        });

        console.log('polls data:', JSON.stringify(data));
        console.log('polls error:', JSON.stringify(null));

        if (cancelled) return;
        setPolls(data);
        setVoteCounts(counts);
      } catch (error) {
        console.log('polls data:', JSON.stringify(null));
        console.log('polls error:', JSON.stringify(error));
        if (!cancelled) setPolls([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleVote = async (pollId: string, optionIndex: number) => {
    if (votedPolls.has(pollId)) return;

    try {
      const poll = polls.find(p => p.id === pollId);
      
      if (!poll) return;

      // Update vote counts locally
      const newVoteCounts = { ...voteCounts };
      if (!newVoteCounts[pollId]) {
        newVoteCounts[pollId] = {};
      }
      newVoteCounts[pollId][optionIndex] = (newVoteCounts[pollId][optionIndex] || 0) + 1;

      // Update Firestore with new vote counts
      const pollRef = doc(db, 'polls', pollId);
      await updateDoc(pollRef, {
        vote_counts: Object.values(newVoteCounts[pollId])
      });

      // Update local state
      setVoteCounts(newVoteCounts);

      // Save to AsyncStorage immediately
      const newVotedPolls = new Set([...votedPolls, pollId]);
      setVotedPolls(newVotedPolls);
      await AsyncStorage.setItem('votedPolls', JSON.stringify([...newVotedPolls]));

      // Clear selected option
      setSelectedOptions(prev => ({ ...prev, [pollId]: null }));
    } catch (error) {
      console.error('Failed to vote:', error);
    }
  };

  const activePolls = polls.filter(poll => poll.is_active);

  return (
    <View className="flex-1 bg-[#F5F7FA]">
      <View className="bg-white px-5 pt-14 pb-4 shadow-sm">
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="mr-3 h-10 w-10 items-center justify-center rounded-full active:opacity-80"
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </Pressable>
          <Text className="text-xl font-bold text-slate-900">Polls</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="px-5 py-4">
          {loading ? (
            <View className="rounded-2xl bg-white p-6 shadow-sm">
              <Text className="text-center text-sm text-slate-500">Loading polls...</Text>
            </View>
          ) : activePolls.length === 0 ? (
            <View className="rounded-2xl bg-white p-6 shadow-sm">
              <View className="items-center">
                <View className="mb-3 h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                  <Ionicons name="stats-chart-outline" size={32} color="#9CA3AF" />
                </View>
                <Text className="text-base font-semibold text-slate-900">No active polls</Text>
                <Text className="mt-1 text-center text-sm text-slate-500">
                  Check back later for new polls and voting opportunities.
                </Text>
              </View>
            </View>
          ) : (
            <View className="gap-3">
              {activePolls.map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  hasVoted={votedPolls.has(poll.id)}
                  selectedOption={selectedOptions[poll.id]}
                  voteCounts={voteCounts[poll.id]}
                  onVote={(optionIndex: number) => {
                    if (votedPolls.has(poll.id)) return;
                    
                    // Handle option selection and vote
                    if (selectedOptions[poll.id] === optionIndex) {
                      // If same option selected, submit the vote
                      handleVote(poll.id, optionIndex);
                    } else {
                      // Select the option
                      setSelectedOptions(prev => ({ ...prev, [poll.id]: optionIndex }));
                    }
                  }}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
