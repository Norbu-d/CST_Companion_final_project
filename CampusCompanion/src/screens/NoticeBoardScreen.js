import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Image,
  Linking,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { get } from '../api/client';
import { colors, spacing } from '../theme/theme';

const { width: SW } = Dimensions.get('window');
const STATUS_BAR_HEIGHT = StatusBar.currentHeight || 44;

// ─── Target label helper ──────────────────────────────────────────────────────

function formatDept(val) {
  if (!val) return '';
  return String(val).replace(/_/g, ' ');
}

function getTargetLabel(notice) {
  const { targetType, targetDepartment, targetYear, targetRole } = notice;
  if (!targetType || targetType === 'EVERYONE') return null;
  if (targetType === 'DEPARTMENT') {
    return {
      label: targetDepartment ? `For ${formatDept(targetDepartment)}` : 'Your department',
      color: '#60a5fa',
    };
  }
  if (targetType === 'YEAR_GROUP') {
    const label = targetYear
      ? `Year ${targetYear}${targetDepartment ? ` · ${formatDept(targetDepartment)}` : ''}`
      : 'Year group';
    return { label, color: '#34d399' };
  }
  if (targetType === 'ROLE_ONLY') {
    return {
      label: targetRole === 'STUDENTS_ONLY' ? 'Students Only' : 'Lecturers Only',
      color: '#fbbf24',
    };
  }
  return null;
}

// ─── Icons map ────────────────────────────────────────────────────────────────

const ICON_MAP = {
  megaphone: 'megaphone',
  book:      'book',
  alert:     'alert-circle',
  info:      'information-circle',
  calendar:  'calendar',
};

const CATEGORY_ICONS = {
  General:     'megaphone',
  Exam:        'book',
  Event:       'calendar',
  Maintenance: 'construct',
  Holiday:     'sunny',
  Academic:    'school',
  Emergency:   'alert-circle',
};

const CATEGORY_COLORS = {
  General:     ['#4F8EF7', '#6B73FF'],
  Exam:        ['#F472B6', '#F87171'],
  Event:       ['#2DD4BF', '#3B82F6'],
  Maintenance: ['#F59E0B', '#F97316'],
  Holiday:     ['#34d399', '#10b981'],
  Academic:    ['#A78BFA', '#818CF8'],
  Emergency:   ['#ef4444', '#dc2626'],
};

// ─── NoticeCard ───────────────────────────────────────────────────────────────

