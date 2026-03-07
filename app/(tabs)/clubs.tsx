import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { auth, db } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface Club {
  id: string;
  name: string;
  description: string;
  category: string;
  whatsapp_link: string;
  image_url?: string;
  member_count?: number;
}

interface EditClubForm {
  name: string;
  description: string;
  category: string;
  whatsapp_link: string;
  image_url: string;
  member_count: string;
}

export default function ClubsScreen() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);

  const [editForm, setEditForm] = useState<EditClubForm>({
    name: '',
    description: '',
    category: '',
    whatsapp_link: '',
    image_url: '',
    member_count: '',
  });

  useEffect(() => {
    fetchClubs();
    fetchUserRole();
  }, []);

  const fetchClubs = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'clubs'));

      const clubsData: Club[] = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Club, 'id'>),
      }));

      setClubs(clubsData);
    } catch (error) {
      console.error('Error fetching clubs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRole = async () => {
    try {
      if (!auth.currentUser) return;

      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserRole(userData?.role || null);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const handleJoinClub = (whatsappLink: string) => {
    if (!whatsappLink) {
      Alert.alert('Invalid Link', 'This club does not have a valid WhatsApp link.');
      return;
    }

    Linking.openURL(whatsappLink);
  };

  const openEditModal = (club?: Club | null) => {
    if (club) {
      setEditingClub(club);

      setEditForm({
        name: club.name || '',
        description: club.description || '',
        category: club.category || '',
        whatsapp_link: club.whatsapp_link || '',
        image_url: club.image_url || '',
        member_count: club.member_count?.toString() || '',
      });
    } else {
      setEditingClub(null);

      setEditForm({
        name: '',
        description: '',
        category: '',
        whatsapp_link: '',
        image_url: '',
        member_count: '',
      });
    }

    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingClub(null);

    setEditForm({
      name: '',
      description: '',
      category: '',
      whatsapp_link: '',
      image_url: '',
      member_count: '',
    });
  };

  const saveClub = async () => {
    if (!editForm.name.trim() || !editForm.description.trim()) {
      Alert.alert('Missing Information', 'Please fill in the club name and description.');
      return;
    }

    try {
      const clubData = {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        category: editForm.category.trim(),
        whatsapp_link: editForm.whatsapp_link.trim(),
        image_url: editForm.image_url.trim() || null,
        member_count: Number(editForm.member_count) || 0,
      };

      if (editingClub) {
        await updateDoc(doc(db, 'clubs', editingClub.id), clubData);

        setClubs((prev) =>
          prev.map((club) => (club.id === editingClub.id ? { ...club, ...clubData } : club))
        );
      } else {
        const docRef = await addDoc(collection(db, 'clubs'), clubData);

        setClubs((prev) => [...prev, { id: docRef.id, ...clubData }]);
      }

      closeEditModal();

      Alert.alert('Success', editingClub ? 'Club updated successfully' : 'Club created successfully');
    } catch (error) {
      console.error('Error saving club:', error);
      Alert.alert('Error', 'Failed to save club');
    }
  };

  const getCategoryInitial = (category?: string) => {
    return category ? category.charAt(0).toUpperCase() : '';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Clubs & Societies</Text>
          <Text style={styles.subtitle}>Join campus clubs and communities</Text>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#0088CC" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Clubs</Text>
        <Text style={styles.subtitle}>Browse and join campus clubs here</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {clubs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No clubs yet</Text>
            <Text style={styles.emptySubtext}>Check back later for new clubs</Text>
          </View>
        ) : (
          clubs.map((club) => (
            <View key={club.id} style={styles.clubCard}>
              <View style={styles.imageContainer}>
                {club.image_url ? (
                  <Image source={{ uri: club.image_url }} style={styles.clubImage} />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Text style={styles.placeholderText}>
                      {getCategoryInitial(club.category)}
                    </Text>
                  </View>
                )}

                {userRole === 'admin' && (
                  <TouchableOpacity
                    style={styles.editIconOverlay}
                    onPress={() => openEditModal(club)}
                  >
                    <Ionicons name="pencil" size={16} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.contentContainer}>
                <View style={styles.nameRow}>
                  <Text style={styles.clubName}>{club.name}</Text>

                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{club.category}</Text>
                  </View>
                </View>

                <Text style={styles.clubDescription} numberOfLines={2}>
                  {club.description}
                </Text>

                <View style={styles.bottomRow}>
                  <View style={styles.memberCount}>
                    <Ionicons name="people" size={14} color="#888888" />
                    <Text style={styles.memberText}>
                      {club.member_count || 0} members
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.joinButton}
                    onPress={() => handleJoinClub(club.whatsapp_link)}
                  >
                    <Text style={styles.joinButtonText}>Join</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {userRole === 'admin' && (
        <TouchableOpacity style={styles.fab} onPress={() => openEditModal()}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingClub ? 'Edit Club' : 'Add New Club'}
            </Text>

            <TouchableOpacity onPress={closeEditModal}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.inputLabel}>Club Name</Text>
            <TextInput
              style={styles.input}
              value={editForm.name}
              onChangeText={(text) => setEditForm((prev) => ({ ...prev, name: text }))}
              placeholder="Enter club name"
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editForm.description}
              onChangeText={(text) => setEditForm((prev) => ({ ...prev, description: text }))}
              placeholder="Enter club description"
              multiline
              numberOfLines={4}
            />

            <Text style={styles.inputLabel}>Category</Text>
            <TextInput
              style={styles.input}
              value={editForm.category}
              onChangeText={(text) => setEditForm((prev) => ({ ...prev, category: text }))}
              placeholder="Enter category"
            />

            <Text style={styles.inputLabel}>WhatsApp Link</Text>
            <TextInput
              style={styles.input}
              value={editForm.whatsapp_link}
              onChangeText={(text) =>
                setEditForm((prev) => ({ ...prev, whatsapp_link: text }))
              }
              placeholder="Enter WhatsApp group link"
            />

            <Text style={styles.inputLabel}>Image URL</Text>
            <TextInput
              style={styles.input}
              value={editForm.image_url}
              onChangeText={(text) => setEditForm((prev) => ({ ...prev, image_url: text }))}
              placeholder="Enter image URL (optional)"
            />

            <Text style={styles.inputLabel}>Member Count</Text>
            <TextInput
              style={styles.input}
              value={editForm.member_count}
              onChangeText={(text) =>
                setEditForm((prev) => ({ ...prev, member_count: text }))
              }
              placeholder="Enter member count"
              keyboardType="numeric"
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={closeEditModal}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={saveClub}
            >
              <Text style={styles.saveButtonText}>
                {editingClub ? 'Update' : 'Create'}
              </Text>
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
    backgroundColor: COLORS.background,
  },

  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 50,
    paddingBottom: SPACING.sm,
  },

  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111111',
    marginBottom: SPACING.xs,
  },

  subtitle: {
    fontSize: 13,
    color: '#888888',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },

  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: SPACING.xxl,
  },

  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },

  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  clubCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  imageContainer: {
    width: '100%',
    height: 140,
    position: 'relative',
  },

  clubImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },

  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0088CC',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  placeholderText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
  },

  editIconOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 6,
  },

  contentContainer: {
    padding: 12,
  },

  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  clubName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
    flex: 1,
  },

  categoryBadge: {
    backgroundColor: '#EAF5FD',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0088CC',
  },

  clubDescription: {
    fontSize: 13,
    color: '#888888',
    lineHeight: 18,
    marginBottom: 12,
  },

  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  memberText: {
    fontSize: 12,
    color: '#888888',
    marginLeft: 4,
  },

  joinButton: {
    backgroundColor: '#25D366',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  joinButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  fab: {
    position: 'absolute',
    bottom: SPACING.xl,
    right: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0088CC',
    justifyContent: 'center',
    alignItems: 'center',
  },

  fabText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
  },

  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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

  modalContent: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },

  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },

  input: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    fontSize: 16,
    backgroundColor: COLORS.surface,
  },

  textArea: {
    height: 100,
    textAlignVertical: 'top',
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
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
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