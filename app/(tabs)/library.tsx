import { COLORS, RADIUS, SPACING } from '@/constants/theme';
import { useUserRole } from '@/lib/auth-context';
import { auth, db } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

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

const CATEGORIES = ['All', 'PDF', 'Past Paper', 'Template', 'Letter', 'Slides', 'Videos', 'Notes', 'Books'];

const SEEN_KEY = 'last_seen_library';

const getCategoryColors = (category: string) => {
  const colors: { [key: string]: { bg: string; text: string } } = {
    'PDF': { bg: '#FDEAEA', text: '#DC2626' },
    'Videos': { bg: '#F3E8FF', text: '#9333EA' },
    'Past Paper': { bg: '#FEF3C7', text: '#D97706' },
    'Template': { bg: '#D1FAE5', text: '#059669' },
    'Letter': { bg: '#DBEAFE', text: '#2563EB' },
    'Notes': { bg: '#FEF9C3', text: '#CA8A04' },
    'Slides': { bg: '#FCE7F3', text: '#DB2777' },
    'Books': { bg: '#F3F4F6', text: '#6B7280' },
  };
  return colors[category] || { bg: '#F3F4F6', text: '#6B7280' };
};

const getFileIcon = (category: string) => {
  switch (category) {
    case 'PDF':
    case 'Past Paper':
    case 'Letter':
    case 'Template': return 'document-text-outline';
    case 'Videos': return 'videocam-outline';
    case 'Slides': return 'layers-outline';
    case 'Notes': return 'create-outline';
    case 'Books': return 'book-outline';
    default: return 'document-outline';
  }
};

