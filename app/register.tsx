import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { auth, db } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, deleteUser, sendEmailVerification } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const PROGRAMMES = {
  DIPLOMA: [
    'Diploma in Accounting',
    'Diploma in Marketing',
    'Diploma in Management',
    'Diploma in Public Relations Management',
    'Diploma in Information Technology Management',
  ],
  UNDERGRADUATE: [
    'Bachelor of Science in Accounting',
    'Bachelor of Science in Accounting and Finance',
    'Bachelor of Science in Banking and Finance',
    'Bachelor of Science in Marketing',
    'Bachelor of Science in Logistics and Transport Management',
    'Bachelor of Science in Real Estate Management and Finance',
    'Bachelor of Business Administration (BBA)',
    'Bachelor of Arts in Public Relations Management',
    'Bachelor of Arts in Communication Studies',
    'Bachelor of Laws (LLB)',
    'Bachelor of Science in Data Science and Analytics',
    'Bachelor of Science in Applied Statistics',
  ],
  POSTGRADUATE: [
    'MBA in Auditing',
    'MBA in Corporate Governance',
    'MBA in Finance and Accounting',
    'MBA in Marketing',
    'MBA in Business Management',
    'MPhil in Accounting',
    'MPhil in Finance',
    'MPhil in Marketing',
    'MSc in Applied Statistics',
    'LLM in Competition and Consumer Protection Law',
    'LLM in International Business and Commercial Law',
    'MA in Peace, Security & Intelligence Management',
    'PhD in Management',
    'PhD in Marketing',
    'PhD in Accounting',
  ],
  PROFESSIONAL: [
    'ICAG',
    'ACCA',
    'CIMA',
    'CIM',
  ],
};

const STUDY_MODES = ['Full-time', 'Evening', 'Weekend', 'Distance'];
const LEVELS = ['Level 100', 'Level 200', 'Level 300', 'Level 400', 'Postgraduate', 'Professional'];

