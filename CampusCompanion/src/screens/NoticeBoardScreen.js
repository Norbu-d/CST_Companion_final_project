// src/screens/NoticeBoardScreen.js
// Connected to GET /notices?category=

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { get } from '../api/client';
import { colors, spacing, radius, shadows } from '../theme/theme';

// Category filter pills — 'All' is local; the rest are sent to the backend
const CATEGORIES = ['All', 'Exam', 'Event', 'Academic', 'Facility', 'General'];

const CATEGORY_COLORS = {
  Exam:     { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
  Event:    { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' },
  Academic: { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0' },
  Facility: { bg: '#FFF7ED', text: '#9A3412', border: '#FED7AA' },
  General:  { bg: '#F5F3FF', text: '#5B21B6', border: '#DDD6FE' },
};

const DEFAULT_CAT = { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' };

// Map icon string from DB to Ionicons name
const ICON_MAP = {
  'megaphone-outline':         'megaphone-outline',
  'book-outline':              'book-outline',
  'calendar-outline':          'calendar-outline',
  'construct-outline':         'construct-outline',
  'information-circle-outline':'information-circle-outline',
  'alert-circle-outline':      'alert-circle-outline',
  'school-outline':            'school-outline',
  'trophy-outline':            'trophy-outline',
};

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function NoticeBoardScreen() {

  const [notices, setNotices]         = useState([]);
  const [activeCategory, setCategory] = useState('All');
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [refreshing, setRefreshing]   = useState(false);

  const fetchNotices = useCallback(async (category, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const query = category !== 'All' ? `?category=${category}` : '';
      const res = await get(`/notices${query}`);
      if (res.success) setNotices(res.data);
      else setError('Failed to load notices.');
    } catch (_) {
      setError('Cannot connect to server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchNotices(activeCategory); }, [activeCategory, fetchNotices]);

  const handleCategoryPress = (cat) => {
    if (cat !== activeCategory) setCategory(cat);
  };

  const pinnedCount = useMemo(() => notices.filter(n => n.pinned).length, [notices]);

  const renderItem = ({ item }) => {
    const catStyle = CATEGORY_COLORS[item.category] ?? DEFAULT_CAT;
    const iconName = ICON_MAP[item.icon] ?? 'megaphone-outline';

    return (
      <View style={[styles.card, item.pinned && styles.cardPinned]}>
        {/* Pinned ribbon */}
        {item.pinned && (
          <View style={styles.pinnedRibbon}>
            <Ionicons name="pin" size={10} color="#fff" />
            <Text style={styles.pinnedText}>Pinned</Text>
          </View>
        )}

        {/* Card header */}
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: catStyle.bg, borderColor: catStyle.border }]}>
            <Ionicons name={iconName} size={18} color={catStyle.text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.noticeTitle} numberOfLines={2}>{item.title}</Text>
            <View style={styles.metaRow}>
              <View style={[styles.catBadge, { backgroundColor: catStyle.bg, borderColor: catStyle.border }]}>
                <Text style={[styles.catText, { color: catStyle.text }]}>{item.category}</Text>
              </View>
              <Text style={styles.dateText}>{formatDate(item.date)}</Text>
            </View>
          </View>
        </View>

        {/* Body */}
        <Text style={styles.noticeBody}>{item.body}</Text>
      </View>
    );
  };

  return (
    <View style={styles.root}>

      {/* Header */}
      <LinearGradient colors={[colors.primary, '#0f2444']} style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Notice Board</Text>
          <Text style={styles.headerSub}>
            {loading ? 'Loading…' : `${notices.length} notice${notices.length !== 1 ? 's' : ''}${pinnedCount > 0 ? ` · ${pinnedCount} pinned` : ''}`}
          </Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="notifications" size={24} color="rgba(255,255,255,0.25)" />
        </View>
      </LinearGradient>

      {/* Category filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {CATEGORIES.map((cat) => {
            const isActive = cat === activeCategory;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => handleCategoryPress(cat)}
                activeOpacity={0.75}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateText}>Loading notices…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <View style={styles.stateIconWrap}>
            <Ionicons name="cloud-offline-outline" size={30} color={colors.primary} />
          </View>
          <Text style={styles.stateTitle}>Connection Error</Text>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchNotices(activeCategory)}>
            <Ionicons name="refresh-outline" size={15} color="#fff" />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={notices}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={() => fetchNotices(activeCategory, true)}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={styles.center}>
              <View style={styles.stateIconWrap}>
                <Ionicons name="notifications-off-outline" size={28} color={colors.primary} />
              </View>
              <Text style={styles.stateTitle}>No notices</Text>
              <Text style={styles.stateText}>
                {activeCategory === 'All'
                  ? 'There are no notices at the moment.'
                  : `No notices in the "${activeCategory}" category.`}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F3F7' },

  header:      { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  headerIcon:  { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },

  filterContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EAECF0' },
  filterRow:       { paddingHorizontal: spacing.md, paddingVertical: 10, gap: 8 },
  filterChip:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  filterChipActive:{ backgroundColor: colors.primary, borderColor: colors.primary },
  filterText:      { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  filterTextActive:{ color: '#fff' },

  list: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xl },

  card: {
    backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.md,
    marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }, android: { elevation: 2 } }),
  },
  cardPinned:  { borderColor: colors.accent, borderWidth: 1.5 },
  pinnedRibbon:{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.accent, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, marginBottom: 10 },
  pinnedText:  { fontSize: 10, fontWeight: '700', color: '#fff' },

  cardHeader:  { flexDirection: 'row', gap: 12, marginBottom: 10, alignItems: 'flex-start' },
  iconWrap:    { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0 },
  noticeTitle: { fontSize: 14, fontWeight: '700', color: '#111827', lineHeight: 20, marginBottom: 6 },
  metaRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catBadge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, borderWidth: 1 },
  catText:     { fontSize: 10, fontWeight: '700' },
  dateText:    { fontSize: 11, color: '#9CA3AF' },
  noticeBody:  { fontSize: 13, color: '#4B5563', lineHeight: 20 },

  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  stateIconWrap:{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  stateTitle:   { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  stateText:    { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 32, marginTop: 4 },
  retryBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: radius.md },
  retryText:    { color: '#fff', fontWeight: '700', fontSize: 14 },
});