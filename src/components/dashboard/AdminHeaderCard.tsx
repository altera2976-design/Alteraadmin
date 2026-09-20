import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface AdminHeaderCardProps {
  data: any;
}

export const AdminHeaderCard = ({ data }: AdminHeaderCardProps) => {
  return (
    <View style={styles.redCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.redCardSub}>ADMIN CONSOLE</Text>
        <Text style={styles.redCardTitle}>Total Projects</Text>
        <Text style={styles.redCardValue}>{data?.totalProjects ?? 0}</Text>
        <Text style={styles.redCardFoot}>
          Active: {data?.activeProjects ?? 0} | Done: {data?.completedProjects ?? 0}
        </Text>
      </View>
      <View style={styles.revenueBox}>
        <Text style={styles.revenueBoxLabel}>Total Revenue</Text>
        <Text style={styles.revenueBoxVal}>
          ₹{Number(data?.totalRevenue ?? 0).toLocaleString('en-IN')}
        </Text>
        <Text style={styles.pendingPayLabel}>
          Pending: ₹{Number(data?.pendingPayments ?? 0).toLocaleString('en-IN')}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  redCard: {
    backgroundColor: '#7A131A',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  redCardSub: {
    color: '#FECDD3',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  redCardTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  redCardValue: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 2,
  },
  redCardFoot: {
    color: '#F43F5E',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  revenueBox: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'flex-end',
  },
  revenueBoxLabel: {
    color: '#FECDD3',
    fontSize: 10,
    fontWeight: '700',
  },
  revenueBoxVal: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  pendingPayLabel: {
    color: '#FCA5A5',
    fontSize: 9.5,
    fontWeight: '600',
    marginTop: 2,
  },
});
