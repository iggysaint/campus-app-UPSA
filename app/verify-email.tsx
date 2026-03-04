import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { auth } from '@/lib/firebase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { reload, sendEmailVerification, signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string || '';
  
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    checkEmailVerification();
  }, []);

  const checkEmailVerification = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace('/login');
        return;
      }

      // Reload user to get latest email verification status
      await reload(user);
      
      if (user.emailVerified) {
        setVerified(true);
        setChecking(false);
      } else {
        setVerified(false);
        setChecking(false);
      }
    } catch (error) {
      console.error('Error checking email verification:', error);
      setChecking(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (user) {
        await sendEmailVerification(user);
        Alert.alert(
          'Email Sent',
          'A new verification email has been sent to your inbox.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        'Failed to resend verification email. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerified = () => {
    router.replace('/(tabs)');
  };

  const handleBackToLogin = async () => {
    try {
      await signOut(auth);
      router.replace('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      router.replace('/login');
    }
  };

  if (checking) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.checkingText}>Checking email verification status...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>✉</Text>
        </View>
        
        <Text style={styles.title}>Verify Your Email</Text>
        
        <Text style={styles.message}>
          We sent a verification link to{' '}
          <Text style={styles.emailText}>{email}</Text>
        </Text>
        
        <Text style={styles.instruction}>
          Check your inbox and click the link to verify your account.
        </Text>

        {verified ? (
          <View style={styles.verifiedContainer}>
            <Text style={styles.verifiedIcon}>✓</Text>
            <Text style={styles.verifiedText}>Email verified successfully!</Text>
          </View>
        ) : (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              Status: Awaiting verification
            </Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          {verified ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleVerified}
            >
              <Text style={styles.primaryButtonText}>Continue to App</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleResendVerification}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Resend Verification Email</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={checkEmailVerification}
              >
                <Text style={styles.secondaryButtonText}>I've Verified My Email</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackToLogin}
        >
          <Text style={styles.backButtonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    paddingBottom: 40,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  icon: {
    fontSize: 40,
    color: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  message: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.md,
    lineHeight: 24,
  },
  emailText: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  instruction: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 20,
  },
  statusContainer: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.xl,
  },
  statusText: {
    fontSize: 14,
    color: '#D97706',
    fontWeight: '500',
  },
  verifiedContainer: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedIcon: {
    fontSize: 20,
    color: '#10B981',
    fontWeight: 'bold',
    marginRight: SPACING.sm,
  },
  verifiedText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  checkingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  buttonContainer: {
    width: '100%',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
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
  secondaryButton: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  backButton: {
    alignItems: 'center',
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '500',
  },
});
