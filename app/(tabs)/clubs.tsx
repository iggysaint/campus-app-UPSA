import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@/components/ui/Card';
import { COLORS, SPACING } from '@/constants/theme';

export default function ClubsScreen() {
  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.title}>Clubs & Societies</Text>
        <Text style={styles.text}>Browse and join campus clubs here.</Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.lg },
  card: {},
  title: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.sm },
  text: { fontSize: 14, color: COLORS.textSecondary },
});
