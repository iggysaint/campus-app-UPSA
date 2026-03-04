import { RADIUS, SPACING } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { auth, db } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface UserProfile {
  full_name: string;
  email: string;
  role: string;
  programme: string;
  level: string;
  study_mode: string;
  gender: string;
  phone?: string;
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
  const [showEditPhoneModal, setShowEditPhoneModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [appSettings, setAppSettings] = useState<AppSettings>({
    darkMode: false,
    notifications: true,
  });
  const [editPhone, setEditPhone] = useState('');

  useEffect(() => {
    fetchUserProfile();
    loadAppSettings();
  }, []);

  const fetchUserProfile = async () => {
    try {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data() as UserProfile);
          setEditPhone(userDoc.data().phone || '');
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAppSettings = async () => {
    try {
      const darkMode = await AsyncStorage.getItem('darkMode');
      const notifications = await AsyncStorage.getItem('notifications');
      setAppSettings({
        darkMode: darkMode === 'true',
        notifications: notifications !== 'false',
      });
    } catch (error) {
      console.error('Error loading app settings:', error);
    }
  };

  const savePhone = async () => {
    try {
      if (auth.currentUser && userProfile) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          phone: editPhone.trim(),
        });
        setUserProfile({ ...userProfile, phone: editPhone.trim() });
        setShowEditPhoneModal(false);
        Alert.alert('Success', 'Phone number updated successfully');
      }
    } catch (error) {
      console.error('Error updating phone:', error);
      Alert.alert('Error', 'Failed to update phone number');
    }
  };

  const toggleDarkMode = async (value: boolean) => {
    try {
      setAppSettings(prev => ({ ...prev, darkMode: value }));
      await AsyncStorage.setItem('darkMode', value.toString());
    } catch (error) {
      console.error('Error saving dark mode setting:', error);
    }
  };

  const toggleNotifications = async (value: boolean) => {
    try {
      setAppSettings(prev => ({ ...prev, notifications: value }));
      await AsyncStorage.setItem('notifications', value.toString());
    } catch (error) {
      console.error('Error saving notifications setting:', error);
    }
  };

  const sendSupportMessage = async () => {
    try {
      if (!supportMessage.trim()) {
        Alert.alert('Error', 'Please enter a message');
        return;
      }

      if (auth.currentUser) {
        await addDoc(collection(db, 'support_messages'), {
          user_id: auth.currentUser.uid,
          message: supportMessage.trim(),
          created_at: new Date(),
        });
        setSupportMessage('');
        setShowSupportModal(false);
        Alert.alert('Success', 'Your message has been sent to the support team');
      }
    } catch (error) {
      console.error('Error sending support message:', error);
      Alert.alert('Error', 'Failed to send message');
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
            await signOut();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
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
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {userProfile?.full_name ? getInitials(userProfile.full_name) : 'U'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userProfile?.full_name || 'User'}</Text>
            <Text style={styles.userEmail}>{userProfile?.email || 'user@example.com'}</Text>
            <View style={[
              styles.roleBadge,
              userProfile?.role === 'admin' ? styles.adminBadge : styles.studentBadge
            ]}>
              <Text style={[
                styles.roleText,
                userProfile?.role === 'admin' ? styles.adminText : styles.studentText
              ]}>
                {userProfile?.role === 'admin' ? 'Admin' : 'Student'}
              </Text>
            </View>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="school-outline" size={20} color="#0088CC" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Programme</Text>
              <Text style={styles.infoValue}>{userProfile?.programme || 'Not specified'}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="card-outline" size={20} color="#0088CC" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Level</Text>
              <Text style={styles.infoValue}>{userProfile?.level || 'Not specified'}</Text>
            </View>
          </View>
        </View>

        {/* Administration Section */}
        {userProfile?.role === 'admin' && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>ADMINISTRATION</Text>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/admin')}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#0088CC" />
              </View>
              <Text style={styles.actionText}>Admin Dashboard</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>QUICK ACTIONS</Text>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/hostel')}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="home-outline" size={20} color="#0088CC" />
            </View>
            <Text style={styles.actionText}>Hostel Booking</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/polls')}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="stats-chart-outline" size={20} color="#0088CC" />
            </View>
            <Text style={styles.actionText}>Voting & Polls</Text>
          </TouchableOpacity>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>SETTINGS</Text>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => setShowNotificationsModal(true)}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="notifications-outline" size={20} color="#0088CC" />
            </View>
            <Text style={styles.actionText}>Notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => setShowPrivacyModal(true)}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="shield-outline" size={20} color="#0088CC" />
            </View>
            <Text style={styles.actionText}>Privacy & Security</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => setShowSupportModal(true)}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="help-circle-outline" size={20} color="#0088CC" />
            </View>
            <Text style={styles.actionText}>Help & Support</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionCard, styles.logoutCard]}
            onPress={handleSignOut}
          >
            <View style={[styles.actionIcon, styles.logoutIcon]}>
              <Ionicons name="log-out-outline" size={20} color="#FF4444" />
            </View>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>Campus App UPSA v1.0.0</Text>
      </ScrollView>

      {/* Edit Phone Modal */}
      <Modal
        visible={showEditPhoneModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditPhoneModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Phone Number</Text>
            <TouchableOpacity onPress={() => setShowEditPhoneModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
            />
          </View>
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowEditPhoneModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={savePhone}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Notifications Modal */}
      <Modal
        visible={showNotificationsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNotificationsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Notifications & Sounds</Text>
            <TouchableOpacity onPress={() => setShowNotificationsModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <View style={styles.settingRow}>
              <Text style={styles.settingText}>Enable Notifications</Text>
              <Switch
                value={appSettings.notifications}
                onValueChange={toggleNotifications}
                trackColor={{ false: '#E0E0E0', true: '#0088CC' }}
                thumbColor={'#fff'}
              />
            </View>
          </View>
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={() => setShowNotificationsModal(false)}
            >
              <Text style={styles.saveButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Privacy Modal */}
      <Modal
        visible={showPrivacyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Privacy & Security</Text>
            <TouchableOpacity onPress={() => setShowPrivacyModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.privacyText}>
              Your data is secure and encrypted. We use industry-standard security measures to protect your personal information and ensure your privacy is maintained at all times.
            </Text>
          </View>
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={() => setShowPrivacyModal(false)}
            >
              <Text style={styles.saveButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Support Modal */}
      <Modal
        visible={showSupportModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSupportModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Help & Support</Text>
            <TouchableOpacity onPress={() => setShowSupportModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.inputLabel}>Message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={supportMessage}
              onChangeText={setSupportMessage}
              placeholder="Describe your issue or question..."
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowSupportModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={sendSupportMessage}
            >
              <Text style={styles.saveButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    marginBottom: SPACING.sm,
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
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#666',
    marginBottom: SPACING.xs,
  },
  roleBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
  },
  adminBadge: {
    backgroundColor: '#FF4444',
  },
  studentBadge: {
    backgroundColor: '#0088CC',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  adminText: {
    color: '#fff',
  },
  studentText: {
    color: '#fff',
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: SPACING.md,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  infoItem: {
    alignItems: 'center',
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EAF5FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  infoIconText: {
    fontSize: 20,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
  },
  section: {
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
  },
  actionCard: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EAF5FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  actionIconText: {
    fontSize: 20,
  },
  actionText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  logoutCard: {
    backgroundColor: '#FDEAEA',
  },
  logoutIcon: {
    backgroundColor: '#FDEAEA',
  },
  logoutIconText: {
    color: '#FF4444',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FF4444',
  },
  footer: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    padding: SPACING.lg,
    marginTop: SPACING.md,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: 60,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  modalClose: {
    fontSize: 24,
    color: '#666',
  },
  modalContent: {
    flex: 1,
    padding: SPACING.lg,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: SPACING.sm,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  settingText: {
    fontSize: 16,
    color: '#000',
  },
  privacyText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    gap: SPACING.md,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#0088CC',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