export default function RegisterScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showProgrammeModal, setShowProgrammeModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [programme, setProgramme] = useState('');
  const [studyMode, setStudyMode] = useState('');
  const [level, setLevel] = useState('');
  const [programmeSearch, setProgrammeSearch] = useState('');
  const [customProgramme, setCustomProgramme] = useState('');

  // FIX #2: Stronger email validation — prevents subdomain bypass like fake@upsamail.edu.gh.hacker.com
  const validateEmail = (email: string) => {
    const allowedDomains = ['@upsamail.edu.gh', '@upsa.edu.gh', '@gmail.com'];
    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) return false;
    return allowedDomains.some(domain => trimmed.endsWith(domain));
  };

  // FIX #10: extractStudentId returns null instead of empty string for non-numeric emails
  const extractStudentId = (email: string) => {
    const match = email.match(/^(\d+)@/);
    return match ? match[1] : null;
  };

  const getAllProgrammes = () => {
    const allProgrammes = [
      ...PROGRAMMES.DIPLOMA,
      ...PROGRAMMES.UNDERGRADUATE,
      ...PROGRAMMES.POSTGRADUATE,
      ...PROGRAMMES.PROFESSIONAL,
    ];
    if (programmeSearch) {
      return allProgrammes.filter(p =>
        p.toLowerCase().includes(programmeSearch.toLowerCase())
      );
    }
    return allProgrammes;
  };

  const handleProgrammeSelect = (selectedProgramme: string) => {
    setProgramme(selectedProgramme);
    setShowProgrammeModal(false);
    setProgrammeSearch('');
    setCustomProgramme('');
  };

  // FIX #9: Button disabled when form is incomplete
  const isButtonDisabled =
    loading ||
    !fullName.trim() ||
    !email.trim() ||
    password.length < 8 ||
    !gender ||
    !studyMode ||
    !level ||
    (!programme.trim() && !customProgramme.trim());

  const handleSubmit = async () => {
    // FIX #1: Race condition guard — prevent double tap
    if (loading) return;

    // Validation
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please use your UPSA email address (@upsamail.edu.gh or @upsa.edu.gh)');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }
    if (!gender) {
      Alert.alert('Error', 'Please select your gender');
      return;
    }
    if (!programme.trim() && !customProgramme.trim()) {
      Alert.alert('Error', 'Please select or enter your programme');
      return;
    }
    if (!studyMode) {
      Alert.alert('Error', 'Please select your study mode');
      return;
    }
    if (!level) {
      Alert.alert('Error', 'Please select your academic level');
      return;
    }

    setLoading(true);
    let user = null;

    try {
      // Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      user = userCredential.user;

      // Send verification email
      await sendEmailVerification(user);

      const finalProgramme = customProgramme.trim() || programme.trim();
      const studentId = extractStudentId(email);

      // FIX #3 + #7: Role is always 'student' on signup.
      // Admin role must be manually set in Firestore by a super-admin.
      await setDoc(doc(db, 'users', user.uid), {
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        role: 'student',
        student_id: studentId, // FIX #10: null for non-numeric emails
        gender: gender,
        programme: finalProgramme,
        study_mode: studyMode,
        level: level,
        created_at: serverTimestamp(),
      });

      router.push('/verify-email');
    } catch (error: any) {
      // FIX #4: If setDoc fails after auth account created, delete the auth account
      // to prevent broken state (auth account exists but no Firestore document)
      if (user && error.code !== 'auth/email-already-in-use') {
        try {
          await deleteUser(user);
        } catch (deleteError) {
          console.error('Failed to clean up auth account after setDoc failure:', deleteError);
        }
      }

      // FIX #5: Network error handling + friendly messages
      let errorMessage = 'Failed to create account. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 8 characters.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'No internet connection. Please check your network and try again.';
      }

      Alert.alert('Signup failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join UPSA Campus App</Text>

          {/* Full Name */}
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            placeholderTextColor={COLORS.textSecondary}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            autoComplete="name"
            editable={!loading}
          />

          {/* Email */}
          <Text style={styles.label}>UPSA Email</Text>
          {/* FIX #7: Trim email on change */}
          <TextInput
            style={styles.input}
            placeholder="your.email@upsamail.edu.gh"
            placeholderTextColor={COLORS.textSecondary}
            value={email}
            onChangeText={(text) => setEmail(text.trim().toLowerCase())}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!loading}
          />

          {/* Password */}
          {/* FIX #8: Password visibility toggle added */}
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Min 8 characters"
              placeholderTextColor={COLORS.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
              disabled={loading}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Gender */}
          <Text style={styles.label}>Gender</Text>
          <View style={styles.genderContainer}>
            <TouchableOpacity
              style={[styles.genderButton, gender === 'male' && styles.genderButtonSelected]}
              onPress={() => setGender('male')}
              disabled={loading}
            >
              <Text style={[styles.genderButtonText, gender === 'male' && styles.genderButtonTextSelected]}>
                Male
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.genderButton, gender === 'female' && styles.genderButtonSelected]}
              onPress={() => setGender('female')}
              disabled={loading}
            >
              <Text style={[styles.genderButtonText, gender === 'female' && styles.genderButtonTextSelected]}>
                Female
              </Text>
            </TouchableOpacity>
          </View>

          {/* Programme */}
          <Text style={styles.label}>Programme</Text>
          <TouchableOpacity
            style={styles.programmeButton}
            onPress={() => setShowProgrammeModal(true)}
            disabled={loading}
          >
            <Text style={[
              styles.programmeButtonText,
              !(customProgramme || programme) && { color: COLORS.textSecondary }
            ]}>
              {customProgramme || programme || 'Select your programme'}
            </Text>
            <Text style={styles.programmeButtonArrow}>▼</Text>
          </TouchableOpacity>

          {/* Study Mode */}
          <Text style={styles.label}>Study Mode</Text>
          <View style={styles.pillsContainer}>
            {STUDY_MODES.map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.pill, studyMode === mode && styles.pillSelected]}
                onPress={() => setStudyMode(mode)}
                disabled={loading}
              >
                <Text style={[styles.pillText, studyMode === mode && styles.pillTextSelected]}>
                  {mode}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Level */}
          <Text style={styles.label}>Level</Text>
          <View style={styles.pillsContainer}>
            {LEVELS.map((lvl) => (
              <TouchableOpacity
                key={lvl}
                style={[styles.pill, level === lvl && styles.pillSelected]}
                onPress={() => setLevel(lvl)}
                disabled={loading}
              >
                <Text style={[styles.pillText, level === lvl && styles.pillTextSelected]}>
                  {lvl}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* FIX #9: Button disabled when form incomplete */}
          <TouchableOpacity
            style={[styles.createButton, isButtonDisabled && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isButtonDisabled}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/login')}
            disabled={loading}
          >
            <Text style={styles.backButtonText}>Already have an account? Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Programme Selection Modal */}
      <Modal
        visible={showProgrammeModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProgrammeModal(false)}
      >
        {/* FIX #6: KeyboardAvoidingView inside modal so keyboard doesn't cover input */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Programme</Text>
              <TouchableOpacity onPress={() => setShowProgrammeModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Search programmes..."
              placeholderTextColor={COLORS.textSecondary}
              value={programmeSearch}
              onChangeText={setProgrammeSearch}
            />

            <ScrollView style={styles.programmeList}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>DIPLOMA</Text>
                {PROGRAMMES.DIPLOMA.filter(p => !programmeSearch || p.toLowerCase().includes(programmeSearch.toLowerCase())).map((prog) => (
                  <TouchableOpacity key={prog} style={styles.programmeItem} onPress={() => handleProgrammeSelect(prog)}>
                    <Text style={styles.programmeItemText}>{prog}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>UNDERGRADUATE</Text>
                {PROGRAMMES.UNDERGRADUATE.filter(p => !programmeSearch || p.toLowerCase().includes(programmeSearch.toLowerCase())).map((prog) => (
                  <TouchableOpacity key={prog} style={styles.programmeItem} onPress={() => handleProgrammeSelect(prog)}>
                    <Text style={styles.programmeItemText}>{prog}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>POSTGRADUATE</Text>
                {PROGRAMMES.POSTGRADUATE.filter(p => !programmeSearch || p.toLowerCase().includes(programmeSearch.toLowerCase())).map((prog) => (
                  <TouchableOpacity key={prog} style={styles.programmeItem} onPress={() => handleProgrammeSelect(prog)}>
                    <Text style={styles.programmeItemText}>{prog}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>PROFESSIONAL</Text>
                {PROGRAMMES.PROFESSIONAL.filter(p => !programmeSearch || p.toLowerCase().includes(programmeSearch.toLowerCase())).map((prog) => (
                  <TouchableOpacity key={prog} style={styles.programmeItem} onPress={() => handleProgrammeSelect(prog)}>
                    <Text style={styles.programmeItemText}>{prog}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.programmeItem}
                onPress={() => handleProgrammeSelect('')}
              >
                <Text style={styles.programmeItemText}>Other (type yours)</Text>
              </TouchableOpacity>
            </ScrollView>

            {!programme && (
              <View style={styles.customProgrammeContainer}>
                <Text style={styles.label}>Enter Custom Programme</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your programme name"
                  placeholderTextColor={COLORS.textSecondary}
                  value={customProgramme}
                  onChangeText={setCustomProgramme}
                  autoCapitalize="words"
                />
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 60,
    paddingBottom: 40,
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
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  passwordContainer: {
    position: 'relative',
    width: '100%',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  genderButton: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#0088CC',
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  genderButtonSelected: {
    backgroundColor: '#0088CC',
    borderColor: '#0088CC',
  },
  genderButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0088CC',
  },
  genderButtonTextSelected: {
    color: '#fff',
  },
  programmeButton: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  programmeButtonText: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  programmeButtonArrow: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  pill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: '#0088CC',
    borderRadius: RADIUS.lg,
    backgroundColor: '#fff',
  },
  pillSelected: {
    backgroundColor: '#0088CC',
    borderColor: '#0088CC',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0088CC',
  },
  pillTextSelected: {
    color: '#fff',
  },
  createButton: {
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  backButton: {
    alignItems: 'center',
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: 60,
    paddingBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalClose: {
    fontSize: 24,
    color: COLORS.textSecondary,
  },
  searchInput: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  programmeList: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  programmeItem: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  programmeItemText: {
    fontSize: 16,
    color: COLORS.text,
  },
  customProgrammeContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
});
