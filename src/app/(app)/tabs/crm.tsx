import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Image } from 'react-native';
import { THEME } from '../../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

const CLIENTS = [
  { id: 1, name: 'Rahul Sharma', sub: 'Modular Kitchen', date: '21 May 2024' },
  { id: 2, name: 'Priya Mehta', sub: 'Living Room Interior', date: '20 May 2024' },
  { id: 3, name: 'Amit Verma', sub: 'Full Home Renovation', date: '19 May 2024' },
  { id: 4, name: 'Sneha Kapoor', sub: 'Office Interior', date: '18 May 2024' },
  { id: 5, name: 'Vikram Singh', sub: 'Wardrobe Project', date: '17 May 2024' },
];

export default function CRMScreen() {
  const [activeTab, setActiveTab] = useState('All Clients');

  return (
    <View style={styles.root}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={THEME.colors.textSecondary} style={styles.searchIcon} />
        <TextInput 
          style={styles.searchInput}
          placeholder="Search clients, projects..."
          placeholderTextColor={THEME.colors.textSecondary}
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
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {CLIENTS.map((client) => (
          <View key={client.id} style={styles.listItem}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{client.name.charAt(0)}</Text>
            </View>
            <View style={styles.listInfo}>
              <Text style={styles.listName}>{client.name}</Text>
              <Text style={styles.listSub}>{client.sub}</Text>
              <Text style={styles.listDate}>{client.date}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={THEME.colors.textSecondary} />
          </View>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
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
  }
});