const formatUploadDate = (timestamp: any): string => {
  if (!timestamp?.toDate) return '';
  try {
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

const markLibrarySeen = async () => {
  try {
    const q = query(
      collection(db, 'library'),
      where('is_active', '==', true),
      orderBy('created_at', 'desc'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const latest = snap.docs[0].data().created_at;
      const millis = latest?.toMillis?.();
      if (millis) {
        await AsyncStorage.setItem(SEEN_KEY, String(millis));
      }
    }
  } catch (e) {
    console.log('markLibrarySeen failed:', e);
  }
};

export default function LibraryScreen() {
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({
    title: '',
    description: '',
    category: 'PDF',
    url: '',
  });

  const role = useUserRole();

  // FIX: extracted fetchResources — reused by load and refresh
  const fetchResources = useCallback(async () => {
    const q = query(
      collection(db, 'library'),
      where('is_active', '==', true),
      orderBy('created_at', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const resourcesData: LibraryResource[] = [];
    querySnapshot.forEach((docSnap) => {
      resourcesData.push({ id: docSnap.id, ...docSnap.data() } as LibraryResource);
    });
    return Array.from(new Map(resourcesData.map(r => [r.id, r])).values());
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setError(false);
        const data = await fetchResources();
        if (!mounted) return;
        setResources(data);
        // FIX: mark seen AFTER load so dot clears only when content is visible
        await markLibrarySeen();
      } catch {
        if (!mounted) return;
        setError(true);
      } finally {
        if (mounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    load();
    return () => { mounted = false; };
  }, [fetchResources]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(false);
    try {
      const data = await fetchResources();
      setResources(data);
      await markLibrarySeen();
    } catch {
      setError(true);
    } finally {
      setRefreshing(false);
    }
  }, [fetchResources]);

  const openResource = useCallback(async (id: string, url: string) => {
    if (!url) {
      Alert.alert('Invalid URL', 'This resource does not have a valid link.');
      return;
    }
    if (openingId === id) return;
    setOpeningId(id);
    try {
      // FIX: skip canOpenURL — some valid links (e.g. Google Drive) fail it
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Failed to open resource.');
    } finally {
      setOpeningId(null);
    }
  }, [openingId]);

  const filteredResources = useMemo(() => {
    let filtered = resources;
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(r =>
        (r.category ?? '').toLowerCase() === selectedCategory.toLowerCase()
      );
    }
    if (searchQuery.trim()) {
      filtered = filtered.filter(r =>
        (r.title ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.description ?? '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  }, [resources, searchQuery, selectedCategory]);

  const resetForm = () => {
    setAddForm({ title: '', description: '', category: 'PDF', url: '' });
    setShowAddModal(false);
  };

  const saveResource = async () => {
    if (saving) return;

    if (!addForm.title.trim() || !addForm.url.trim()) {
      Alert.alert('Error', 'Title and URL are required');
      return;
    }

    // FIX: stronger URL validation
    if (!/^https?:\/\//i.test(addForm.url)) {
      Alert.alert('Invalid URL', 'URL must start with http:// or https://');
      return;
    }

    if (!auth.currentUser) {
      Alert.alert('Error', 'You must be logged in to add resources');
      return;
    }

    setSaving(true);
    try {
      const resourceData = {
        title: addForm.title.trim(),
        description: addForm.description.trim(),
        category: addForm.category,
        url: addForm.url.trim(),
        uploaded_by: auth.currentUser.uid,
        created_at: serverTimestamp(),
        is_active: true,
      };

      const docRef = await addDoc(collection(db, 'library'), resourceData);

      // FIX: use new Date() not null so sort position is stable
      setResources(prev => [{
        id: docRef.id,
        ...resourceData,
        created_at: new Date(),
      }, ...prev]);

      resetForm();
      Alert.alert('Success', 'Resource added successfully');
    } catch {
      Alert.alert('Error', 'Failed to save resource');
    } finally {
      setSaving(false);
    }
  };

  const deleteResource = (resourceId: string) => {
    Alert.alert(
      'Remove Resource',
      'Are you sure you want to remove this resource?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'library', resourceId), { is_active: false });
              setResources(prev => prev.filter(r => r.id !== resourceId));
              Alert.alert('Success', 'Resource removed successfully');
            } catch {
              Alert.alert('Error', 'Failed to remove resource');
            }
          },
        },
      ]
    );
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

      <View style={styles.searchContainer}>
        <View style={styles.searchInputRow}>
          <Ionicons name="search-outline" size={18} color="#888" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchTextInput}
            placeholder="Search resources..."
            value={searchQuery}
            onChangeText={(text) => setSearchQuery(text.trimStart())}
            placeholderTextColor="#888888"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#aaa" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryContainer}
        contentContainerStyle={styles.categoryContent}
      >
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category}
            style={[styles.categoryPill, selectedCategory === category && styles.categoryPillSelected]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[styles.categoryPillText, selectedCategory === category && styles.categoryPillTextSelected]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {error ? (
          <View style={styles.emptyState}>
            <Ionicons name="cloud-offline-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>Unable to load resources</Text>
            <Text style={styles.emptySubtext}>Pull down to retry.</Text>
          </View>
        ) : filteredResources.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="library-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No resources found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || selectedCategory !== 'All'
                ? 'Try adjusting your search or filters'
                : 'Check back later for new resources'}
            </Text>
          </View>
        ) : (
          filteredResources.map((resource) => {
            // FIX: use local category variable consistently
            const category = resource.category ?? 'PDF';
            const colors = getCategoryColors(category);
            const uploadDate = formatUploadDate(resource.created_at);
            return (
              <TouchableOpacity
                key={resource.id}
                activeOpacity={0.95}
                style={styles.resourceCard}
                // FIX: long press to copy link
                onLongPress={() => {
                  Clipboard.setString(resource.url);
                  Alert.alert('Copied', 'Link copied to clipboard');
                }}
              >
                <View style={styles.topRow}>
                  <View style={styles.iconContainer}>
                    <Ionicons name={getFileIcon(category)} size={20} color="#0088CC" />
                  </View>
                  <View style={styles.titleContainer}>
                    <Text style={styles.resourceTitle} numberOfLines={1}>
                      {resource.title}
                    </Text>
                    <Text style={styles.resourceDescription} numberOfLines={2}>
                      {resource.description}
                    </Text>
                  </View>
                </View>

                <View style={styles.bottomRow}>
                  <View style={styles.bottomLeft}>
                    <View style={[styles.categoryBadge, { backgroundColor: colors.bg }]}>
                      {/* FIX: use local category variable not resource.category */}
                      <Text style={[styles.categoryBadgeText, { color: colors.text }]}>
                        {category}
                      </Text>
                    </View>
                    {/* FIX: show upload date */}
                    {uploadDate ? (
                      <Text style={styles.uploadDate}>{uploadDate}</Text>
                    ) : null}
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[styles.openButton, openingId === resource.id && { opacity: 0.6 }]}
                    onPress={() => openResource(resource.id, resource.url)}
                    disabled={openingId === resource.id}
                  >
                    {openingId === resource.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.openButtonText}>Open</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {role === 'admin' && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteResource(resource.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#DC2626" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {role === 'admin' && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={resetForm}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Resource</Text>
            <TouchableOpacity onPress={resetForm}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.input}
              value={addForm.title}
              onChangeText={(text) => setAddForm(prev => ({ ...prev, title: text.trimStart() }))}
              placeholder="Enter resource title"
              maxLength={120}
              editable={!saving}
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={addForm.description}
              onChangeText={(text) => setAddForm(prev => ({ ...prev, description: text.trimStart() }))}
              placeholder="Enter resource description"
              multiline
              numberOfLines={4}
              maxLength={300}
              editable={!saving}
            />

            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.categoryPickerRow}>
              {CATEGORIES.filter(cat => cat !== 'All').map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryPickerPill,
                    addForm.category === category && styles.categoryPickerPillSelected,
                  ]}
                  onPress={() => setAddForm(prev => ({ ...prev, category }))}
                  disabled={saving}
                >
                  <Text style={[
                    styles.categoryPickerText,
                    addForm.category === category && styles.categoryPickerTextSelected,
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>URL</Text>
            <TextInput
              style={styles.input}
              value={addForm.url}
              onChangeText={(text) => setAddForm(prev => ({ ...prev, url: text.trim() }))}
              placeholder="https://..."
              autoCapitalize="none"
              autoCorrect={false}
              editable={!saving}
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={resetForm}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            {/* FIX: disable save button when fields empty */}
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.saveButton,
                (saving || !addForm.title || !addForm.url) && { opacity: 0.5 }
              ]}
              onPress={saveResource}
              disabled={saving || !addForm.title || !addForm.url}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving...' : 'Add Resource'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.lg, paddingTop: 50, paddingBottom: SPACING.sm },
  title: { fontSize: 18, fontWeight: '600', color: '#111111', marginBottom: SPACING.xs },
  subtitle: { fontSize: 13, color: '#888888' },
  searchContainer: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },
  searchInputRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 12, paddingHorizontal: SPACING.md, paddingVertical: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  searchTextInput: { flex: 1, fontSize: 14, color: COLORS.text },
  categoryContainer: { flexGrow: 0, marginBottom: SPACING.sm, maxHeight: 36 },
  categoryContent: { paddingHorizontal: SPACING.lg, alignItems: 'center' },
  categoryPill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#0088CC', marginRight: 6,
  },
  categoryPillSelected: { backgroundColor: '#0088CC', borderColor: '#0088CC' },
  categoryPillText: { fontSize: 11, fontWeight: '600', color: '#0088CC' },
  categoryPillTextSelected: { color: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: SPACING.xl * 2, gap: 8 },
  emptyText: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 8 },
  emptySubtext: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  resourceCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
  },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  iconContainer: {
    width: 40, height: 40, backgroundColor: '#EAF5FD', borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  titleContainer: { flex: 1 },
  resourceTitle: { fontSize: 15, fontWeight: '600', color: '#111111', marginBottom: 2 },
  resourceDescription: { fontSize: 13, color: '#888888', lineHeight: 18 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bottomLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  categoryBadgeText: { fontSize: 11, fontWeight: '500' },
  uploadDate: { fontSize: 11, color: '#9CA3AF' },
  openButton: {
    backgroundColor: '#0088CC', borderRadius: 16, paddingHorizontal: 16,
    paddingVertical: 6, minWidth: 60, alignItems: 'center', justifyContent: 'center',
  },
  openButtonText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  deleteButton: { position: 'absolute', top: 8, right: 8, padding: 4 },
  fab: {
    position: 'absolute', bottom: SPACING.xl, right: SPACING.lg,
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#0088CC',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4, elevation: 5,
  },
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingTop: 60, paddingBottom: SPACING.md,
  },
  modalTitle: { fontSize: 20, fontWeight: '600', color: COLORS.text },
  modalContent: { flex: 1, paddingHorizontal: SPACING.lg },
  inputLabel: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.sm, marginTop: SPACING.md },
  input: {
    height: 48, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md, fontSize: 16, color: COLORS.text, backgroundColor: COLORS.surface,
  },
  textArea: { height: 100, textAlignVertical: 'top', paddingTop: SPACING.sm },
  categoryPickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryPickerPill: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  categoryPickerPillSelected: { backgroundColor: '#0088CC', borderColor: '#0088CC' },
  categoryPickerText: { fontSize: 13, fontWeight: '500', color: COLORS.text },
  categoryPickerTextSelected: { color: '#fff' },
  modalFooter: { flexDirection: 'row', paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl, gap: SPACING.md },
  modalButton: { flex: 1, height: 48, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  cancelButton: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  saveButton: { backgroundColor: '#0088CC' },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});