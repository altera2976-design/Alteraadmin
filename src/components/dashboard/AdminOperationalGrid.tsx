import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AdminOperationalGridProps {
  data: any;
  onNavigate: (path: string) => void;
}

export const AdminOperationalGrid = ({ data, onNavigate }: AdminOperationalGridProps) => {
  return (
    <View style={styles.grid}>
      <TouchableOpacity
        style={styles.gridItem}
        onPress={() => onNavigate('/(app)/tabs/crm')}
        activeOpacity={0.8}
      >
        <View style={[styles.gridIconWrap, { backgroundColor: 'rgba(30,144,255,0.1)' }]}>
          <Ionicons name="people" size={22} color="#1E90FF" />
        </View>
        <Text style={styles.gridLabel}>Total Clients</Text>
        <Text style={styles.gridValue}>{data?.totalClients ?? 0}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.gridItem}
        onPress={() => onNavigate('/(app)/tabs/profile')}
        activeOpacity={0.8}
      >
        <View style={[styles.gridIconWrap, { backgroundColor: 'rgba(46,204,113,0.1)' }]}>
          <Ionicons name="person" size={22} color="#2ECC71" />
        </View>
        <Text style={styles.gridLabel}>Employees</Text>
        <Text style={styles.gridValue}>
          {data?.activeEmployees ?? 0}
          <Text style={styles.gridValueSub}> / {data?.totalEmployees ?? 0}</Text>
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.gridItem}
        onPress={() => onNavigate('/(app)/attendance')}
        activeOpacity={0.8}
      >
        <View style={[styles.gridIconWrap, { backgroundColor: 'rgba(230,126,34,0.1)' }]}>
          <Ionicons name="time" size={22} color="#E67E22" />
        </View>
        <Text style={styles.gridLabel}>Today's Attendance</Text>
        <Text style={styles.gridValue}>{data?.todayAttendance?.totalCheckedIn ?? 0}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.gridItem}
        onPress={() => onNavigate('/(app)/quotation')}
        activeOpacity={0.8}
      >
        <View style={[styles.gridIconWrap, { backgroundColor: 'rgba(155,89,182,0.1)' }]}>
          <Ionicons name="document-text" size={22} color="#9B59B6" />
        </View>
        <Text style={styles.gridLabel}>Quotations</Text>
        <Text style={styles.gridValue}>
          {data?.pendingQuotations ?? 0}
          <Text style={styles.gridValueSub}> pending</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  gridIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  gridLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  gridValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  gridValueSub: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
