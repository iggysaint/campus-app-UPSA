import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/Card';
import { COLORS, SPACING } from '@/constants/theme';

export default function HomeScreen() {
  const { profile } = useAuth();
  const name = profile?.full_name ?? profile?.email ?? 'Student';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Hello, {name}</Text>
      <Text style={styles.subtitle}>Welcome to UPSA Campus</Text>
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Quick links</Text>
        <Text style={styles.cardText}>Schedule, clubs, and library tabs are ready. Content coming soon.</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xl },
  greeting: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.xs },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, marginBottom: SPACING.lg },
  card: {},
  cardTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.sm },
  cardText: { fontSize: 14, color: COLORS.textSecondary },
});
