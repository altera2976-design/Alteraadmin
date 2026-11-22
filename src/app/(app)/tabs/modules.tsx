import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { THEME } from '../../../constants/theme';
import { useAuth } from '../../../context/AuthContext';

export default function ModulesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { width } = useWindowDimensions();

  const userRole = (user as any)?.role;
  const isAdmin =
    userRole === 'ADMIN' ||
    userRole === 'SUPER_ADMIN' ||
    userRole?.toUpperCase() === 'ADMIN' ||
    userRole?.toUpperCase() === 'SUPER_ADMIN' ||
    user?.email?.toLowerCase() === 'admin@company.com' ||
    user?.email?.toLowerCase()?.includes('admin');

  const cardWidth = width > 500 ? (width - 48) / 3 : (width - 44) / 2;

  const allModules = [
    {
      id: 'crm',
      title: 'CRM',
      subtitle: 'Leads & Clients',
      icon: 'people-outline',
      route: '/(app)/tabs/crm',
      adminOnly: true,
    },
    {
      id: 'projects',
      title: 'Projects',
      subtitle: 'Tasks & Timelines',
      icon: 'briefcase-outline',
      route: '/(app)/tabs/projects',
      adminOnly: false,
    },
    {
      id: 'salary',
      title: 'Salary',
      subtitle: 'Slips & Structure',
      icon: 'cash-outline',
      route: '/(app)/salary',
      adminOnly: false,
    },
    {
      id: 'attendance',
      title: 'Attendance',
      subtitle: 'Records & Leaves',
      icon: 'calendar-outline',
      route: '/(app)/attendance',
      adminOnly: false,
    },
    {
      id: 'bike',
      title: 'Bike Tracking',
      subtitle: 'Live GPS & Trips',
      icon: 'bicycle-outline',
      route: '/(app)/tabs/bike',
      adminOnly: false,
    },
    {
      id: 'quotation',
      title: 'Quotation',
      subtitle: 'Invoices & Estimates',
      icon: 'document-text-outline',
      route: '/(app)/quotation',
      adminOnly: true,
    },
    {
      id: 'transactions',
      title: 'Transactions',
      subtitle: 'Income & Expenses',
      icon: 'card-outline',
      route: '/(app)/transactions',
      adminOnly: true,
    },
    {
      id: 'reports',
      title: 'Reports',
      subtitle: 'Analytics & Export',
      icon: 'stats-chart-outline',
      route: '/(app)/tabs/reports',
      adminOnly: true,
    },
    {
      id: 'settings',
      title: 'Settings',
      subtitle: 'Profile & App',
      icon: 'settings-outline',
      route: '/(app)/tabs/profile',
      adminOnly: false,
    },
  ];

  const visibleModules = allModules.filter((m) => {
    if (isAdmin) return true;
    if (m.adminOnly) return false;
    return true;
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerArea}>
        <Text style={styles.heading}>Explore Modules</Text>
        <Text style={styles.subheading}>
          Access management tools, records, and operations
        </Text>
      </View>

      <View style={styles.grid}>
        {visibleModules.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.card, { width: cardWidth }]}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.8}
          >
            <View style={styles.iconWrapper}>
              <Ionicons name={item.icon as any} size={26} color="#7A131A" />
            </View>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.cardSubtitle} numberOfLines={1}>
              {item.subtitle}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  headerArea: {
    marginBottom: 18,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  subheading: {
    fontSize: 13,
    color: '#666666',
    marginTop: 3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  iconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FCE8EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222222',
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#777777',
    marginTop: 2,
    textAlign: 'center',
  },
});
