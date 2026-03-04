import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { auth, db } from '@/lib/firebase';
import { RateLimitError } from '@/lib/rate-limit';
import { validateLoginCredentials } from '@/lib/validation';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function LoginScreen() {
  const { signInWithEmail } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async () => {
    const validation = validateLoginCredentials({ email, password });
    if (!validation.ok) {
      Alert.alert('Invalid credentials', validation.errors[0]);
      return;
    }

    setLoading(true);
    const { error } = await signInWithEmail(email.trim(), password);
    setLoading(false);
    if (error) {
      if (error instanceof RateLimitError) {
        Alert.alert('Too many attempts', error.message);
      } else {
        Alert.alert('Login failed', error.message);
      }
      return;
    }

    // Check email verification
    if (!auth.currentUser?.emailVerified && auth.currentUser) {
      try {
        // Check user role in Firestore
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const userRole = userDoc.data().role;
          
          if (userRole === 'admin') {
            // Allow admin users with unverified email
            router.replace('/(tabs)');
            return;
          } else {
            // Block students with unverified email
            await signOut(auth);
            Alert.alert('Email not verified', 'Please verify your email before logging in. Check your inbox and spam folder.');
            return;
          }
        } else {
          // User document doesn't exist, block login
          await signOut(auth);
          Alert.alert('Email not verified', 'Please verify your email before logging in. Check your inbox and spam folder.');
          return;
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        await signOut(auth);
        Alert.alert('Email not verified', 'Please verify your email before logging in. Check your inbox and spam folder.');
        return;
      }
    }

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

        <View style={styles.card}>
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
            style={[styles.signInButton, loading && styles.buttonDisabled]}
            onPress={handleEmailLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.signInButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.createAccountLink}
          onPress={() => router.push('/register')}
          disabled={loading}
        >
          <Text style={styles.createAccountText}>Create New Account</Text>
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
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    backgroundColor: COLORS.background,
  },
  signInButton: {
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  createAccountLink: {
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  createAccountText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '500',
  },
});
