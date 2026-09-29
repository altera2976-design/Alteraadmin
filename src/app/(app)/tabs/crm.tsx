import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect, useCallback } from 'react';
import { 
  ScrollView, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View, 
  Modal, 
  ActivityIndicator, 
  Alert, 
  RefreshControl,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { THEME } from '../../../constants/theme';
import api from '../../../services/api';
import { getSocket } from '../../../services/socket';

export default function CRMScreen() {
  const [activeTab, setActiveTab] = useState('All Clients'); // 'All Clients', 'Leads', 'Projects'
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Add Lead Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leadForm, setLeadForm] = useState({
    name: '',
    phone: '',
    email: '',
    requirement: 'Full Home Interior',
    propertyType: '3BHK',
    location: '',
    leadSource: 'Mobile App',
    budget: 800000
  });

  const fetchCRMData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      if (activeTab === 'Leads') {
        let url = `/crm/leads?status=All&source=All`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        const res = await api.get(url);
        setData(res.data?.data || []);
      } else if (activeTab === 'All Clients') {
        const res = await api.get('/clients');
        let clients = res.data?.data || res.data?.clients || [];
        if (search) {
          const s = search.toLowerCase();
          clients = clients.filter((c: any) => c.name?.toLowerCase().includes(s) || c.phone?.includes(s));
        }
        setData(clients);
      } else if (activeTab === 'Projects') {
        const res = await api.get('/projects');
        let projects = res.data?.data || res.data?.projects || [];
        if (search) {
          const s = search.toLowerCase();
          projects = projects.filter((p: any) => p.name?.toLowerCase().includes(s) || p.clientName?.toLowerCase().includes(s));
        }
        setData(projects);
      }
    } catch (err) {
      console.log('CRM Fetch Error:', err);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, [activeTab, search]);

  useEffect(() => {
    fetchCRMData();
  }, [fetchCRMData]);

  useEffect(() => {
    const socket = getSocket();
    const handleUpdate = () => {
      fetchCRMData();
    };

    if (socket) {
      socket.on('lead_added', handleUpdate);
      socket.on('lead_updated', handleUpdate);
      socket.on('client_updated', handleUpdate);
      socket.on('project_updated', handleUpdate);
    }
    return () => {
      if (socket) {
        socket.off('lead_added', handleUpdate);
        socket.off('lead_updated', handleUpdate);
        socket.off('client_updated', handleUpdate);
        socket.off('project_updated', handleUpdate);
      }
    };
  }, [fetchCRMData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCRMData(true);
  }, [fetchCRMData]);

  const handleAddLead = async () => {
    if (!leadForm.name || !leadForm.phone) {
      Alert.alert('Error', 'Name and Phone are required.');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/crm/leads', leadForm);
      Alert.alert('Success', 'Lead added successfully!');
      setShowAddModal(false);
      setLeadForm({
        name: '',
        phone: '',
        email: '',
        requirement: 'Full Home Interior',
        propertyType: '3BHK',
        location: '',
        leadSource: 'Mobile App',
        budget: 800000
      });
      fetchCRMData();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to add lead.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderItem = (item: any) => {
    let name = '';
    let sub = '';
    let date = '';

    if (activeTab === 'Leads') {
      name = item.name;
      sub = item.requirement || item.propertyType || 'New Lead';
      date = item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB') : '';
    } else if (activeTab === 'All Clients') {
      name = item.name;
      sub = item.phone || item.email || 'Client';
      date = item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB') : '';
    } else if (activeTab === 'Projects') {
      name = item.name;
      sub = item.clientName || 'Project';
      date = item.startDate ? new Date(item.startDate).toLocaleDateString('en-GB') : '';
    }

    return (
      <View key={item._id} style={styles.listItem}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name ? name.charAt(0).toUpperCase() : '?'}</Text>
        </View>
        <View style={styles.listInfo}>
          <Text style={styles.listName}>{name}</Text>
          <Text style={styles.listSub}>{sub}</Text>
          <Text style={styles.listDate}>{date}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={THEME.colors.textSecondary} />
      </View>
    );
  };

  return (
    <View style={styles.root}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={THEME.colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search clients, projects, leads..."
          placeholderTextColor={THEME.colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        <Ionicons name="filter-outline" size={20} color={THEME.colors.textSecondary} />
      </View>

      {/* Segmented Control / Tabs */}
      <View style={styles.tabsContainer}>
        {['All Clients', 'Leads', 'Projects'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={THEME.colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView 
          style={styles.list} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.colors.primary]} />
          }
        >
          {data.length === 0 ? (
            <Text style={{ textAlign: 'center', marginTop: 40, color: THEME.colors.textSecondary }}>No {activeTab.toLowerCase()} found.</Text>
          ) : (
            data.map(renderItem)
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* FAB - Specifically adding Leads */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Add Lead Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Lead</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={THEME.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ marginTop: 16 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter lead name"
                value={leadForm.name}
                onChangeText={(val) => setLeadForm({ ...leadForm, name: val })}
              />

              <Text style={styles.label}>Phone *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
                value={leadForm.phone}
                onChangeText={(val) => setLeadForm({ ...leadForm, phone: val })}
              />

              <Text style={styles.label}>Location / City</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter location"
                value={leadForm.location}
                onChangeText={(val) => setLeadForm({ ...leadForm, location: val })}
              />
              
              <Text style={styles.label}>Requirement</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Full Home Interior"
                value={leadForm.requirement}
                onChangeText={(val) => setLeadForm({ ...leadForm, requirement: val })}
              />

              <TouchableOpacity 
                style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]} 
                onPress={handleAddLead}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Save Lead</Text>
                )}
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.colors.background },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 20,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14, color: THEME.colors.text },

  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  tabActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  tabText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  list: {
    flex: 1,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(200,16,46,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.colors.primary,
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  listSub: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  listDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 16
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.text
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME.colors.textSecondary,
    marginBottom: 8,
    marginTop: 16
  },
  input: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: THEME.colors.text,
    backgroundColor: '#f8fafc'
  },
  submitBtn: {
    backgroundColor: THEME.colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});
