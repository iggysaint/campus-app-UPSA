import { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { auth, db } from '@/lib/firebase';
import { collection, doc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore';

type SupportMessage = {
  id: string;
  user_id: string;
  message: string;
  created_at: any;
  is_read: boolean;
};

export default function AdminSupportScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<SupportMessage | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const q = query(
        collection(db, 'support_messages'),
        orderBy('created_at', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const messagesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as SupportMessage[];
      setMessages(messagesData);
    } catch (error) {
      console.error('Error fetching messages:', error);
      Alert.alert('Error', 'Failed to load support messages');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (message: SupportMessage) => {
    try {
      await updateDoc(doc(db, 'support_messages', message.id), {
        is_read: true
      });
      setMessages(messages.map(msg => 
        msg.id === message.id ? { ...msg, is_read: true } : msg
      ));
      Alert.alert('Success', 'Message marked as read');
    } catch (error) {
      console.error('Error marking message as read:', error);
      Alert.alert('Error', 'Failed to mark message as read');
    }
  };

  const openMessageModal = (message: SupportMessage) => {
    setSelectedMessage(message);
    setShowModal(true);
  };

  const closeMessageModal = () => {
    setShowModal(false);
    setSelectedMessage(null);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'No date';
    return timestamp.toDate().toLocaleDateString();
  };

  const renderMessage = ({ item }: { item: SupportMessage }) => (
    <View style={styles.messageCard}>
      <View style={styles.messageContent}>
        <Text style={styles.userId}>User ID: {item.user_id}</Text>
        <Text style={styles.messagePreview} numberOfLines={2}>
          {item.message}
        </Text>
        <View style={styles.messageDetails}>
          <Text style={styles.detailText}>Sent: {formatDate(item.created_at)}</Text>
          <Text style={styles.detailText}>{item.is_read ? 'Read' : 'Unread'}</Text>
        </View>
      </View>
      <View style={styles.messageActions}>
        <TouchableOpacity
          style={styles.readButton}
          onPress={() => openMessageModal(item)}
        >
          <Ionicons name="eye-outline" size={20} color="#0088CC" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.readButton, item.is_read && styles.readButtonDisabled]}
          onPress={() => markAsRead(item)}
          disabled={item.is_read}
        >
          <Ionicons name="checkmark-done-outline" size={20} color={item.is_read ? '#999' : '#0088CC'} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading support messages...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0088CC" />
        </TouchableOpacity>
        <Text style={styles.title}>Support Messages</Text>
      </View>

      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeMessageModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeMessageModal}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Support Message</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.messageDetail}>
              <Text style={styles.detailLabel}>From User:</Text>
              <Text style={styles.detailValue}>{selectedMessage?.user_id}</Text>
            </View>
            <View style={styles.messageDetail}>
              <Text style={styles.detailLabel}>Date:</Text>
              <Text style={styles.detailValue}>{formatDate(selectedMessage?.created_at)}</Text>
            </View>
            <View style={styles.messageDetail}>
              <Text style={styles.detailLabel}>Status:</Text>
              <Text style={styles.detailValue}>{selectedMessage?.is_read ? 'Read' : 'Unread'}</Text>
            </View>
            <View style={styles.messageDetail}>
              <Text style={styles.detailLabel}>Message:</Text>
            </View>
            <View style={styles.messageBox}>
              <Text style={styles.fullMessage}>{selectedMessage?.message}</Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.closeButton} onPress={closeMessageModal}>
              <Text style={styles.closeButtonText}>Close</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  listContainer: {
    padding: 20,
    gap: 16,
  },
  messageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  messageContent: {
    flex: 1,
  },
  userId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  messagePreview: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    flex: 1,
  },
  messageDetails: {
    gap: 4,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
  },
  messageActions: {
    flexDirection: 'row',
    gap: 12,
  },
  readButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F0F8FF',
  },
  readButtonDisabled: {
    backgroundColor: '#F0F0F0',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  messageDetail: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginRight: 8,
    width: 80,
  },
  detailValue: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  messageBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  fullMessage: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  closeButton: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
});
