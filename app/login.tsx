import { useAuth } from '@/lib/auth-context';
import { auth, db } from '@/lib/firebase';
import { RateLimitError } from '@/lib/rate-limit';
import { validateLoginCredentials } from '@/lib/validation';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { sendPasswordResetEmail, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
  const [showPassword, setShowPassword] = useState(false);

  // FIX #6: Extracted repeated sign-out + alert into one helper
  const logoutUnverified = async () => {
    await signOut(auth);
    Alert.alert(
      'Email not verified',
      'Please verify your email before logging in. Check your inbox and spam folder.'
    );
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address first.');
      return;
    }

    // FIX #1: Stronger email regex validation before sending reset
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert('Password Reset', 'Password reset email sent! Check your inbox.');
    } catch (error) {
      Alert.alert('Error', 'Failed to send password reset email. Please try again.');
    }
  };

  // FIX: Firebase error code → friendly message mapper
  const getFriendlyError = (error: any): string => {
    switch (error?.code) {
      case 'auth/user-not-found':
        return 'No account found with this email.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/invalid-credential':
        return 'Invalid email or password.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'No internet connection. Please check your network.';
      default:
        return error?.message || 'Login failed. Please try again.';
    }
  };

  const handleEmailLogin = async () => {
    // FIX: Race condition guard — prevent double tap
    if (loading) return;

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
        // FIX: Friendly Firebase error messages
        Alert.alert('Login failed', getFriendlyError(error));
      }
      return;
    }

    // Check email verification
    if (!auth.currentUser?.emailVerified && auth.currentUser) {
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const userRole = userDoc.data().role;
          if (userRole === 'admin') {
            router.replace('/(tabs)');
            return;
          } else {
            await logoutUnverified();
            return;
          }
        } else {
          await logoutUnverified();
          return;
        }
      } catch (error) {
        // FIX #8: Distinguish network errors from verification errors
        console.error('Error checking user role:', error);
        await signOut(auth);
        Alert.alert(
          'Connection error',
          'Could not connect to the server. Please check your internet connection and try again.'
        );
        return;
      }
    }

    router.replace('/(tabs)');
  };

  // FIX #3: Button disabled when fields empty or loading
  const isButtonDisabled = loading || !email.trim() || !password.trim();

  return (
    // FIX #2: ScrollView prevents keyboard covering inputs on small screens
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.title}>UPSA Campus</Text>

          <View style={styles.spacer} />

          {/* FIX #7: Trim email on change to prevent whitespace bugs */}
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#888888"
            value={email}
            onChangeText={(text) => setEmail(text.trim())}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!loading}
            returnKeyType="next"
          />

          {/* FIX #10: passwordContainer gets consistent bottom margin */}
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Password"
              placeholderTextColor="#888888"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
              editable={!loading}
              // FIX #4: Enter on password submits the form
              returnKeyType="go"
              onSubmitEditing={handleEmailLogin}
            />
            {/* FIX #5: Eye icon disabled while loading */}
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => !loading && setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#888888"
              />
            </TouchableOpacity>
          </View>

          {/* FIX #3: Button disabled + dimmed when fields empty */}
          <TouchableOpacity
            style={[styles.signInButton, isButtonDisabled && styles.buttonDisabled]}
            onPress={handleEmailLogin}
            disabled={isButtonDisabled}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.signInButtonText}>Log In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.forgotPasswordLink}
            onPress={handleForgotPassword}
            disabled={loading}
          >
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>

          <View style={styles.spacer} />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.spacer} />

          <View style={styles.createAccountContainer}>
            <Text style={styles.createAccountText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={styles.createAccountLink}>Create new account.</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 8,
    textAlign: 'center',
  },
  spacer: {
    height: 24,
  },
  input: {
    height: 52,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111111',
    borderWidth: 0,
    marginBottom: 16,
    width: '100%',
  },
  // FIX #10: passwordContainer has consistent margin via marginBottom
  passwordContainer: {
    position: 'relative',
    width: '100%',
    marginBottom: 0,
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  signInButton: {
    height: 52,
    backgroundColor: '#0088CC',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  forgotPasswordLink: {
    alignItems: 'center',
    marginBottom: 16,
  },
  forgotPasswordText: {
    color: '#0088CC',
    fontSize: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    paddingHorizontal: 16,
    color: '#888888',
    fontSize: 14,
  },
  createAccountContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  createAccountText: {
    color: '#666666',
    fontSize: 16,
    marginBottom: 4,
  },
  createAccountLink: {
    color: '#0088CC',
    fontSize: 16,
    fontWeight: '600',
  },
});
