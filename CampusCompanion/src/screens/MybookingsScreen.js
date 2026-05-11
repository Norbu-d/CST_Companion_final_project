// src/screens/MyBookingsScreen.js
// Fully connected to GET /bookings/my

import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { get } from '../api/client';
import { colors, spacing, radius } from '../theme/theme';

const TIME_SLOTS = [
  '8:00–9:00','9:00–10:00','10:00–11:00','11:00–12:00','12:00–13:00',
  '13:00–14:00','14:00–15:00','15:00–16:00','16:00–17:00',
];

const STATUS_CONFIG = {
  PENDING:  { label: 'Pending',  color: '#d97706', bg: '#fef3c7', icon: 'time-outline'             },
  APPROVED: { label: 'Approved', color: '#16a34a', bg: '#dcfce7', icon: 'checkmark-circle-outline' },
  REJECTED: { label: 'Rejected', color: '#dc2626', bg: '#fee2e2', icon: 'close-circle-outline'     },
};

const FACILITY_META = {
  football: { icon: 'football-outline',      color: '#16a34a', colorLight: '#dcfce7' },
  hall:     { icon: 'business-outline',       color: '#7c3aed', colorLight: '#ede9fe' },
  lab1:     { icon: 'desktop-outline',        color: '#2563eb', colorLight: '#dbeafe' },
  lab2:     { icon: 'hardware-chip-outline',  color: '#d97706', colorLight: '#fef3c7' },
  lab3:     { icon: 'phone-portrait-outline', color: '#0d9488', colorLight: '#ccfbf1' },
};

function getMeta(facilityKey, dbColor) {
  const meta = FACILITY_META[facilityKey] ?? { icon: 'cube-outline', color: colors.primary, colorLight: '#EEF2FF' };
  return { ...meta, color: dbColor || meta.color };
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MyBookingsScreen({ navigation }) {
  const [bookings, setBookings]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const res = await get('/bookings/my');
      if (res.success) setBookings(res.data);
      else setError('Failed to load your bookings.');
    } catch (_) {
      setError('Cannot connect to server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refresh whenever screen comes into focus (e.g. after a new booking)
  useFocusEffect(useCallback(() => { fetchBookings(); }, [fetchBookings]));

  const pendingCount  = bookings.filter(b => b.status === 'PENDING').length;
  const approvedCount = bookings.filter(b => b.status === 'APPROVED').length;

  const renderItem = ({ item }) => {
    const statusCfg  = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.PENDING;
    const meta       = getMeta(item.facility?.facilityKey, item.facility?.color);
    const slotLabels = (item.slots ?? []).sort((a,b)=>a-b).map(i => TIME_SLOTS[i]).join(', ');

    return (
      <View style={styles.card}>
        <View style={[styles.cardAccent, { backgroundColor: meta.color }]} />
        <View style={styles.cardBody}>

          {/* Top: facility icon + name + status */}
          <View style={styles.cardTop}>
            <View style={[styles.facIcon, { backgroundColor: meta.colorLight }]}>
              <Ionicons name={meta.icon} size={18} color={meta.color} />
            </View>
            <Text style={styles.facilityName} numberOfLines={1}>{item.facility?.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
              <Ionicons name={statusCfg.icon} size={11} color={statusCfg.color} />
              <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Date + slots */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{formatDate(item.date)}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Time Slots</Text>
              <Text style={styles.detailValue} numberOfLines={2}>{slotLabels || '—'}</Text>
            </View>
          </View>

          {/* Purpose */}
          <View style={styles.purposeRow}>
            <Ionicons name="document-text-outline" size={12} color="#9CA3AF" />
            <Text style={styles.purposeText} numberOfLines={2}>{item.purpose}</Text>
          </View>

          <Text style={styles.submittedAt}>
            Submitted {new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.primary, '#0f2444']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={18} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>My Bookings</Text>
          <Text style={styles.headerSub}>
            {loading ? 'Loading…' : `${bookings.length} total · ${approvedCount} approved · ${pendingCount} pending`}
          </Text>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateText}>Loading your bookings…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <View style={styles.stateIconWrap}>
            <Ionicons name="cloud-offline-outline" size={30} color={colors.primary} />
          </View>
          <Text style={styles.stateTitle}>Connection Error</Text>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchBookings()}>
            <Ionicons name="refresh-outline" size={15} color="#fff" />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={() => fetchBookings(true)}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={styles.center}>
              <View style={styles.stateIconWrap}>
                <Ionicons name="bookmark-outline" size={28} color={colors.primary} />
              </View>
              <Text style={styles.stateTitle}>No bookings yet</Text>
              <Text style={styles.stateText}>Your submitted booking requests will appear here.</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
                <Ionicons name="add-outline" size={15} color="#fff" />
                <Text style={styles.retryText}>Book a Facility</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#F1F3F7' },
  header:     { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle:{ fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  headerSub:  { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  backBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  list:       { padding: spacing.md, paddingBottom: spacing.xl },
  card:       { backgroundColor: '#fff', borderRadius: radius.lg, marginBottom: 10, flexDirection: 'row', overflow: 'hidden', ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }, android: { elevation: 2 } }) },
  cardAccent: { width: 4, alignSelf: 'stretch' },
  cardBody:   { flex: 1, padding: spacing.md },
  cardTop:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  facIcon:    { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  facilityName: { flex: 1, fontSize: 14, fontWeight: '700', color: '#111827' },
  statusBadge:{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  statusText: { fontSize: 11, fontWeight: '700' },
  divider:    { height: 1, backgroundColor: '#F3F4F6', marginBottom: 10 },
  detailsGrid:{ flexDirection: 'row', gap: spacing.md, marginBottom: 8 },
  detailItem: { flex: 1 },
  detailLabel:{ fontSize: 10, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  detailValue:{ fontSize: 12, fontWeight: '600', color: '#111827', lineHeight: 16 },
  purposeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 6 },
  purposeText:{ flex: 1, fontSize: 12, color: '#6B7280', lineHeight: 17 },
  submittedAt:{ fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  stateIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  stateTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  stateText:  { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 32, marginTop: 4 },
  retryBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: radius.md },
  retryText:  { color: '#fff', fontWeight: '700', fontSize: 14 },
});