import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import { Package, TrendingDown, Clock, AlertTriangle } from 'lucide-react-native';

export default function DashboardScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    products: 0,
    lowStock: 0,
    expiring: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    if (!user) return;
    try {
      const [invRes, lowRes, expRes] = await Promise.all([
        apiClient.get(user.branchId ? `/api/inventory/${user.branchId}` : '/api/inventory'),
        apiClient.get('/api/inventory/low-stock', { params: user.branchId ? { branchId: user.branchId } : {} }),
        apiClient.get(user.branchId ? `/api/batches/tools/expiring/${user.branchId}` : '/api/batches/expiring', { params: { days: 30 } })
      ]);

      setStats({
        products: invRes.data?.data?.length || 0,
        lowStock: lowRes.data?.data?.length || 0,
        expiring: expRes.data?.data?.length || 0,
      });
    } catch (error) {
      console.error('Failed to fetch dashboard stats', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  if (!user) return null;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.email}>{user.email}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{user.role}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: '#e0f2fe' }]}>
            <Package color="#0284c7" size={24} />
          </View>
          <Text style={styles.cardValue}>{stats.products}</Text>
          <Text style={styles.cardLabel}>Active Products</Text>
        </View>

        <View style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: '#fef3c7' }]}>
            <TrendingDown color="#d97706" size={24} />
          </View>
          <Text style={styles.cardValue}>{stats.lowStock}</Text>
          <Text style={styles.cardLabel}>Low Stock Items</Text>
        </View>

        <View style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: '#fee2e2' }]}>
            <Clock color="#dc2626" size={24} />
          </View>
          <Text style={styles.cardValue}>{stats.expiring}</Text>
          <Text style={styles.cardLabel}>Expiring Soon</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <Text style={{ color: '#64748b' }}>Use the Scan Barcode tab below to lookup product information in real-time or perform inventory counts.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  greeting: {
    fontSize: 16,
    color: '#64748b',
  },
  email: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
  },
  badgeText: {
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  card: {
    width: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: '2.5%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  cardLabel: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  section: {
    padding: 24,
    backgroundColor: '#fff',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
  }
});
