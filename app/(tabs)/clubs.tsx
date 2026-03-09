import { COLORS, SPACING } from '@/constants/theme';
import { db } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  RefreshControl,
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

const CATEGORY_FILTERS = ['All', 'Academic', 'Sports', 'Cultural', 'Professional', 'Social'];

// Moved outside component — not recreated every render
function getCategoryInitial(category?: string) {
  return category ? category.charAt(0).toUpperCase() : '?';
}

export default function ClubsScreen() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [openingLink, setOpeningLink] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // FIX #1: Real unmount protection
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setError(false);
        const q = query(collection(db, 'clubs'), orderBy('name'));
        const querySnapshot = await getDocs(q);

        if (!mounted) return;

        const clubsData: Club[] = querySnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Club, 'id'>),
        }));

        setClubs(clubsData);
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
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(false);
    try {
      const q = query(collection(db, 'clubs'), orderBy('name'));
      const querySnapshot = await getDocs(q);
      const clubsData: Club[] = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Club, 'id'>),
      }));
      setClubs(clubsData);
    } catch {
      setError(true);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleJoinClub = useCallback(async (whatsappLink: string) => {
    if (!whatsappLink) {
      Alert.alert('No Link', 'This club does not have a WhatsApp link yet.');
      return;
    }
    if (openingLink) return;
    setOpeningLink(true);
    try {
      const supported = await Linking.canOpenURL(whatsappLink);
      if (!supported) {
        Alert.alert('Invalid Link', 'Unable to open this link.');
        return;
      }
      await Linking.openURL(whatsappLink);
    } catch {
      Alert.alert('Error', 'Could not open the WhatsApp link.');
    } finally {
      setOpeningLink(false);
    }
  }, [openingLink]);

  // FIX #2 + #5: Search + category filter with safe category access
  const filteredClubs = useMemo(() => {
    return clubs.filter(c => {
      const matchesSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.category ?? '').toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        selectedCategory === 'All' ||
        (c.category ?? '').toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [clubs, search, selectedCategory]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Clubs</Text>
          <Text style={styles.subtitle}>Browse and join campus clubs here</Text>
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

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search clubs..."
          placeholderTextColor="#aaa"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#aaa" />
          </TouchableOpacity>
        )}
      </View>

      {/* FIX #5: Category filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {CATEGORY_FILTERS.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setSelectedCategory(cat)}
            style={[
              styles.filterPill,
              selectedCategory === cat && styles.filterPillActive,
            ]}
          >
            <Text style={[
              styles.filterPillText,
              selectedCategory === cat && styles.filterPillTextActive,
            ]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {error ? (
          <View style={styles.emptyState}>
            <Ionicons name="cloud-offline-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>Unable to load clubs</Text>
            <Text style={styles.emptySubtext}>Pull down to retry.</Text>
          </View>
        ) : filteredClubs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>
              {search.trim() || selectedCategory !== 'All' ? 'No clubs match your search' : 'No clubs yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {search.trim() || selectedCategory !== 'All'
                ? 'Try a different search or category'
                : 'Check back later for new clubs'}
            </Text>
          </View>
        ) : (
          filteredClubs.map((club) => (
            <View key={club.id} style={styles.clubCard}>
              <View style={styles.imageContainer}>
                {/* FIX #3: image_url.trim() guard */}
                {club.image_url && club.image_url.trim() ? (
                  <Image
                    source={{ uri: club.image_url.trim() }}
                    style={styles.clubImage}
                    resizeMode="cover"
                    onError={() => {}}
                  />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Text style={styles.placeholderText}>
                      {getCategoryInitial(club.category)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.contentContainer}>
                <View style={styles.nameRow}>
                  <Text style={styles.clubName} numberOfLines={1}>{club.name}</Text>
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

                  {/* FIX #4: Loading indicator on Join button */}
                  <TouchableOpacity
                    style={[styles.joinButton, openingLink && styles.joinButtonDisabled]}
                    onPress={() => handleJoinClub(club.whatsapp_link)}
                    disabled={openingLink}
                  >
                    {openingLink ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="logo-whatsapp" size={14} color="#fff" style={{ marginRight: 4 }} />
                        <Text style={styles.joinButtonText}>Join</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111',
  },
  filterScroll: {
    marginBottom: SPACING.sm,
    maxHeight: 36,
  },
  filterContent: {
    paddingHorizontal: SPACING.lg,
    gap: 6,
    alignItems: 'center',
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 6,
  },
  filterPillActive: {
    backgroundColor: '#0088CC',
    borderColor: '#0088CC',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#555',
  },
  filterPillTextActive: {
    color: '#fff',
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
    gap: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
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
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: 140,
  },
  clubImage: {
    width: '100%',
    height: '100%',
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
  contentContainer: {
    padding: 12,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clubName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
    flex: 1,
    marginRight: 8,
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
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 72,
    justifyContent: 'center',
  },
  joinButtonDisabled: {
    opacity: 0.6,
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