function NoticeCard({ notice, onPress }) {
  const iconName   = ICON_MAP[notice.icon] ?? CATEGORY_ICONS[notice.category] ?? 'megaphone';
  const targetInfo = getTargetLabel(notice);
  const gradColors = CATEGORY_COLORS[notice.category] ?? ['#4F8EF7', '#6B73FF'];
  const dateStr = new Date(notice.date).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <TouchableOpacity
      style={[styles.card, notice.pinned && styles.cardPinned]}
      onPress={() => onPress(notice)}
      activeOpacity={0.82}
    >
      {/* Left gradient accent bar */}
      <LinearGradient
        colors={gradColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.cardBar}
      />

      <View style={styles.cardInner}>
        {/* Icon */}
        <LinearGradient
          colors={gradColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconWrap}
        >
          <Ionicons name={iconName} size={16} color="#fff" />
        </LinearGradient>

        <View style={styles.cardContent}>
          {/* Title row */}
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={2}>{notice.title}</Text>
            {notice.pinned && (
              <Ionicons name="pin" size={14} color={colors.accent} style={{ marginLeft: 6, marginTop: 2 }} />
            )}
          </View>

          {/* Body preview */}
          <Text style={styles.cardBody} numberOfLines={2}>{notice.body}</Text>

          {/* Tags */}
          <View style={styles.tagRow}>
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>{notice.category}</Text>
            </View>
            {targetInfo && (
              <View style={[styles.targetTag, { borderColor: targetInfo.color + '55', backgroundColor: targetInfo.color + '18' }]}>
                <Text style={[styles.targetTagText, { color: targetInfo.color }]}>
                  {targetInfo.label}
                </Text>
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={styles.cardFooter}>
            <Ionicons name="calendar-outline" size={11} color="#9CA3AF" />
            <Text style={styles.cardDate}>{dateStr}</Text>
            {notice.sentBy && (
              <>
                <Text style={styles.cardDot}>·</Text>
                <Text style={styles.cardSender}>{notice.sentBy.name}</Text>
              </>
            )}
            {notice.attachments?.length > 0 && (
              <View style={styles.attachmentBadge}>
                <Ionicons name="attach" size={11} color={colors.accent} />
                <Text style={styles.attachmentText}>{notice.attachments.length}</Text>
              </View>
            )}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color="#D1D5DB" style={{ alignSelf: 'center' }} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function NoticeBoardScreen() {
  const [notices,        setNotices]        = useState([]);
  const [filtered,       setFiltered]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [error,          setError]          = useState(null);
  const [search,         setSearch]         = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedNotice, setSelectedNotice] = useState(null);

  const loadNotices = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await get('/notices');
      setNotices(res.data ?? []);
    } catch {
      setError('Failed to load notices. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadNotices(); }, [loadNotices]));

  useEffect(() => {
    let list = [...notices];
    if (activeCategory !== 'All') list = list.filter(n => n.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q)
      );
    }
    setFiltered(list);
  }, [notices, search, activeCategory]);

  const categories = ['All', ...new Set(notices.map(n => n.category))];
  const pinned   = filtered.filter(n => n.pinned);
  const unpinned = filtered.filter(n => !n.pinned);
  const combined = [
    ...(pinned.length   > 0 ? [{ type: 'section', label: 'Pinned' }]  : []),
    ...pinned.map(n => ({ type: 'notice', ...n })),
    ...(unpinned.length > 0 ? [{ type: 'section', label: 'Recent' }]  : []),
    ...unpinned.map(n => ({ type: 'notice', ...n })),
  ];

  const renderItem = ({ item }) => {
    if (item.type === 'section') {
      return (
        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>{item.label}</Text>
          <View style={styles.sectionLine} />
        </View>
      );
    }
    return <NoticeCard notice={item} onPress={setSelectedNotice} />;
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* ── Navbar (matches HomeScreen style) ── */}
      <View style={styles.navbar}>
        <View style={styles.navBrand}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark ?? '#0F2580']}
            style={styles.navIconWrap}
          >
            <Ionicons name="megaphone" size={18} color="#fff" />
          </LinearGradient>
          <View>
            <Text style={styles.brandName}>Notice Board</Text>
            <Text style={styles.brandSub}>
              {notices.length} notice{notices.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Search bar ── */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={15} color="#9CA3AF" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search notices…"
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Category chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {categories.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, activeCategory === cat && styles.chipActive]}
            onPress={() => setActiveCategory(cat)}
            activeOpacity={0.8}
          >
            {activeCategory === cat ? (
              <LinearGradient
                colors={[colors.primary, colors.primaryDark ?? '#0F2580']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.chipGrad}
              >
                <Text style={[styles.chipText, styles.chipTextActive]}>{cat}</Text>
              </LinearGradient>
            ) : (
              <Text style={styles.chipText}>{cat}</Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── List ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading notices…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons name="cloud-offline-outline" size={28} color="#9CA3AF" />
          </View>
          <Text style={styles.emptyTitle}>Connection Error</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadNotices()}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : combined.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons name="megaphone-outline" size={28} color="#9CA3AF" />
          </View>
          <Text style={styles.emptyTitle}>No notices</Text>
          <Text style={styles.emptyText}>
            {search ? 'Try a different search term' : 'Check back later'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={combined}
          keyExtractor={(item, i) => item.id?.toString() ?? `section-${i}`}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadNotices(true)}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* ── Notice detail modal ── */}
      <Modal
        visible={!!selectedNotice}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedNotice(null)}
      >
        {selectedNotice && (
          <NoticeDetail notice={selectedNotice} onClose={() => setSelectedNotice(null)} />
        )}
      </Modal>
    </View>
  );
}

// ─── Notice detail ────────────────────────────────────────────────────────────

async function openAttachment(att) {
  try {
    const supported = await Linking.canOpenURL(att.fileUrl);
    if (!supported) {
      Alert.alert('Cannot open file', 'This file type is not supported on your device.');
      return;
    }
    await Linking.openURL(att.fileUrl);
  } catch {
    Alert.alert('Error', 'Could not open the attachment.');
  }
}

