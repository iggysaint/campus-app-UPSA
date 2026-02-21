import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/Card';
import { COLORS, SPACING } from '@/constants/theme';

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.text}>{profile?.email}</Text>
        <Text style={styles.role}>Role: {profile?.role ?? 'student'}</Text>
      </Card>
      <TouchableOpacity style={styles.signOut} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.lg },
  card: { marginBottom: SPACING.lg },
  title: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.sm },
  text: { fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  role: { fontSize: 14, color: COLORS.textSecondary },
  signOut: {
    height: 48,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signOutText: { color: COLORS.error, fontSize: 16, fontWeight: '600' },
});
