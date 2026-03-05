import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { auth, db } from '@/lib/firebase';
import { addDoc, collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Vote {
  poll_id: string;
  user_id: string;
  option_index: number;
  voted_at: any;
}

interface Poll {
  id: string;
  question: string;
  options: string[];
  vote_counts: number[];
  is_active: boolean;
  start_date: any;
  end_date: any;
}

const { width: screenWidth } = Dimensions.get('window');

export default function PollsScreen() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());
  const [votingPollId, setVotingPollId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchPolls();
    loadUserVotes();
    
    // Update current time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 60 seconds
    
    return () => clearInterval(interval);
  }, []);

  const fetchPolls = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'polls'));
      const pollsData: Poll[] = [];
      querySnapshot.forEach((doc) => {
        const pollData = { id: doc.id, ...doc.data() } as Poll;
        // Ensure vote_counts is always an array
        if (!pollData.vote_counts || !Array.isArray(pollData.vote_counts)) {
          pollData.vote_counts = new Array(pollData.options?.length || 0).fill(0);
        }
        pollsData.push(pollData);
      });
      // Sort by start_date descending
      pollsData.sort((a, b) => b.start_date?.toDate() - a.start_date?.toDate());
      setPolls(pollsData);
    } catch (error) {
      console.error('Error fetching polls:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserVotes = async () => {
    try {
      if (!auth.currentUser) return;
      
      const votesQuery = query(
        collection(db, 'votes'),
        where('user_id', '==', auth.currentUser.uid)
      );
      const querySnapshot = await getDocs(votesQuery);
      const votedPollIds = new Set<string>();
      
      querySnapshot.forEach((doc) => {
        const voteData = doc.data() as Vote;
        votedPollIds.add(voteData.poll_id);
      });
      
      setUserVotes(votedPollIds);
    } catch (error) {
      console.error('Error loading user votes:', error);
    }
  };

  const saveUserVote = async (pollId: string, optionIndex: number) => {
    try {
      if (!auth.currentUser) return;
      
      // Add vote document to Firestore
      await addDoc(collection(db, 'votes'), {
        poll_id: pollId,
        user_id: auth.currentUser.uid,
        option_index: optionIndex,
        voted_at: serverTimestamp()
      });
      
      // Update local state
      const newUserVotes = new Set(userVotes).add(pollId);
      setUserVotes(newUserVotes);
    } catch (error) {
      console.error('Error saving user vote:', error);
    }
  };

  const handleVote = async (pollId: string, optionIndex: number) => {
    if (userVotes.has(pollId) || votingPollId || !auth.currentUser) return;

    setVotingPollId(pollId);
    try {
      const pollRef = doc(db, 'polls', pollId);
      const poll = polls.find(p => p.id === pollId);
      
      if (poll) {
        // Ensure vote_counts is a valid array
        const currentVoteCounts = poll.vote_counts || new Array(poll.options?.length || 0).fill(0);
        const newVoteCounts = [...currentVoteCounts];
        newVoteCounts[optionIndex] = (newVoteCounts[optionIndex] || 0) + 1;
        
        // Update the poll document's vote_counts array
        await updateDoc(pollRef, {
          vote_counts: newVoteCounts
        });

        // Update local state
        setPolls(prev => prev.map(p => 
          p.id === pollId 
            ? { ...p, vote_counts: newVoteCounts }
            : p
        ));

        // Save the vote to votes collection
        await saveUserVote(pollId, optionIndex);
      }
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setVotingPollId(null);
    }
  };

  const getPollStatus = (poll: Poll) => {
    const now = currentTime;
    const startDate = poll.start_date?.toDate();
    const endDate = poll.end_date?.toDate();
    
    // Don't show if current date is before start_date
    if (startDate && now < startDate) {
      return 'upcoming';
    }
    
    // If current date is past end_date, treat as ended regardless of is_active
    if (endDate && now > endDate) {
      return 'ended';
    }
    
    // Otherwise, use is_active flag
    return poll.is_active ? 'active' : 'ended';
  };

  const getWinningOptions = (voteCounts: number[] | undefined | null) => {
    if (!voteCounts || !Array.isArray(voteCounts) || voteCounts.length === 0) {
      return [];
    }
    const maxVotes = Math.max(...voteCounts);
    if (maxVotes === 0) return []; // No votes yet
    return voteCounts.map((count, index) => count === maxVotes ? index : -1).filter(index => index !== -1);
  };

  const getPercentage = (votes: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((votes / total) * 100);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Polls</Text>
          <Text style={styles.subtitle}>Vote on campus polls</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#0088CC" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Polls</Text>
        <Text style={styles.subtitle}>Vote on campus polls</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {polls.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No active polls</Text>
            <Text style={styles.emptySubtext}>Check back later for new polls</Text>
          </View>
        ) : (
          polls.filter(poll => getPollStatus(poll) !== 'upcoming').map((poll) => {
            const status = getPollStatus(poll);
            const hasVoted = userVotes.has(poll.id);
            // Ensure vote_counts is always a valid array
            const voteCounts = poll.vote_counts || new Array(poll.options?.length || 0).fill(0);
            const totalVotes = voteCounts.reduce((sum, count) => sum + (count || 0), 0);
            const winningOptions = getWinningOptions(voteCounts);
            
            return (
              <View key={poll.id} style={styles.pollCard}>
                <View style={styles.pollHeader}>
                  <Text style={styles.pollQuestion}>{poll.question}</Text>
                  <View style={[
                    styles.statusBadge,
                    status === 'active' ? styles.activeBadge : styles.endedBadge
                  ]}>
                    <Text style={[
                      styles.statusText,
                      status === 'active' ? styles.activeText : styles.endedText
                    ]}>
                      {status === 'active' ? 'Active' : 'Ended'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.optionsContainer}>
                  {poll.options.map((option, index) => {
                    // Ensure vote_counts is always a valid array
                    const voteCounts = poll.vote_counts || new Array(poll.options?.length || 0).fill(0);
                    const votes = voteCounts[index] || 0;
                    const percentage = getPercentage(votes, totalVotes);
                    const isWinner = winningOptions.includes(index);
                    
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.optionButton,
                          (hasVoted || status === 'ended') && styles.optionButtonDisabled,
                          isWinner && status === 'ended' && styles.winningOption
                        ]}
                        onPress={() => status === 'active' && !hasVoted && handleVote(poll.id, index)}
                        disabled={hasVoted || status === 'ended' || votingPollId === poll.id}
                      >
                        <View style={styles.optionContent}>
                          <View style={styles.optionRow}>
                            <Text style={[
                              styles.optionText,
                              (hasVoted || status === 'ended') && styles.optionTextDisabled
                            ]}>
                              {option}
                            </Text>
                            {isWinner && status === 'ended' && (
                              <Text style={styles.winnerEmoji}>🎉</Text>
                            )}
                          </View>
                          
                          {(hasVoted || status === 'ended') && (
                            <View style={styles.voteInfo}>
                              <Text style={styles.voteText}>
                                {votes} votes ({percentage}%)
                              </Text>
                              <View style={styles.progressBar}>
                                <View 
                                  style={[
                                    styles.progressFill,
                                    { 
                                      width: `${percentage}%`,
                                      backgroundColor: isWinner ? '#0088CC' : '#E0E0E0'
                                    }
                                  ]}
                                />
                              </View>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                
                {(hasVoted || status === 'ended') && (
                  <Text style={styles.totalVotesText}>
                    Total votes: {totalVotes}
                  </Text>
                )}
                
                {votingPollId === poll.id && (
                  <View style={styles.votingOverlay}>
                    <ActivityIndicator color="#0088CC" />
                    <Text style={styles.votingText}>Submitting vote...</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 50,
    paddingBottom: SPACING.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111111',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 13,
    color: '#888888',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: SPACING.xl * 2,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  pollCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  pollHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  pollQuestion: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    marginRight: SPACING.md,
    lineHeight: 24,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  activeBadge: {
    backgroundColor: '#4CAF50',
  },
  endedBadge: {
    backgroundColor: '#F44336',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  activeText: {
    color: '#fff',
  },
  endedText: {
    color: '#fff',
  },
  optionsContainer: {
    gap: SPACING.sm,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
  },
  optionButtonDisabled: {
    backgroundColor: COLORS.background,
  },
  winningOption: {
    borderColor: '#0088CC',
    borderWidth: 2,
  },
  optionContent: {
    gap: SPACING.sm,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    flex: 1,
  },
  optionTextDisabled: {
    color: COLORS.text,
  },
  winnerEmoji: {
    fontSize: 16,
    marginLeft: SPACING.sm,
  },
  voteInfo: {
    gap: SPACING.xs,
  },
  voteText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    minWidth: 2,
  },
  totalVotesText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  votingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  votingText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
});