function NoticeDetail({ notice, onClose }) {
  const iconName   = ICON_MAP[notice.icon] ?? 'megaphone';
  const targetInfo = getTargetLabel(notice);
  const gradColors = CATEGORY_COLORS[notice.category] ?? ['#4F8EF7', '#6B73FF'];
  const dateStr = new Date(notice.date).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <View style={styles.detail}>
      {/* Detail navbar */}
      <View style={styles.detailNavbar}>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={20} color="#1A2340" />
        </TouchableOpacity>
        <Text style={styles.detailNavTitle}>Notice</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        contentContainerStyle={styles.detailContent}
      >
        {/* Hero gradient banner */}
        <LinearGradient
          colors={gradColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.detailHero}
        >
          <View style={styles.detailHeroDeco1} />
          <View style={styles.detailHeroDeco2} />
          <View style={styles.detailHeroIcon}>
            <Ionicons name={iconName} size={28} color="#fff" />
          </View>
          <Text style={styles.detailHeroCategory}>{notice.category}</Text>
          <Text style={styles.detailHeroTitle}>{notice.title}</Text>
        </LinearGradient>

        {/* Meta card */}
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <View style={styles.metaIconWrap}>
              <Ionicons name="calendar-outline" size={14} color={colors.primary} />
            </View>
            <Text style={styles.metaText}>{dateStr}</Text>
          </View>
          {notice.sentBy && (
            <View style={styles.metaRow}>
              <View style={styles.metaIconWrap}>
                <Ionicons name="person-outline" size={14} color={colors.primary} />
              </View>
              <Text style={styles.metaText}>Published by {notice.sentBy.name}</Text>
            </View>
          )}

          {/* Badges */}
          <View style={[styles.tagRow, { marginTop: 10 }]}>
            {targetInfo && (
              <View style={[styles.targetTag, { borderColor: targetInfo.color + '55', backgroundColor: targetInfo.color + '18' }]}>
                <Text style={[styles.targetTagText, { color: targetInfo.color }]}>
                  {targetInfo.label}
                </Text>
              </View>
            )}
            {notice.pinned && (
              <View style={[styles.targetTag, { borderColor: '#F59E0B55', backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="pin" size={11} color="#F59E0B" />
                <Text style={[styles.targetTagText, { color: '#92400E' }]}> Pinned</Text>
              </View>
            )}
          </View>
        </View>

        {/* Body */}
        <View style={styles.bodyCard}>
          <Text style={styles.bodyCardLabel}>MESSAGE</Text>
          <Text style={styles.detailBody}>{notice.body}</Text>
        </View>

        {/* Attachments */}
        {notice.attachments?.length > 0 && (
          <View style={styles.attachmentsCard}>
            <Text style={styles.bodyCardLabel}>ATTACHMENTS ({notice.attachments.length})</Text>
            {notice.attachments.map(att => (
              <View key={att.id} style={styles.attachmentBlock}>
                {att.fileType === 'IMAGE' && (
                  <TouchableOpacity onPress={() => openAttachment(att)} activeOpacity={0.9}>
                    <Image source={{ uri: att.fileUrl }} style={styles.attachmentImage} resizeMode="cover" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.attachmentRow}
                  onPress={() => openAttachment(att)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={gradColors}
                    style={styles.attachmentIconWrap}
                  >
                    <Ionicons
                      name={att.fileType === 'IMAGE' ? 'image-outline' : att.fileType === 'PDF' ? 'document-text-outline' : 'document-outline'}
                      size={16}
                      color="#fff"
                    />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.attachmentName} numberOfLines={2}>{att.fileName}</Text>
                    <Text style={styles.attachmentAction}>
                      {att.fileType === 'IMAGE' ? 'Tap to view full size' : 'Tap to download / open'}
                    </Text>
                  </View>
                  <Ionicons name="download-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F6FB' },

  // Navbar (matches HomeScreen)
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingTop: STATUS_BAR_HEIGHT + 6,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EAECF4',
    ...Platform.select({
      ios:     { shadowColor: '#C4C9D4', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  navBrand:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  brandName:   { fontSize: 15, fontWeight: '800', color: '#1A2340', letterSpacing: -0.3 },
  brandSub:    { fontSize: 10, color: '#8A95B0', fontWeight: '500', marginTop: 1 },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EAECF4',
    ...Platform.select({
      ios:     { shadowColor: '#C4C9D4', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1A2340', padding: 0 },

  // Chips
  chipsRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 10 },
  chip: {
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: 'rgba(26,60,110,0.15)',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  chipGrad:       { paddingHorizontal: 14, paddingVertical: 6 },
  chipActive:     { borderColor: 'transparent' },
  chipText:       { fontSize: 12, fontWeight: '600', color: '#64748b', paddingHorizontal: 14, paddingVertical: 6 },
  chipTextActive: { color: '#fff' },

  // List
  list:   { padding: 16, paddingTop: 4, gap: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },

  // Loading / empty
  loadingText: { fontSize: 13, color: '#9CA3AF', marginTop: 8 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#EAECF4',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#1A2340' },
  emptyText:  { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  retryBtn:   { marginTop: 4, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 99 },
  retryText:  { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Section headers
  sectionRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4, marginTop: 4 },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: '#94a3b8' },
  sectionLine:  { flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.06)' },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EAECF4',
    ...Platform.select({
      ios:     { shadowColor: '#C4C9D4', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  cardPinned: { borderColor: colors.accent + '66', borderWidth: 1.5 },
  cardBar:    { width: 4, alignSelf: 'stretch' },
  cardInner:  { flex: 1, flexDirection: 'row', padding: 14, gap: 12, alignItems: 'flex-start' },
  iconWrap:   { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardContent:  { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  cardTitle:    { fontSize: 14, fontWeight: '800', color: '#1A2340', lineHeight: 20, flex: 1 },
  cardBody:     { fontSize: 12, color: '#6B7280', lineHeight: 18, marginBottom: 8 },
  tagRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  categoryTag:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, backgroundColor: 'rgba(26,60,110,0.08)' },
  categoryTagText: { fontSize: 10, fontWeight: '700', color: colors.primary },
  targetTag:    { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, borderWidth: 1 },
  targetTagText: { fontSize: 10, fontWeight: '600' },
  cardFooter:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardDate:     { fontSize: 11, color: '#9CA3AF' },
  cardDot:      { fontSize: 11, color: '#D1D5DB' },
  cardSender:   { fontSize: 11, color: '#9CA3AF', flex: 1 },
  attachmentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 99, backgroundColor: colors.accent + '18',
  },
  attachmentText: { fontSize: 10, fontWeight: '700', color: colors.accent },

  // Detail modal
  detail:      { flex: 1, backgroundColor: '#F4F6FB' },
  detailNavbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingTop: STATUS_BAR_HEIGHT + 6,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EAECF4',
    ...Platform.select({
      ios:     { shadowColor: '#C4C9D4', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  detailNavTitle: { fontSize: 16, fontWeight: '800', color: '#1A2340' },
  closeBtn:       { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#F4F6FB' },
  detailContent:  { padding: 16, gap: 12, paddingBottom: 40 },

  // Detail hero banner
  detailHero: {
    borderRadius: 20,
    padding: 20,
    paddingTop: 24,
    paddingBottom: 24,
    overflow: 'hidden',
    minHeight: 160,
    justifyContent: 'flex-end',
  },
  detailHeroDeco1: {
    position: 'absolute', right: -30, top: -30,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  detailHeroDeco2: {
    position: 'absolute', left: -20, bottom: -20,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  detailHeroIcon: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  detailHeroCategory: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
  detailHeroTitle:    { color: '#fff', fontSize: 20, fontWeight: '800', lineHeight: 26, letterSpacing: -0.3 },

  // Meta card
  metaCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#EAECF4',
    ...Platform.select({
      ios:     { shadowColor: '#C4C9D4', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  metaRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaIconWrap:{ width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(26,60,110,0.08)', alignItems: 'center', justifyContent: 'center' },
  metaText:    { fontSize: 13, color: '#374151', flex: 1 },

  // Body card
  bodyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EAECF4',
    ...Platform.select({
      ios:     { shadowColor: '#C4C9D4', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  bodyCardLabel: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  detailBody:    { fontSize: 15, color: '#1A2340', lineHeight: 24 },

  // Attachments card
  attachmentsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#EAECF4',
    ...Platform.select({
      ios:     { shadowColor: '#C4C9D4', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  attachmentBlock:   { gap: 8 },
  attachmentImage:   { width: '100%', height: 200, borderRadius: 12, backgroundColor: '#F4F6FB' },
  attachmentRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, backgroundColor: '#F4F6FB' },
  attachmentIconWrap:{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  attachmentName:    { fontSize: 13, fontWeight: '600', color: '#1A2340' },
  attachmentAction:  { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
});