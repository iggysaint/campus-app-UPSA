import { collection, deleteDoc, doc, getDocs, query } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '@/lib/firebase';

interface Schedule {
  id: string;
  course_code: string;
  day: string;
  start_time: string;
  programme: string;
}

export default function ClearSchedulesScreen() {
  const [loading, setLoading] = useState(false);
  const [duplicatesDeleted, setDuplicatesDeleted] = useState(0);

  const clearDuplicateSchedules = async () => {
    setLoading(true);
    setDuplicatesDeleted(0);

    try {
      // Fetch all schedules
      const q = query(collection(db, 'schedules'));
      const querySnapshot = await getDocs(q);
      
      const schedules: Schedule[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        schedules.push({
          id: doc.id,
          course_code: data.course_code || '',
          day: data.day || '',
          start_time: data.start_time || '',
          programme: data.programme || '',
        });
      });

      // Identify duplicates by course_code + day + start_time + programme
      const uniqueCombinations = new Map<string, string>(); // key -> documentId
      const duplicates: string[] = []; // documentIds to delete

      schedules.forEach((schedule) => {
        const key = `${schedule.course_code}_${schedule.day}_${schedule.start_time}_${schedule.programme}`;
        
        if (uniqueCombinations.has(key)) {
          // This is a duplicate, mark for deletion
          duplicates.push(schedule.id);
        } else {
          // First occurrence, keep this one
          uniqueCombinations.set(key, schedule.id);
        }
      });

      // Delete duplicates
      for (const docId of duplicates) {
        await deleteDoc(doc(db, 'schedules', docId));
        setDuplicatesDeleted(prev => prev + 1);
      }

      Alert.alert(
        'Success!',
        `Successfully deleted ${duplicatesDeleted} duplicate schedules. Kept ${uniqueCombinations.size} unique schedules.`
      );
    } catch (error) {
      console.error('Error clearing duplicates:', error);
      Alert.alert('Error', 'Failed to clear duplicate schedules. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Clear Duplicate Schedules</Text>
        <Text style={styles.subtitle}>
          This will identify and remove duplicate schedules based on course code, day, time, and programme combination.
        </Text>
        
        {duplicatesDeleted > 0 && !loading && (
          <Text style={styles.successText}>
            ✅ {duplicatesDeleted} duplicates deleted successfully!
          </Text>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={clearDuplicateSchedules}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.buttonText}>Clearing...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Clear Duplicate Schedules</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    maxWidth: 400,
    width: '100%',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  successText: {
    fontSize: 16,
    color: '#059669',
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },
  buttonDisabled: {
    backgroundColor: '#94A3B8',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
