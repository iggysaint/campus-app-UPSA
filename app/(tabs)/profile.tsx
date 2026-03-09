import { RADIUS, SPACING } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { auth, db } from '@/lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

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
  darkMode: boolean;
  notifications: boolean;
}

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const router = useRouter();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [sendingSupport, setSendingSupport] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');

  const [appSettings, setAppSettings] = useState<AppSettings>({
    darkMode: false,
    notifications: true,
  });

  const fetchUserProfile = useCallback(async () => {
    try {
      if (!auth.currentUser) return;

      const userRef = doc(db, 'users', auth.currentUser.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        console.log('User document missing');
        return;
      }

      setUserProfile(snap.data() as UserProfile);
    } catch (e) {
      console.log('fetchUserProfile error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAppSettings = useCallback(async () => {
    try {
      const darkMode = await AsyncStorage.getItem('darkMode');
      const notifications = await AsyncStorage.getItem('notifications');

      setAppSettings({
        darkMode: darkMode === 'true',
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

  const toggleDarkMode = async (value: boolean) => {
    try {
      setAppSettings(prev => ({ ...prev, darkMode: value }));
      await AsyncStorage.setItem('darkMode', value.toString());
    } catch (e) {
      console.log('toggleDarkMode error:', e);
    }
  };

  const toggleNotifications = async (value: boolean) => {
    try {
      setAppSettings(prev => ({ ...prev, notifications: value }));
      await AsyncStorage.setItem('notifications', value.toString());
    } catch (e) {
      console.log('toggleNotifications error:', e);
    }
  };

  const sendSupportMessage = async () => {
    if (sendingSupport) return;

    const message = supportMessage.trim();

    if (!message) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    if (!auth.currentUser) return;

    setSendingSupport(true);

    try {
      await addDoc(collection(db, 'support_messages'), {
        user_id: auth.currentUser.uid,
        message,
        created_at: serverTimestamp(),
      });

      setSupportMessage('');
      setShowSupportModal(false);

      Alert.alert('Success', 'Your message has been sent to support.');
    } catch (e) {
      console.log('sendSupportMessage error:', e);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSendingSupport(false);
    }
  };

  const confirmDeleteAccount = async () => {
    if (deleting) return;

    const password = deletePassword.trim();

    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    if (!auth.currentUser || !auth.currentUser.email) return;

    setDeleting(true);

    try {
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        password
      );

      await reauthenticateWithCredential(auth.currentUser, credential);

      await deleteDoc(doc(db, 'users', auth.currentUser.uid));

      await deleteUser(auth.currentUser);

      router.replace('/login');

    } catch (error: any) {

      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        Alert.alert('Error', 'Incorrect password.');
      } else {
        console.log('deleteAccount error:', error);
        Alert.alert('Error', 'Failed to delete account. Please try again.');
      }

    } finally {
      setDeleting(false);
      setDeletePassword('');
      setShowDeleteModal(false);
    }
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
            try {
              await signOut();
              router.replace('/login');
            } catch (e) {
              console.log('signOut error:', e);
            }
          },
        },
      ]
    );
  };

  const deleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => setShowDeleteModal(true),
        },
      ]
    );
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';

    return name
      .split(' ')
      .map(w => w.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
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

      <ScrollView showsVerticalScrollIndicator={false}>

        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(userProfile?.name)}</Text>
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userProfile?.name ?? 'User'}</Text>
            <Text style={styles.userEmail}>{userProfile?.email ?? ''}</Text>

            <View style={[
              styles.roleBadge,
              userProfile?.role === 'admin' ? styles.adminBadge : styles.studentBadge,
            ]}>
              <Text style={styles.roleText}>
                {userProfile?.role === 'admin' ? 'Admin' : 'Student'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/hostel')}>
            <Text style={styles.actionText}>Hostel Booking</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/polls')}>
            <Text style={styles.actionText}>Voting & Polls</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => setShowNotificationsModal(true)}>
            <Text style={styles.actionText}>Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => setShowSupportModal(true)}>
            <Text style={styles.actionText}>Help & Support</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={handleSignOut}>
            <Text style={{ color: '#FF4444', fontWeight: '600' }}>Log Out</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteAccountCard} onPress={deleteAccount}>
            <Text style={{ color: '#DC2626', fontWeight: '600' }}>Delete Account</Text>
          </TouchableOpacity>

        </View>

      </ScrollView>

      <Modal visible={showNotificationsModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.settingRow}>
            <Text>Enable Notifications</Text>
            <Switch
              value={appSettings.notifications}
              onValueChange={toggleNotifications}
            />
          </View>

          <TouchableOpacity onPress={() => setShowNotificationsModal(false)}>
            <Text style={{ textAlign: 'center', marginTop: 40 }}>Done</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={showSupportModal} animationType="slide">
        <View style={styles.modalContainer}>

          <TextInput
            style={[styles.input, styles.textArea]}
            value={supportMessage}
            onChangeText={setSupportMessage}
            placeholder="Describe your issue..."
            multiline
            maxLength={500}
          />

          <TouchableOpacity
            onPress={sendSupportMessage}
            disabled={sendingSupport}
            style={[styles.saveButton, sendingSupport && { opacity: 0.6 }]}
          >
            <Text style={{ color: '#fff' }}>
              {sendingSupport ? 'Sending...' : 'Send'}
            </Text>
          </TouchableOpacity>

        </View>
      </Modal>

      <Modal visible={showDeleteModal} animationType="slide">
        <View style={styles.modalContainer}>

          <TextInput
            style={styles.input}
            value={deletePassword}
            onChangeText={setDeletePassword}
            placeholder="Enter password"
            secureTextEntry
          />

          <TouchableOpacity
            onPress={confirmDeleteAccount}
            disabled={deleting}
            style={[styles.deleteButton, deleting && { opacity: 0.6 }]}
          >
            <Text style={{ color: '#fff' }}>
              {deleting ? 'Deleting...' : 'Delete Account'}
            </Text>
          </TouchableOpacity>

        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({

  container: { flex: 1, backgroundColor: '#F5F5F5' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  profileHeader: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    padding: SPACING.md,
    alignItems: 'center',
  },

  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#0088CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },

  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },

  userInfo: { flex: 1 },

  userName: { fontSize: 16, fontWeight: '700' },

  userEmail: { fontSize: 12, color: '#666' },

  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
    alignSelf: 'flex-start'
  },

  adminBadge: { backgroundColor: '#FF4444' },

  studentBadge: { backgroundColor: '#0088CC' },

  roleText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  section: { padding: SPACING.md },

  actionCard: {
    backgroundColor: '#fff',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },

  actionText: { fontSize: 16 },

  deleteAccountCard: {
    backgroundColor: '#FEE2E2',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },

  modalContainer: {
    flex: 1,
    padding: SPACING.lg,
    backgroundColor: '#fff',
  },

  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: RADIUS.sm,
    padding: 12,
    marginBottom: 20,
  },

  textArea: {
    height: 120,
    textAlignVertical: 'top'
  },

  saveButton: {
    backgroundColor: '#0088CC',
    padding: 14,
    borderRadius: RADIUS.sm,
    alignItems: 'center'
  },

  deleteButton: {
    backgroundColor: '#DC2626',
    padding: 14,
    borderRadius: RADIUS.sm,
    alignItems: 'center'
  }

});
