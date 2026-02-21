import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/Card';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';

export default function LoginScreen() {
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    const { error } = await signInWithEmail(email.trim(), password);
    setLoading(false);
    if (error) {
      Alert.alert('Login failed', error.message);
      return;
    }
    router.replace('/(tabs)');
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    setLoading(false);
    if (error) {
      Alert.alert('Google sign-in failed', error.message);
      return;
    }
    // OAuth opens browser; redirect will be handled by onAuthStateChange
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>UPSA Campus</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <Card style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={COLORS.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!loading}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={COLORS.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleEmailLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign in</Text>
            )}
          </TouchableOpacity>
        </Card>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={[styles.googleButton, loading && styles.buttonDisabled]}
          onPress={handleGoogleLogin}
          disabled={loading}
        >
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  card: {
    marginBottom: SPACING.lg,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
  },
  primaryButton: {
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  googleButton: {
    height: 48,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '500',
  },
});
