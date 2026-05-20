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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { get } from '../api/client';
import { theme } from '../theme/theme';

// ─── Target label helper ──────────────────────────────────────────────────────

function getTargetLabel(notice) {
  const { targetType, targetDepartment, targetYear, targetRole } = notice;
  if (!targetType || targetType === 'EVERYONE') return null;
  if (targetType === 'DEPARTMENT') {
    return { label: targetDepartment ? `For ${targetDepartment}` : 'Department', color: '#60a5fa' };
  }
  if (targetType === 'YEAR_GROUP') {
    const label = targetYear
      ? `Year ${targetYear}${targetDepartment ? ` · ${targetDepartment}` : ''}`
      : 'Year Group';
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

// ─── NoticeCard ───────────────────────────────────────────────────────────────

function NoticeCard({ notice, onPress }) {
  const iconName  = ICON_MAP[notice.icon] ?? CATEGORY_ICONS[notice.category] ?? 'megaphone';
  const targetInfo = getTargetLabel(notice);
  const dateStr = new Date(notice.date).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <TouchableOpacity
      style={[styles.card, notice.pinned && styles.cardPinned]}
      onPress={() => onPress(notice)}
      activeOpacity={0.8}
    >
      {notice.pinned && <View style={styles.pinRibbon} />}

      <View style={styles.cardHeader}>
        <View style={styles.iconWrap}>
          <Ionicons name={iconName} size={18} color={theme.colors.accent} />
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardTitle} numberOfLines={2}>{notice.title}</Text>
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
            {notice.pinned && (
              <View style={[styles.targetTag, { borderColor: '#ef444455', backgroundColor: '#ef444418' }]}>
                <Ionicons name="pin" size={10} color="#f87171" />
                <Text style={[styles.targetTagText, { color: '#f87171' }]}> Pinned</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <Text style={styles.cardBody} numberOfLines={3}>{notice.body}</Text>

      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>{dateStr}</Text>
        {notice.sentBy && (
          <Text style={styles.cardSender}>by {notice.sentBy.name}</Text>
        )}
        {notice.attachments?.length > 0 && (
          <View style={styles.attachmentBadge}>
            <Ionicons name="attach" size={12} color={theme.colors.accent} />
            <Text style={styles.attachmentText}>{notice.attachments.length}</Text>
          </View>
        )}
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
    } catch (e) {
      setError('Failed to load notices. Pull down to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadNotices(); }, [loadNotices]));

  // Filter whenever notices / search / category changes
  useEffect(() => {
    let list = [...notices];
    if (activeCategory !== 'All') {
      list = list.filter(n => n.category === activeCategory);
    }
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

  // Unique categories from data
  const categories = ['All', ...new Set(notices.map(n => n.category))];

  const pinned   = filtered.filter(n => n.pinned);
  const unpinned = filtered.filter(n => !n.pinned);
  const combined = [
    ...(pinned.length   > 0 ? [{ type: 'section', label: 'Pinned' }] : []),
    ...pinned.map(n => ({ type: 'notice', ...n })),
    ...(unpinned.length > 0 ? [{ type: 'section', label: 'Recent' }] : []),
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
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notice Board</Text>
        <Text style={styles.headerSub}>{notices.length} notices</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={theme.colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search notices…"
          placeholderTextColor={theme.colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category chips */}
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
            <Text style={[styles.chipText, activeCategory === cat && styles.chipTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={theme.colors.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadNotices()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : combined.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="megaphone-outline" size={40} color={theme.colors.textMuted} />
          <Text style={styles.emptyText}>No notices found</Text>
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
              colors={[theme.colors.accent]}
              tintColor={theme.colors.accent}
            />
          }
        />
      )}

      {/* Notice detail modal */}
      <Modal
        visible={!!selectedNotice}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedNotice(null)}
      >
        {selectedNotice && <NoticeDetail notice={selectedNotice} onClose={() => setSelectedNotice(null)} />}
      </Modal>
    </View>
  );
}

// ─── Notice detail ────────────────────────────────────────────────────────────

function NoticeDetail({ notice, onClose }) {
  const iconName   = ICON_MAP[notice.icon] ?? 'megaphone';
  const targetInfo = getTargetLabel(notice);
  const dateStr = new Date(notice.date).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <View style={styles.detail}>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.detailHeaderTitle}>Notice</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        contentContainerStyle={styles.detailContent}
      >
        {/* Icon + title */}
        <View style={styles.detailIconWrap}>
          <Ionicons name={iconName} size={28} color={theme.colors.accent} />
        </View>

        <Text style={styles.detailTitle}>{notice.title}</Text>

        {/* Badges */}
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
          {notice.pinned && (
            <View style={[styles.targetTag, { borderColor: '#ef444455', backgroundColor: '#ef444418' }]}>
              <Text style={[styles.targetTagText, { color: '#f87171' }]}>📌 Pinned</Text>
            </View>
          )}
        </View>

        {/* Meta */}
        <View style={styles.detailMeta}>
          <Ionicons name="calendar-outline" size={13} color={theme.colors.textMuted} />
          <Text style={styles.detailMetaText}>{dateStr}</Text>
        </View>
        {notice.sentBy && (
          <View style={styles.detailMeta}>
            <Ionicons name="person-outline" size={13} color={theme.colors.textMuted} />
            <Text style={styles.detailMetaText}>Published by {notice.sentBy.name}</Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* Body */}
        <Text style={styles.detailBody}>{notice.body}</Text>

        {/* Attachments (Phase 3 ready) */}
        {notice.attachments?.length > 0 && (
          <View style={styles.attachmentsSection}>
            <Text style={styles.attachmentsLabel}>Attachments</Text>
            {notice.attachments.map(att => (
              <View key={att.id} style={styles.attachmentRow}>
                <Ionicons
                  name={att.fileType?.startsWith('image') ? 'image-outline' : 'document-outline'}
                  size={16}
                  color={theme.colors.accent}
                />
                <Text style={styles.attachmentName} numberOfLines={1}>{att.fileName}</Text>
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
  screen:   { flex: 1, backgroundColor: theme.colors.background },

  // Header
  header: {
    backgroundColor: theme.colors.primary,
    paddingTop: (StatusBar.currentHeight ?? 48) + theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 2 },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.6)' },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface ?? '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  searchIcon:  { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.text, padding: 0 },

  // Category chips
  chipsRow: { paddingHorizontal: theme.spacing.md, gap: 8, paddingBottom: theme.spacing.sm },
  chip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 99, borderWidth: 1.5,
    borderColor: 'rgba(26,60,110,0.15)',
    backgroundColor: 'transparent',
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText:       { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary ?? '#64748b' },
  chipTextActive: { color: '#fff' },

  // List
  list:  { padding: theme.spacing.md, paddingTop: 4, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },

  // Section
  sectionRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: theme.colors.textMuted ?? '#94a3b8' },
  sectionLine:  { flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.06)' },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    position: 'relative',
    overflow: 'hidden',
  },
  cardPinned: { borderColor: theme.colors.accent + '55', borderWidth: 1.5 },
  pinRibbon:  {
    position: 'absolute', top: 0, right: 18,
    width: 3, height: 18,
    backgroundColor: theme.colors.accent,
    borderRadius: 0,
  },
  cardHeader:     { flexDirection: 'row', gap: 12, marginBottom: 10 },
  iconWrap: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: theme.colors.accent + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  cardHeaderText: { flex: 1 },
  cardTitle:      { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginBottom: 6, lineHeight: 20 },
  tagRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  categoryTag: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 99, backgroundColor: 'rgba(26,60,110,0.08)',
  },
  categoryTagText: { fontSize: 11, fontWeight: '600', color: theme.colors.primary },
  targetTag: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 99, borderWidth: 1,
  },
  targetTagText: { fontSize: 11, fontWeight: '600' },
  cardBody:   { fontSize: 13, color: theme.colors.textSecondary ?? '#64748b', lineHeight: 20, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardDate:   { fontSize: 11, color: theme.colors.textMuted ?? '#94a3b8', flex: 1 },
  cardSender: { fontSize: 11, color: theme.colors.textMuted ?? '#94a3b8' },
  attachmentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 99, backgroundColor: theme.colors.accent + '18',
  },
  attachmentText: { fontSize: 11, fontWeight: '600', color: theme.colors.accent },

  // Error / empty
  errorText: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center' },
  emptyText: { fontSize: 14, color: theme.colors.textMuted, textAlign: 'center' },
  retryBtn:  { marginTop: 8, paddingHorizontal: 20, paddingVertical: 8, backgroundColor: theme.colors.primary, borderRadius: 99 },
  retryText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Detail modal
  detail:      { flex: 1, backgroundColor: theme.colors.background },
  detailHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: (StatusBar.currentHeight ?? 48) + 8,
    paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  detailHeaderTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  closeBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  detailContent: { padding: theme.spacing.lg, gap: 12 },
  detailIconWrap: {
    width: 56, height: 56, borderRadius: 14,
    backgroundColor: theme.colors.accent + '18',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  detailTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.text, lineHeight: 28 },
  detailMeta:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailMetaText: { fontSize: 12, color: theme.colors.textMuted, flex: 1 },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.06)', marginVertical: 4 },
  detailBody: { fontSize: 15, color: theme.colors.text, lineHeight: 24 },
  attachmentsSection: { gap: 8, marginTop: 8 },
  attachmentsLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, color: theme.colors.textMuted },
  attachmentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, backgroundColor: 'rgba(26,60,110,0.05)' },
  attachmentName: { flex: 1, fontSize: 13, color: theme.colors.text },
});