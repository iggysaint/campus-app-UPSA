import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { auth, db } from '@/lib/firebase';
import { addDoc, collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface LibraryResource {
  id: string;
  title: string;
  description: string;
  category: string;
  url: string;
  uploaded_by: string;
  created_at: any;
  is_active: boolean;
}

interface AddResourceForm {
  title: string;
  description: string;
  category: string;
  url: string;
}

const CATEGORIES = ['All', 'PDF', 'Past Paper', 'Template', 'Letter', 'Slides', 'Videos', 'Notes', 'Books'];

export default function LibraryScreen() {
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [filteredResources, setFilteredResources] = useState<LibraryResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<AddResourceForm>({
    title: '',
    description: '',
    category: 'PDF',
    url: '',
  });

  useEffect(() => {
    fetchResources();
    fetchUserRole();
  }, []);

  useEffect(() => {
    filterResources();
  }, [resources, searchQuery, selectedCategory]);

  const fetchResources = async () => {
    try {
      console.log('🔍 Fetching library resources...');
      const q = query(collection(db, 'library'), where('is_active', '==', true));
      console.log('📝 Query created:', q);
      
      const querySnapshot = await getDocs(q);
      console.log('📊 Query snapshot received, docs count:', querySnapshot.size);
      
      const resourcesData: LibraryResource[] = [];
      querySnapshot.forEach((doc) => {
        console.log('📄 Processing doc:', doc.id, 'data:', doc.data());
        resourcesData.push({ id: doc.id, ...doc.data() } as LibraryResource);
      });
      
      console.log('✅ Resources fetched successfully:', resourcesData.length);
      console.log('📋 Resources data:', resourcesData);
      setResources(resourcesData);
    } catch (error) {
      console.error('❌ Error fetching resources:', error);
      console.error('🔥 Full error details:', JSON.stringify(error, null, 2));
      console.error('📱 Error code:', error.code);
      console.error('📝 Error message:', error.message);
      console.error('🔗 Error stack:', error.stack);
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

  const filterResources = () => {
    let filtered = resources;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(resource => resource.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(resource =>
        resource.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredResources(filtered);
  };

  const openAddModal = () => {
    setAddForm({
      title: '',
      description: '',
      category: 'PDF',
      url: '',
    });
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setAddForm({
      title: '',
      description: '',
      category: 'PDF',
      url: '',
    });
  };

  const saveResource = async () => {
    try {
      if (!addForm.title.trim() || !addForm.url.trim()) {
        Alert.alert('Error', 'Title and URL are required');
        return;
      }

      const resourceData = {
        title: addForm.title.trim(),
        description: addForm.description.trim(),
        category: addForm.category,
        url: addForm.url.trim(),
        uploaded_by: auth.currentUser?.uid,
        created_at: new Date(),
        is_active: true,
      };

      await addDoc(collection(db, 'library'), resourceData);
      await fetchResources();
      closeAddModal();
      Alert.alert('Success', 'Resource added successfully');
    } catch (error) {
      console.error('Error saving resource:', error);
      Alert.alert('Error', 'Failed to save resource');
    }
  };

  const deleteResource = async (resourceId: string) => {
    try {
      Alert.alert(
        'Delete Resource',
        'Are you sure you want to delete this resource?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await updateDoc(doc(db, 'library', resourceId), { is_active: false });
              await fetchResources();
              Alert.alert('Success', 'Resource deleted successfully');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error deleting resource:', error);
      Alert.alert('Error', 'Failed to delete resource');
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'PDF': '#FF6B6B',
      'Past Paper': '#4ECDC4',
      'Template': '#45B7D1',
      'Letter': '#96CEB4',
      'Slides': '#FFEAA7',
      'Videos': '#DDA0DD',
      'Notes': '#98D8C8',
      'Books': '#F8B500',
    };
    return colors[category] || '#95A5A6';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Library</Text>
          <Text style={styles.subtitle}>Academic resources and materials</Text>
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
        <Text style={styles.title}>Library</Text>
        <Text style={styles.subtitle}>Academic resources and materials</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInput}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchTextInput}
            placeholder="Search resources..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#888888"
          />
        </View>
      </View>

      {/* Category Filter Pills */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoryContainer}
        contentContainerStyle={styles.categoryContent}
      >
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryPill,
              selectedCategory === category && styles.categoryPillSelected
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[
              styles.categoryPillText,
              selectedCategory === category && styles.categoryPillTextSelected
            ]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filteredResources.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No resources found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || selectedCategory !== 'All' 
                ? 'Try adjusting your search or filters' 
                : 'Check back later for new resources'
              }
            </Text>
          </View>
        ) : (
          filteredResources.map((resource) => (
            <View key={resource.id} style={styles.resourceCard}>
              <View style={styles.resourceHeader}>
                <View style={[
                  styles.categoryBadge,
                  { backgroundColor: getCategoryColor(resource.category) }
                ]}>
                  <Text style={styles.categoryBadgeText}>{resource.category}</Text>
                </View>
                {userRole === 'admin' && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteResource(resource.id)}
                  >
                    <Text style={styles.deleteButtonText}>🗑️</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <Text style={styles.resourceTitle}>{resource.title}</Text>
              
              <Text style={styles.resourceDescription} numberOfLines={3}>
                {resource.description}
              </Text>
              
              <TouchableOpacity
                style={styles.openButton}
                onPress={() => Linking.openURL(resource.url)}
              >
                <Text style={styles.openButtonText}>Open</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Resource Floating Button (Admin Only) */}
      {userRole === 'admin' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={openAddModal}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      {/* Add Resource Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeAddModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Resource</Text>
            <TouchableOpacity onPress={closeAddModal}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.input}
              value={addForm.title}
              onChangeText={(text) => setAddForm(prev => ({ ...prev, title: text }))}
              placeholder="Enter resource title"
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={addForm.description}
              onChangeText={(text) => setAddForm(prev => ({ ...prev, description: text }))}
              placeholder="Enter resource description"
              multiline
              numberOfLines={4}
            />

            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.categoryDropdown}>
              <Text style={styles.dropdownText}>{addForm.category}</Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </View>

            {CATEGORIES.filter(cat => cat !== 'All').map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryOption,
                  addForm.category === category && styles.categoryOptionSelected
                ]}
                onPress={() => setAddForm(prev => ({ ...prev, category }))}
              >
                <Text style={[
                  styles.categoryOptionText,
                  addForm.category === category && styles.categoryOptionTextSelected
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.inputLabel}>URL</Text>
            <TextInput
              style={styles.input}
              value={addForm.url}
              onChangeText={(text) => setAddForm(prev => ({ ...prev, url: text }))}
              placeholder="Enter resource URL"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={closeAddModal}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={saveResource}
            >
              <Text style={styles.saveButtonText}>Add Resource</Text>
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
  searchContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },
  searchTextInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  categoryContainer: {
    flexGrow: 0,
    marginBottom: SPACING.md,
  },
  categoryContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  categoryPill: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#0088CC',
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  categoryPillSelected: {
    backgroundColor: '#0088CC',
    borderColor: '#0088CC',
  },
  categoryPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0088CC',
  },
  categoryPillTextSelected: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: SPACING.xl * 2,
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
    paddingTop: SPACING.xl * 2,
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
    textAlign: 'center',
  },
  resourceCard: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  categoryBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  deleteButton: {
    padding: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  deleteButtonText: {
    fontSize: 16,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  resourceDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  openButton: {
    backgroundColor: '#0088CC',
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    alignSelf: 'flex-start',
  },
  openButtonText: {
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
  categoryDropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  dropdownText: {
    fontSize: 16,
    color: COLORS.text,
  },
  dropdownArrow: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  categoryOption: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.xs,
  },
  categoryOptionSelected: {
    backgroundColor: '#0088CC',
  },
  categoryOptionText: {
    fontSize: 16,
    color: COLORS.text,
  },
  categoryOptionTextSelected: {
    color: '#fff',
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
