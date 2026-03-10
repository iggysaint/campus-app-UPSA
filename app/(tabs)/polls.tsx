import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { auth, db } from '@/lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addDoc, collection, doc, getDocs, limit,
  orderBy, query, runTransaction, serverTimestamp, where
} from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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

const SEEN_KEY = 'last_seen_polls';

// FIX: use start_date instead of created_at — polls don't have created_at
const markPollsSeen = async () => {
  try {
    const q = query(
      collection(db, 'polls'),
      where('is_active', '==', true),
      orderBy('start_date', 'desc'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const latest = snap.docs[0].data().start_date;
      const millis = latest?.toMillis?.();
      if (millis) {
        await AsyncStorage.setItem(SEEN_KEY, String(millis));
      }
    }
  } catch (e) {
    console.log('markPollsSeen failed:', e);
  }
};

const normalizePoll = (pollData: Poll): Poll => {
  const optionCount = pollData.options?.length || 0;
  if (!pollData.vote_counts || pollData.vote_counts.length !== optionCount) {
    pollData.vote_counts = new Array(optionCount).fill(0);
  }
  return pollData;
};

export default function PollsScreen() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [userVotes, setUserVotes] = useState<Record<string, number>>({});
  const [votingPollId, setVotingPollId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchPolls = useCallback(async () => {
    try {
      const q = query(collection(db, 'polls'), orderBy('start_date', 'desc'));
      const querySnapshot = await getDocs(q);
      const pollsData: Poll[] = [];
      querySnapshot.forEach((docSnap) => {
        pollsData.push(normalizePoll({ id: docSnap.id, ...docSnap.data() } as Poll));
      });
      setPolls(pollsData);
    } catch (e) {
      console.log('fetchPolls error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUserVotes = useCallback(async () => {
    try {
      if (!auth.currentUser) return;
      const votesQuery = query(
        collection(db, 'votes'),
        where('user_id', '==', auth.currentUser.uid)
      );
      const querySnapshot = await getDocs(votesQuery);
      const votedMap: Record<string, number> = {};
      querySnapshot.forEach((docSnap) => {
        const v = docSnap.data() as Vote;
        votedMap[v.poll_id] = v.option_index;
      });
      setUserVotes(votedMap);
    } catch (e) {
      console.log('loadUserVotes error:', e);
    }
  }, []);

  useEffect(() => {
    fetchPolls();
    loadUserVotes();
    markPollsSeen();

    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, [fetchPolls, loadUserVotes]);

  const handleVote = async (pollId: string, optionIndex: number) => {
    if (pollId in userVotes || votingPollId || !auth.currentUser) return;

    setVotingPollId(pollId);
    try {
      const pollRef = doc(db, 'polls', pollId);
      let newVoteCounts: number[] = [];

      await runTransaction(db, async (transaction) => {
        const pollDoc = await transaction.get(pollRef);
        if (!pollDoc.exists()) return;
        const data = pollDoc.data();
        const currentCounts = [...(data.vote_counts || [])];
        currentCounts[optionIndex] = (currentCounts[optionIndex] || 0) + 1;
        newVoteCounts = currentCounts;
        transaction.update(pollRef, { vote_counts: currentCounts });
      });

      setPolls(prev => prev.map(p =>
        p.id === pollId ? { ...p, vote_counts: newVoteCounts } : p
      ));

      await addDoc(collection(db, 'votes'), {
        poll_id: pollId,
        user_id: auth.currentUser!.uid,
        option_index: optionIndex,
        voted_at: serverTimestamp(),
      });

      setUserVotes(prev => ({ ...prev, [pollId]: optionIndex }));
    } catch (e) {
      console.log('handleVote error:', e);
    } finally {
      setVotingPollId(null);
    }
  };

  const getPollStatus = (poll: Poll) => {
    const now = currentTime;
    const startDate = poll.start_date?.toDate?.();
    const endDate = poll.end_date?.toDate?.();
    if (startDate && now < startDate) return 'upcoming';
    if (endDate && now > endDate) return 'ended';
    return poll.is_active ? 'active' : 'ended';
  };

  const getEndingLabel = (poll: Poll): string => {
    const endDate = poll.end_date?.toDate?.();
    if (!endDate) return '';
    const diffMs = endDate.getTime() - currentTime.getTime();
    if (diffMs <= 0) return '';
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffDays >= 1) return `Ends in ${diffDays}d`;
    if (diffHours >= 1) return `Ends in ${diffHours}h`;
    return 'Ends soon';
  };

  const getWinningOptions = (voteCounts: number[]) => {
    if (!voteCounts?.length) return [];
    const maxVotes = Math.max(...voteCounts);
    if (maxVotes === 0) return [];
    return voteCounts.map((count, i) => count === maxVotes ? i : -1).filter(i => i !== -1);
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
            const hasVoted = poll.id in userVotes;
            const userVoteIndex = userVotes[poll.id] ?? -1;
            const voteCounts = poll.vote_counts || new Array(poll.options?.length || 0).fill(0);
            const totalVotes = voteCounts.reduce((sum, count) => sum + (count || 0), 0);
            const winningOptions = getWinningOptions(voteCounts);
            const endingLabel = status === 'active' ? getEndingLabel(poll) : '';

            return (
              <View key={poll.id} style={styles.pollCard}>
                <View style={styles.pollHeader}>
                  <Text style={styles.pollQuestion}>{poll.question}</Text>
                  <View style={styles.badgeCol}>
                    <View style={[styles.statusBadge, status === 'active' ? styles.activeBadge : styles.endedBadge]}>
                      <Text style={styles.statusText}>
                        {status === 'active' ? 'Active' : 'Ended'}
                      </Text>
                    </View>
                    {endingLabel ? (
                      <Text style={styles.endingLabel}>{endingLabel}</Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.optionsContainer}>
                  {(poll.options ?? []).map((option, index) => {
                    const votes = voteCounts[index] || 0;
                    const percentage = getPercentage(votes, totalVotes);
                    const isWinner = winningOptions.includes(index);
                    const isUserVote = userVoteIndex === index;

                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.optionButton,
                          (hasVoted || status === 'ended') && styles.optionButtonDisabled,
                          isWinner && status === 'ended' && styles.winningOption,
                          isUserVote && styles.userVotedOption,
                        ]}
                        onPress={() => status === 'active' && !hasVoted && handleVote(poll.id, index)}
                        disabled={hasVoted || status === 'ended' || votingPollId === poll.id}
                      >
                        <View style={styles.optionContent}>
                          <View style={styles.optionRow}>
                            <Text style={styles.optionText}>{option}</Text>
                            <View style={styles.optionIcons}>
                              {isUserVote && (
                                <Text style={styles.yourVoteLabel}>Your vote</Text>
                              )}
                              {isWinner && status === 'ended' && (
                                <Text style={styles.winnerEmoji}>🎉</Text>
                              )}
                            </View>
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
                                      backgroundColor: isWinner ? '#0088CC' : '#E0E0E0',
                                    },
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
                  <Text style={styles.totalVotesText}>Total votes: {totalVotes}</Text>
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
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.lg, paddingTop: 50, paddingBottom: SPACING.sm },
  title: { fontSize: 18, fontWeight: '600', color: '#111111', marginBottom: SPACING.xs },
  subtitle: { fontSize: 13, color: '#888888' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: SPACING.xl * 2 },
  emptyText: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.sm },
  emptySubtext: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  pollCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: SPACING.lg, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, position: 'relative',
  },
  pollHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: SPACING.lg,
  },
  pollQuestion: {
    fontSize: 18, fontWeight: '600', color: COLORS.text,
    flex: 1, marginRight: SPACING.md, lineHeight: 24,
  },
  badgeCol: { alignItems: 'flex-end', gap: 4 },
  statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: RADIUS.sm },
  activeBadge: { backgroundColor: '#4CAF50' },
  endedBadge: { backgroundColor: '#F44336' },
  statusText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  endingLabel: { fontSize: 11, color: '#D97706', fontWeight: '500' },
  optionsContainer: { gap: SPACING.sm },
  optionButton: {
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.sm, padding: SPACING.md, backgroundColor: COLORS.background,
  },
  optionButtonDisabled: { backgroundColor: COLORS.background },
  winningOption: { borderColor: '#0088CC', borderWidth: 2 },
  userVotedOption: { backgroundColor: '#EAF5FD', borderColor: '#0088CC' },
  optionContent: { gap: SPACING.sm },
  optionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  optionText: { fontSize: 16, fontWeight: '500', color: COLORS.text, flex: 1 },
  optionIcons: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  yourVoteLabel: { fontSize: 11, color: '#0088CC', fontWeight: '600' },
  winnerEmoji: { fontSize: 16, marginLeft: SPACING.sm },
  voteInfo: { gap: SPACING.xs },
  voteText: { fontSize: 14, fontWeight: '500', color: COLORS.textSecondary },
  progressBar: { height: 6, backgroundColor: '#F0F0F0', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, minWidth: 2 },
  totalVotesText: { fontSize: 14, fontWeight: '500', color: COLORS.textSecondary, marginTop: SPACING.md, textAlign: 'center' },
  votingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: RADIUS.md,
    justifyContent: 'center', alignItems: 'center', gap: SPACING.sm,
  },
  votingText: { fontSize: 14, fontWeight: '500', color: COLORS.textSecondary },
});