import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { db } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Schedule {
  id: string;
  course_name: string;
  course_code: string;
  day: string;
  start_time: string;
  end_time: string;
  venue: string;
  lecturer: string;
  level: string;
  programme?: string;
  study_mode?: string;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const FULL_DAYS: Record<string, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday'
};
const LEVELS = ['All', 'Level 100', 'Level 200', 'Level 300', 'Level 400'];

export default function ScheduleScreen() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date().getDay();
    const dayIndex = today === 0 || today === 6 ? 0 : today - 1;
    return DAYS[dayIndex];
  });
  const [selectedLevel, setSelectedLevel] = useState('All');

  const fetchSchedules = useCallback(async () => {
    const fullDay = FULL_DAYS[selectedDay];
    if (!fullDay) return;

    setError(false);
    try {
      const constraints: any[] = [where('day', '==', fullDay)];
      if (selectedLevel !== 'All') {
        constraints.push(where('level', '==', selectedLevel));
      }

      const q = query(collection(db, 'schedules'), ...constraints);
      const querySnapshot = await getDocs(q);
      const data: Schedule[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Schedule);
      });

      data.sort((a, b) =>
        (a.start_time || '').localeCompare(b.start_time || '')
      );

      setSchedules(data);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDay, selectedLevel]);

  useEffect(() => {
    if (!refreshing) {
      setLoading(true);
      fetchSchedules();
    }
  }, [fetchSchedules]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSchedules();
  }, [fetchSchedules]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Schedule</Text>
        <Text style={styles.subtitle}>Your class timetable</Text>
      </View>

      {/* Day Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dayTabsContainer}
        contentContainerStyle={styles.dayTabsContent}
      >
        {DAYS.map((day) => (
          <TouchableOpacity
            key={day}
            style={[styles.dayTab, selectedDay === day && styles.dayTabSelected]}
            onPress={() => setSelectedDay(day)}
          >
            <Text style={[styles.dayTabText, selectedDay === day && styles.dayTabTextSelected]}>
              {day}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Level Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.levelTabsContainer}
        contentContainerStyle={styles.levelTabsContent}
      >
        {LEVELS.map((level) => (
          <TouchableOpacity
            key={level}
            style={[styles.levelTab, selectedLevel === level && styles.levelTabSelected]}
            onPress={() => setSelectedLevel(level)}
          >
            <Text style={[styles.levelTabText, selectedLevel === level && styles.levelTabTextSelected]}>
              {level}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#0088CC" />
          </View>
        ) : error ? (
          <View style={styles.emptyState}>
            <Ionicons name="cloud-offline-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>Unable to load schedule</Text>
            <Text style={styles.emptySubtext}>Pull down to retry</Text>
          </View>
        ) : schedules.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No classes</Text>
            <Text style={styles.emptySubtext}>
              No classes scheduled for {FULL_DAYS[selectedDay]}
              {selectedLevel !== 'All' ? ` · ${selectedLevel}` : ''}
            </Text>
          </View>
        ) : (
          schedules.map((schedule) => (
            <View key={schedule.id} style={styles.scheduleCard}>
              <View style={styles.topRow}>
                <Text style={styles.programmeText} numberOfLines={1}>
                  {schedule.programme || schedule.course_code}
                </Text>
                <View style={styles.timePill}>
                  <Text style={styles.timePillText}>
                    {schedule.start_time || 'TBA'} - {schedule.end_time || 'TBA'}
                  </Text>
                </View>
              </View>
              <View style={styles.middleSection}>
                <Text style={styles.courseName} numberOfLines={2}>
                  {schedule.course_name}
                </Text>
                <Text style={styles.courseCodeText}>{schedule.course_code}</Text>
              </View>
              <View style={styles.bottomRow}>
                <View style={styles.detailsLeft}>
                  <View style={styles.iconRow}>
                    <Ionicons name="location-outline" size={14} color="#888888" />
                    <Text style={styles.venueText}>{schedule.venue || 'TBA'}</Text>
                  </View>
                  <View style={styles.iconRow}>
                    <Ionicons name="person-outline" size={14} color="#888888" />
                    <Text style={styles.lecturerText}>{schedule.lecturer || 'TBA'}</Text>
                  </View>
                </View>
                <View style={styles.badgesRight}>
                  {schedule.level ? (
                    <View style={styles.levelPill}>
                      <Text style={styles.pillText}>{schedule.level}</Text>
                    </View>
                  ) : null}
                  {schedule.study_mode ? (
                    <View style={styles.studyModePill}>
                      <Text style={styles.pillText}>{schedule.study_mode}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          ))
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
  dayTabsContainer: { flexGrow: 0 },
  dayTabsContent: { paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  dayTab: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#0088CC',
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    minWidth: 60,
  },
  dayTabSelected: { backgroundColor: '#0088CC' },
  dayTabText: { fontSize: 14, fontWeight: '600', color: '#0088CC' },
  dayTabTextSelected: { color: '#fff' },
  levelTabsContainer: { flexGrow: 0, marginTop: SPACING.sm, marginBottom: SPACING.sm, maxHeight: 36 },
  levelTabsContent: { paddingHorizontal: SPACING.lg, alignItems: 'center' },
  levelTab: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#0088CC',
    marginRight: 6,
  },
  levelTabSelected: { backgroundColor: '#0088CC', borderColor: '#0088CC' },
  levelTabText: { fontSize: 11, fontWeight: '600', color: '#0088CC' },
  levelTabTextSelected: { color: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: SPACING.xl * 2 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl, paddingTop: SPACING.sm },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: SPACING.xl * 2 },
  emptyText: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.sm, marginTop: SPACING.sm },
  emptySubtext: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  scheduleCard: { backgroundColor: '#fff', borderRadius: 12, padding: 10, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  programmeText: { fontSize: 14, fontWeight: '600', color: '#111111', flex: 1, marginRight: 8 },
  timePill: { backgroundColor: '#EAF5FD', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  timePillText: { fontSize: 11, fontWeight: '500', color: '#0088CC' },
  middleSection: { marginBottom: 10 },
  courseName: { fontSize: 14, fontWeight: '600', color: '#111111', marginBottom: 2 },
  courseCodeText: { fontSize: 12, color: '#888888' },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailsLeft: { flex: 1 },
  iconRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 1 },
  venueText: { fontSize: 12, color: '#888888', marginLeft: 4 },
  lecturerText: { fontSize: 12, color: '#888888', marginLeft: 4 },
  badgesRight: { flexDirection: 'row', gap: 6 },
  levelPill: { backgroundColor: '#EAF5FD', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  studyModePill: { backgroundColor: '#EAF5FD', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  pillText: { fontSize: 10, fontWeight: '500', color: '#0088CC' },
});