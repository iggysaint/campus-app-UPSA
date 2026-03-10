import { RADIUS, SPACING } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { auth, db } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface UserProfile {
  name: string;
  email: string;
  role: string;
  programme: string;
  level: string;
  study_mode: string;
  gender: string;
  student_id?: string;
}

interface AppSettings {
  notifications: boolean;
}

const TELEGRAM_BUGS_LINK = 'https://t.me/+Lwwno9Ema4liNGNk';

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUserAgreementModal, setShowUserAgreementModal] = useState(false);
  const [showAcknowledgementsModal, setShowAcknowledgementsModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [sendingSupport, setSendingSupport] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [appSettings, setAppSettings] = useState<AppSettings>({
    notifications: true,
  });

  const fetchUserProfile = useCallback(async () => {
    try {
      if (!auth?.currentUser) return;
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data() as UserProfile);
      }
    } catch (e) {
      console.log('fetchUserProfile error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAppSettings = useCallback(async () => {
    try {
      const notifications = await AsyncStorage.getItem('notifications');
      setAppSettings({
        notifications: notifications !== 'false',
      });
    } catch (e) {
      console.log('loadAppSettings error:', e);
    }
  }, []);

  useEffect(() => {
    fetchUserProfile();
    loadAppSettings();
  }, [fetchUserProfile, loadAppSettings]);

  const toggleNotifications = async (value: boolean) => {
    try {
      setAppSettings(prev => ({ ...prev, notifications: value }));
      await AsyncStorage.setItem('notifications', value.toString());
    } catch (e) {
      console.log('toggleNotifications error:', e);
    }
  };

  const handleOpenTelegram = async () => {
    try {
      const supported = await Linking.canOpenURL(TELEGRAM_BUGS_LINK);
      if (supported) {
        await Linking.openURL(TELEGRAM_BUGS_LINK);
      } else {
        Alert.alert('Error', 'Unable to open Telegram. Please make sure Telegram is installed.');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open the Telegram channel.');
    }
  };

  const sendSupportMessage = async () => {
    if (sendingSupport) return;
    if (!supportMessage.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }
    if (!auth.currentUser) return;
    setSendingSupport(true);
    try {
      await addDoc(collection(db, 'support_messages'), {
        user_id: auth.currentUser.uid,
        message: supportMessage.trim(),
        created_at: serverTimestamp(),
      });
      setSupportMessage('');
      setShowSupportModal(false);
      Alert.alert('Success', 'Your message has been sent to the support team');
    } catch (e) {
      console.log('sendSupportMessage error:', e);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSendingSupport(false);
    }
  };

  const confirmDeleteAccount = async () => {
    if (deleting) return;
    if (!deletePassword) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }
    if (!auth.currentUser) return;
    setDeleting(true);
    try {
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email || '',
        deletePassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);
      await deleteDoc(doc(db, 'users', auth.currentUser.uid));
      await deleteUser(auth.currentUser);
      router.replace('/login');
    } catch (error: any) {
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        Alert.alert('Error', 'Incorrect password. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to delete account. Please try again.');
      }
    } finally {
      setDeleting(false);
      setDeletePassword('');
    }
  };

  const deleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', style: 'destructive', onPress: () => setShowDeleteModal(true) },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(w => w.charAt(0).toUpperCase()).join('').substring(0, 2);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#0088CC" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        // FIX: push content down so iPhone XR notch doesn't overlap
        contentContainerStyle={{ paddingTop: insets.top + 8 }}
      >

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(userProfile?.name)}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userProfile?.name || 'User'}</Text>
            <Text style={styles.userEmail}>{userProfile?.email || ''}</Text>
            <View style={[styles.roleBadge, userProfile?.role === 'admin' ? styles.adminBadge : styles.studentBadge]}>
              <Text style={styles.roleText}>
                {userProfile?.role === 'admin' ? 'Admin' : 'Student'}
              </Text>
            </View>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          {[
            { icon: 'school-outline', label: 'Programme', value: userProfile?.programme },
            { icon: 'layers-outline', label: 'Level', value: userProfile?.level },
            { icon: 'card-outline', label: 'Student ID', value: userProfile?.student_id },
            { icon: 'person-outline', label: 'Gender', value: userProfile?.gender },
            { icon: 'time-outline', label: 'Study Mode', value: userProfile?.study_mode },
          ].map((item, i) => (
            <View key={i} style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name={item.icon as any} size={20} color="#0088CC" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={styles.infoValue}>{item.value || 'Not specified'}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Administration */}
        {userProfile?.role === 'admin' && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>ADMINISTRATION</Text>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/admin')}>
              <View style={styles.actionIcon}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#0088CC" />
              </View>
              <Text style={styles.actionText}>Admin Dashboard</Text>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" style={styles.chevron} />
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>QUICK ACTIONS</Text>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/hostel')}>
            <View style={styles.actionIcon}>
              <Ionicons name="home-outline" size={20} color="#0088CC" />
            </View>
            <Text style={styles.actionText}>Hostel Booking</Text>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" style={styles.chevron} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/polls')}>
            <View style={styles.actionIcon}>
              <Ionicons name="stats-chart-outline" size={20} color="#0088CC" />
            </View>
            <Text style={styles.actionText}>Voting & Polls</Text>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" style={styles.chevron} />
          </TouchableOpacity>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>SETTINGS</Text>

          <TouchableOpacity style={styles.actionCard} onPress={() => setShowNotificationsModal(true)}>
            <View style={styles.actionIcon}>
              <Ionicons name="notifications-outline" size={20} color="#0088CC" />
            </View>
            <Text style={styles.actionText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" style={styles.chevron} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => setShowPrivacyModal(true)}>
            <View style={styles.actionIcon}>
              <Ionicons name="shield-outline" size={20} color="#0088CC" />
            </View>
            <Text style={styles.actionText}>Privacy & Security</Text>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" style={styles.chevron} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => setShowUserAgreementModal(true)}>
            <View style={styles.actionIcon}>
              <Ionicons name="document-text-outline" size={20} color="#0088CC" />
            </View>
            <Text style={styles.actionText}>User Agreement</Text>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" style={styles.chevron} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => setShowAcknowledgementsModal(true)}>
            <View style={styles.actionIcon}>
              <Ionicons name="ribbon-outline" size={20} color="#0088CC" />
            </View>
            <Text style={styles.actionText}>Acknowledgements</Text>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" style={styles.chevron} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => setShowSupportModal(true)}>
            <View style={styles.actionIcon}>
              <Ionicons name="help-circle-outline" size={20} color="#0088CC" />
            </View>
            <Text style={styles.actionText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" style={styles.chevron} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={handleOpenTelegram}>
            <View style={[styles.actionIcon, { backgroundColor: '#E8F4FD' }]}>
              <Ionicons name="bug-outline" size={20} color="#0088CC" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionText}>Campus Bugs</Text>
              <Text style={styles.actionSubtext}>Report issues on Telegram</Text>
            </View>
            <Ionicons name="open-outline" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionCard, styles.logoutCard]} onPress={handleSignOut}>
            <View style={[styles.actionIcon, styles.logoutIcon]}>
              <Ionicons name="log-out-outline" size={20} color="#FF4444" />
            </View>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionCard, styles.deleteAccountCard]} onPress={deleteAccount}>
            <View style={[styles.actionIcon, styles.deleteAccountIcon]}>
              <Ionicons name="trash-outline" size={20} color="#DC2626" />
            </View>
            <Text style={styles.deleteAccountText}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Campus App UPSA v1.0.0</Text>
      </ScrollView>

      {/* Notifications Modal */}
      <Modal visible={showNotificationsModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowNotificationsModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Notifications</Text>
            <TouchableOpacity onPress={() => setShowNotificationsModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingText}>Enable Notifications</Text>
                <Text style={styles.settingSubtext}>Receive push notifications</Text>
              </View>
              <Switch
                value={appSettings.notifications}
                onValueChange={toggleNotifications}
                trackColor={{ false: '#E0E0E0', true: '#0088CC' }}
                thumbColor="#fff"
              />
            </View>
          </View>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={() => setShowNotificationsModal(false)}>
              <Text style={styles.saveButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Privacy Modal */}
      <Modal visible={showPrivacyModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPrivacyModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Privacy & Security</Text>
            <TouchableOpacity onPress={() => setShowPrivacyModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.bodyText}>
              Your data is secure and encrypted. We use industry-standard security measures to protect your personal information and ensure your privacy is maintained at all times.
            </Text>
          </View>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={() => setShowPrivacyModal(false)}>
              <Text style={styles.saveButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* User Agreement Modal */}
      <Modal visible={showUserAgreementModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowUserAgreementModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>User Agreement</Text>
            <TouchableOpacity onPress={() => setShowUserAgreementModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.agreementHeading}>Terms of Use</Text>
            <Text style={styles.bodyText}>
              By using the UPSA Campus App, you agree to use it responsibly and in accordance with university policies. This app is intended solely for students and staff of the University of Professional Studies, Accra (UPSA).
            </Text>
            <Text style={styles.agreementHeading}>Acceptable Use</Text>
            <Text style={styles.bodyText}>
              You agree not to misuse the app, share false information, or engage in any activity that could harm other users or the university. Abuse of the platform may result in account suspension.
            </Text>
            <Text style={styles.agreementHeading}>Data & Privacy</Text>
            <Text style={styles.bodyText}>
              We collect only the information necessary to provide app functionality. Your data is never sold to third parties. You can request account deletion at any time from the Settings section.
            </Text>
            <Text style={styles.agreementHeading}>Changes to Agreement</Text>
            <Text style={styles.bodyText}>
              This agreement may be updated periodically. Continued use of the app constitutes acceptance of any changes. You will be notified of significant updates.
            </Text>
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={() => setShowUserAgreementModal(false)}>
              <Text style={styles.saveButtonText}>I Understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Acknowledgements Modal */}
      <Modal visible={showAcknowledgementsModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAcknowledgementsModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Acknowledgements</Text>
            <TouchableOpacity onPress={() => setShowAcknowledgementsModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.bodyText}>
              The UPSA Campus App was built with the goal of improving student life and campus experience at the University of Professional Studies, Accra.
            </Text>
            <Text style={styles.agreementHeading}>Built With</Text>
            <Text style={styles.bodyText}>
              This app was developed using React Native, Expo, Firebase, and a range of open source libraries. We are grateful to the open source community for making tools like these available.
            </Text>
            <Text style={styles.agreementHeading}>Special Thanks</Text>
            <Text style={styles.bodyText}>
              Special thanks to the UPSA student body, faculty, and administration for their support and feedback during the development of this app.
            </Text>
            <Text style={styles.agreementHeading}>Version</Text>
            <Text style={styles.bodyText}>Campus App UPSA v1.0.0</Text>
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={() => setShowAcknowledgementsModal(false)}>
              <Text style={styles.saveButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Support Modal */}
      <Modal visible={showSupportModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowSupportModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Help & Support</Text>
            <TouchableOpacity onPress={() => setShowSupportModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.inputLabel}>Message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={supportMessage}
              onChangeText={(text) => setSupportMessage(text.trimStart())}
              placeholder="Describe your issue or question..."
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={500}
              editable={!sendingSupport}
            />
          </View>
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowSupportModal(false)}
              disabled={sendingSupport}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton, sendingSupport && { opacity: 0.6 }]}
              onPress={sendSupportMessage}
              disabled={sendingSupport}
            >
              <Text style={styles.saveButtonText}>{sendingSupport ? 'Sending...' : 'Send'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal visible={showDeleteModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setShowDeleteModal(false); setDeletePassword(''); }}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <TouchableOpacity onPress={() => { setShowDeleteModal(false); setDeletePassword(''); }}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.bodyText}>
              This will permanently delete your account and all your data. This cannot be undone.
            </Text>
            <Text style={[styles.inputLabel, { marginTop: 20 }]}>Enter your password to confirm</Text>
            <TextInput
              style={styles.input}
              value={deletePassword}
              onChangeText={setDeletePassword}
              placeholder="Your password"
              secureTextEntry
              autoCapitalize="none"
              editable={!deleting}
            />
          </View>
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => { setShowDeleteModal(false); setDeletePassword(''); }}
              disabled={deleting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: '#DC2626' }, deleting && { opacity: 0.6 }]}
              onPress={confirmDeleteAccount}
              disabled={deleting}
            >
              <Text style={styles.saveButtonText}>{deleting ? 'Deleting...' : 'Delete'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileHeader: {
    backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center',
    padding: SPACING.md, marginBottom: SPACING.sm,
  },
  avatar: {
    width: 70, height: 70, borderRadius: 35, backgroundColor: '#0088CC',
    justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md,
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 2 },
  userEmail: { fontSize: 12, color: '#666', marginBottom: SPACING.xs },
  roleBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.sm, alignSelf: 'flex-start' },
  adminBadge: { backgroundColor: '#FF4444' },
  studentBadge: { backgroundColor: '#0088CC' },
  roleText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  infoCard: {
    backgroundColor: '#fff', margin: SPACING.md, borderRadius: RADIUS.md,
    padding: SPACING.md, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  infoIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#EAF5FD',
    justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md,
  },
  infoTextContainer: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#666', marginBottom: 2 },
  infoValue: { fontSize: 14, color: '#000', fontWeight: '600' },
  section: { marginTop: SPACING.sm, paddingHorizontal: SPACING.md },
  sectionHeader: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: SPACING.sm },
  actionCard: {
    backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center',
    padding: SPACING.md, marginBottom: SPACING.sm, borderRadius: RADIUS.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
  },
  actionIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#EAF5FD',
    justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md,
  },
  actionText: { fontSize: 16, color: '#000', fontWeight: '500', flex: 1 },
  actionSubtext: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  chevron: { marginLeft: 'auto' },
  logoutCard: { backgroundColor: '#FDEAEA' },
  logoutIcon: { backgroundColor: '#FDEAEA' },
  logoutText: { fontSize: 16, fontWeight: '500', color: '#FF4444', flex: 1 },
  deleteAccountCard: { backgroundColor: '#FEE2E2' },
  deleteAccountIcon: { backgroundColor: '#FEE2E2' },
  deleteAccountText: { color: '#DC2626', fontSize: 16, fontWeight: '500', flex: 1 },
  footer: { fontSize: 12, color: '#999', textAlign: 'center', padding: SPACING.lg, marginTop: SPACING.md },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingTop: 60, paddingBottom: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: '#E0E0E0',
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#000' },
  modalContent: { flex: 1, padding: SPACING.lg },
  inputLabel: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: SPACING.sm },
  input: {
    height: 48, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md, fontSize: 16, color: '#000', backgroundColor: '#fff',
  },
  textArea: { height: 120, textAlignVertical: 'top' },
  settingRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: SPACING.md,
  },
  settingText: { fontSize: 16, color: '#000', fontWeight: '500' },
  settingSubtext: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  bodyText: { fontSize: 15, color: '#444', lineHeight: 24, marginBottom: SPACING.md },
  agreementHeading: { fontSize: 16, fontWeight: '700', color: '#000', marginTop: SPACING.md, marginBottom: SPACING.xs },
  modalFooter: { flexDirection: 'row', paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl, gap: SPACING.md },
  modalButton: { flex: 1, height: 48, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  cancelButton: { backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: '#E0E0E0' },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#666' },
  saveButton: { backgroundColor: '#0088CC' },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
