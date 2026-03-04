import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { auth, db } from '@/lib/firebase';
import { addDoc, collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
      const clubsData: Club[] = [];
      querySnapshot.forEach((doc) => {
        clubsData.push({ id: doc.id, ...doc.data() } as Club);
      });
      setClubs(clubsData);
    } catch (error) {
      console.error('Error fetching clubs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRole = async () => {
    try {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role);
        }
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const handleJoinClub = (whatsappLink: string) => {
    if (whatsappLink) {
      Linking.openURL(whatsappLink);
    }
  };

  const openEditModal = (club?: Club) => {
    if (club) {
      setEditingClub(club);
      setEditForm({
        name: club.name,
        description: club.description,
        category: club.category,
        whatsapp_link: club.whatsapp_link,
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
    try {
      const clubData = {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        category: editForm.category.trim(),
        whatsapp_link: editForm.whatsapp_link.trim(),
        image_url: editForm.image_url.trim() || null,
        member_count: parseInt(editForm.member_count) || 0,
      };

      if (editingClub) {
        // Update existing club
        await updateDoc(doc(db, 'clubs', editingClub.id), clubData);
        setClubs(prev => prev.map(club => 
          club.id === editingClub.id ? { ...club, ...clubData } : club
        ));
      } else {
        // Create new club
        const docRef = await addDoc(collection(db, 'clubs'), clubData);
        setClubs(prev => [...prev, { id: docRef.id, ...clubData }]);
      }

      closeEditModal();
      Alert.alert('Success', editingClub ? 'Club updated successfully' : 'Club created successfully');
    } catch (error) {
      console.error('Error saving club:', error);
      Alert.alert('Error', 'Failed to save club');
    }
  };

  const getCategoryInitial = (category: string) => {
    return category.charAt(0).toUpperCase();
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

      {/* Filter pills would go here */}

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
              {/* Club Image */}
              <View style={styles.imageContainer}>
                {club.image_url ? (
                  <Image source={{ uri: club.image_url }} style={styles.clubImage} />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Text style={styles.placeholderText}>{getCategoryInitial(club.category)}</Text>
                  </View>
                )}
              </View>

              <View style={styles.clubContent}>
                <View style={styles.clubHeader}>
                  <Text style={styles.clubName}>{club.name}</Text>
                  {userRole === 'admin' && (
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => openEditModal(club)}
                    >
                      <Text style={styles.editButtonText}>✏️</Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{club.category}</Text>
                </View>
                
                <Text style={styles.clubDescription} numberOfLines={3}>
                  {club.description}
                </Text>
                
                <View style={styles.clubFooter}>
                  <View style={styles.memberCount}>
                    <Text style={styles.memberIcon}>👥</Text>
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

      {/* Add Club Floating Button (Admin Only) */}
      {userRole === 'admin' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => openEditModal()}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      {/* Edit/Create Modal */}
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
              onChangeText={(text) => setEditForm(prev => ({ ...prev, name: text }))}
              placeholder="Enter club name"
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editForm.description}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, description: text }))}
              placeholder="Enter club description"
              multiline
              numberOfLines={4}
            />

            <Text style={styles.inputLabel}>Category</Text>
            <TextInput
              style={styles.input}
              value={editForm.category}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, category: text }))}
              placeholder="Enter category"
            />

            <Text style={styles.inputLabel}>WhatsApp Link</Text>
            <TextInput
              style={styles.input}
              value={editForm.whatsapp_link}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, whatsapp_link: text }))}
              placeholder="Enter WhatsApp group link"
            />

            <Text style={styles.inputLabel}>Image URL</Text>
            <TextInput
              style={styles.input}
              value={editForm.image_url}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, image_url: text }))}
              placeholder="Enter image URL (optional)"
            />

            <Text style={styles.inputLabel}>Member Count</Text>
            <TextInput
              style={styles.input}
              value={editForm.member_count}
              onChangeText={(text) => setEditForm(prev => ({ ...prev, member_count: text }))}
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
    flex: 1,
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
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: 120,
  },
  clubImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0088CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
  },
  clubContent: {
    padding: SPACING.lg,
  },
  clubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  clubName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    marginRight: SPACING.md,
  },
  editButton: {
    padding: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  editButtonText: {
    fontSize: 16,
  },
  categoryBadge: {
    backgroundColor: '#0088CC',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
    marginBottom: SPACING.sm,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  clubDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  clubFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberIcon: {
    fontSize: 16,
    marginRight: SPACING.xs,
  },
  memberText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  joinButton: {
    backgroundColor: '#0088CC',
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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
    color: COLORS.text,
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
