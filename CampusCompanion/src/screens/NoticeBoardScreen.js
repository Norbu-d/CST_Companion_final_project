import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, ScrollView,
  TextInput, StyleSheet, StatusBar, ActivityIndicator,
  RefreshControl, Image, Linking, Alert, Platform, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import EventSource from 'react-native-sse';
import { get, API_BASE } from '../api/client';
import { colors } from '../theme/theme';

const STATUS_BAR_HEIGHT = StatusBar.currentHeight || 44;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_COLORS = {
  General:     ['#4F8EF7', '#6B73FF'],
  Exam:        ['#F472B6', '#F87171'],
  Event:       ['#2DD4BF', '#3B82F6'],
  Maintenance: ['#F59E0B', '#F97316'],
  Holiday:     ['#34d399', '#10b981'],
  Academic:    ['#A78BFA', '#818CF8'],
  Emergency:   ['#ef4444', '#dc2626'],
  Leave:       ['#d97706', '#f59e0b'],
};

const CATEGORY_ICONS = {
  General: 'megaphone', Exam: 'book', Event: 'calendar',
  Maintenance: 'construct', Holiday: 'sunny', Academic: 'school', Emergency: 'alert-circle',
  Leave: 'bed-outline',
};

function gradFor(cat) { return CATEGORY_COLORS[cat] ?? ['#4F8EF7', '#6B73FF']; }
function iconFor(cat) { return CATEGORY_ICONS[cat] ?? 'megaphone'; }

function fmtDate(iso, long = false) {
  return new Date(iso).toLocaleDateString('en-GB', long
    ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    : { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Hide internal leave link marker from notice text */
function displayBody(body) {
  if (!body) return '';
  return body.replace(/\s*\[leave:\d+\]\s*$/, '').trim();
}

function getTargetLabel(notice) {
  const { targetType, targetDepartment, targetYear, targetRole } = notice;
  if (!targetType || targetType === 'EVERYONE') return null;
  const dept = targetDepartment ? String(targetDepartment).replace(/_/g, ' ') : '';
  if (targetType === 'DEPARTMENT') return { label: dept ? `For ${dept}` : 'Your dept', color: '#60a5fa' };
  if (targetType === 'YEAR_GROUP')  return { label: `Year ${targetYear ?? ''}${dept ? ` · ${dept}` : ''}`, color: '#34d399' };
  if (targetType === 'ROLE_ONLY')   return { label: targetRole === 'STUDENTS_ONLY' ? 'Students Only' : 'Lecturers Only', color: '#fbbf24' };
  return null;
}

// ─── NoticeCard ───────────────────────────────────────────────────────────────

function NoticeCard({ notice, onPress }) {
  const grad   = gradFor(notice.category);
  const target = getTargetLabel(notice);

  return (
    <TouchableOpacity style={[S.card, notice.pinned && S.cardPinned]} onPress={() => onPress(notice)} activeOpacity={0.82}>
      <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={S.cardBar} />
      <View style={S.cardInner}>
        <LinearGradient colors={grad} style={S.iconWrap}>
          <Ionicons name={iconFor(notice.category)} size={16} color="#fff" />
        </LinearGradient>

        <View style={{ flex: 1 }}>
          <View style={S.row}>
            <Text style={S.cardTitle} numberOfLines={2}>{notice.title}</Text>
            {notice.pinned && <Ionicons name="pin" size={13} color={colors.accent} style={{ marginLeft: 6 }} />}
          </View>
          <Text style={S.cardBody} numberOfLines={2}>{displayBody(notice.body)}</Text>

          <View style={S.tagRow}>
            <View style={S.catTag}><Text style={S.catTagTxt}>{notice.category}</Text></View>
            {target && (
              <View style={[S.targetTag, { borderColor: target.color + '55', backgroundColor: target.color + '18' }]}>
                <Text style={[S.targetTagTxt, { color: target.color }]}>{target.label}</Text>
              </View>
            )}
          </View>

          <View style={S.row}>
            <Ionicons name="calendar-outline" size={11} color="#9CA3AF" />
            <Text style={S.meta}>{fmtDate(notice.date)}</Text>
            {notice.sentBy && <><Text style={S.dot}>·</Text><Text style={S.meta}>{notice.sentBy.name}</Text></>}
            {notice.attachments?.length > 0 && (
              <View style={S.attBadge}>
                <Ionicons name="attach" size={11} color={colors.accent} />
                <Text style={S.attBadgeTxt}>{notice.attachments.length}</Text>
              </View>
            )}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color="#D1D5DB" style={{ alignSelf: 'center' }} />
      </View>
    </TouchableOpacity>
  );
}

// ─── NoticeDetail ─────────────────────────────────────────────────────────────

async function openAtt(att) {
  try {
    if (!(await Linking.canOpenURL(att.fileUrl))) {
      return Alert.alert('Cannot open', 'This file type is not supported.');
    }
    await Linking.openURL(att.fileUrl);
  } catch { Alert.alert('Error', 'Could not open the attachment.'); }
}

function NoticeDetail({ notice, onClose }) {
  const grad   = gradFor(notice.category);
  const target = getTargetLabel(notice);

  return (
    <View style={S.detail}>
      <View style={S.detailNav}>
        <TouchableOpacity onPress={onClose} style={S.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={20} color="#1A2340" />
        </TouchableOpacity>
        <Text style={S.detailNavTitle}>Notice</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.detailContent}>
        {/* Hero */}
        <LinearGradient colors={grad} style={S.hero}>
          <View style={S.heroIcon}>
            <Ionicons name={iconFor(notice.category)} size={26} color="#fff" />
          </View>
          <Text style={S.heroCategory}>{notice.category.toUpperCase()}</Text>
          <Text style={S.heroTitle}>{notice.title}</Text>
        </LinearGradient>

        {/* Meta */}
        <View style={S.card2}>
          <MetaRow icon="calendar-outline" text={fmtDate(notice.date, true)} />
          {notice.sentBy && <MetaRow icon="person-outline" text={`Published by ${notice.sentBy.name}`} />}
          <View style={[S.tagRow, { marginTop: 6 }]}>
            {target && (
              <View style={[S.targetTag, { borderColor: target.color + '55', backgroundColor: target.color + '18' }]}>
                <Text style={[S.targetTagTxt, { color: target.color }]}>{target.label}</Text>
              </View>
            )}
            {notice.pinned && (
              <View style={[S.targetTag, { borderColor: '#F59E0B55', backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="pin" size={11} color="#F59E0B" />
                <Text style={[S.targetTagTxt, { color: '#92400E', marginLeft: 3 }]}>Pinned</Text>
              </View>
            )}
          </View>
        </View>

        {/* Body */}
        <View style={S.card2}>
          <Text style={S.sectionLabel}>MESSAGE</Text>
          <Text style={S.bodyText}>{displayBody(notice.body)}</Text>
        </View>

        {/* Attachments */}
        {notice.attachments?.length > 0 && (
          <View style={S.card2}>
            <Text style={S.sectionLabel}>ATTACHMENTS ({notice.attachments.length})</Text>
            {notice.attachments.map(att => (
              <View key={att.id} style={{ gap: 8 }}>
                {att.fileType === 'IMAGE' && (
                  <TouchableOpacity onPress={() => openAtt(att)} activeOpacity={0.9}>
                    <Image source={{ uri: att.fileUrl }} style={S.attImg} resizeMode="cover" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={S.attRow} onPress={() => openAtt(att)} activeOpacity={0.8}>
                  <LinearGradient colors={grad} style={S.attIcon}>
                    <Ionicons name={att.fileType === 'IMAGE' ? 'image-outline' : 'document-text-outline'} size={16} color="#fff" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={S.attName} numberOfLines={2}>{att.fileName}</Text>
                    <Text style={S.attSub}>{att.fileType === 'IMAGE' ? 'Tap to view' : 'Tap to open'}</Text>
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

function MetaRow({ icon, text }) {
  return (
    <View style={S.metaRow}>
      <View style={S.metaIcon}><Ionicons name={icon} size={14} color={colors.primary} /></View>
      <Text style={S.metaTxt}>{text}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NoticeBoardScreen() {
  const [notices,   setNotices]   = useState([]);
  const [filtered,  setFiltered]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [error,     setError]     = useState(null);
  const [search,    setSearch]    = useState('');
  const [activeCat, setActiveCat] = useState('All');
  const [selected,  setSelected]  = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      const res = await get('/notices');
      setNotices(res.data ?? []);
    } catch {
      setError('Failed to load notices. Pull down to retry.');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // SSE
  useEffect(() => {
    let es = null, timer = null;
    const connect = async () => {
      try {
        const token = await require('@react-native-async-storage/async-storage').default.getItem('token');
        if (!token) return;
        es = new EventSource(`${API_BASE}/notices/live`, { headers: { Authorization: `Bearer ${token}` } });
        es.onmessage = (e) => {
          try {
            const n = JSON.parse(e.data);
            if (n.type === 'connected') return;
            if (n.type === 'deleted' && n.id) {
              setNotices(prev => prev.filter(item => item.id !== n.id));
              return;
            }
            setNotices(prev => [n, ...prev.filter(item => item.id !== n.id)]);
          } catch {}
        };
        es.onerror = () => { es?.close(); timer = setTimeout(connect, 5000); };
      } catch {}
    };
    connect();
    return () => { es?.close(); if (timer) clearTimeout(timer); };
  }, []);

  // Filter
  useEffect(() => {
    let list = activeCat === 'All' ? [...notices] : notices.filter(n => n.category === activeCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(n =>
        n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
      );
    }
    setFiltered(list);
  }, [notices, search, activeCat]);

  const categories = ['All', ...new Set(notices.map(n => n.category))];
  const pinned   = filtered.filter(n => n.pinned);
  const unpinned = filtered.filter(n => !n.pinned);
  const combined = [
    ...(pinned.length   ? [{ type: 'section', label: 'Pinned', id: 's-pinned' }]  : []),
    ...pinned.map(n => ({ type: 'notice', ...n })),
    ...(unpinned.length ? [{ type: 'section', label: 'Recent', id: 's-recent' }]  : []),
    ...unpinned.map(n => ({ type: 'notice', ...n })),
  ];

  return (
    <View style={S.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Navbar */}
      <View style={S.navbar}>
        <View style={S.row}>
          <LinearGradient colors={[colors.primary, colors.primaryDark ?? '#0F2580']} style={S.navIcon}>
            <Ionicons name="megaphone" size={18} color="#fff" />
          </LinearGradient>
          <View>
            <Text style={S.navTitle}>Notice Board</Text>
            <Text style={S.navSub}>{notices.length} notice{notices.length !== 1 ? 's' : ''}</Text>
          </View>
        </View>
      </View>

      {/* Search */}
      <View style={S.searchBar}>
        <Ionicons name="search" size={15} color="#9CA3AF" style={{ marginRight: 8 }} />
        <TextInput
          style={S.searchInput} placeholder="Search notices…" placeholderTextColor="#9CA3AF"
          value={search} onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category chips — fixed height, fixed minWidth to prevent jitter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.chips}>
        {categories.map(cat => {
          const active = activeCat === cat;
          return (
            <TouchableOpacity key={cat} style={[S.chip, active && S.chipActive]} onPress={() => setActiveCat(cat)} activeOpacity={0.8}>
              {active
                ? <LinearGradient colors={[colors.primary, colors.primaryDark ?? '#0F2580']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.chipGrad}>
                    <Text style={[S.chipTxt, S.chipTxtActive]}>{cat}</Text>
                  </LinearGradient>
                : <Text style={S.chipTxt}>{cat}</Text>
              }
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Body */}
      {loading ? (
        <View style={S.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={S.meta}>Loading notices…</Text>
        </View>
      ) : error ? (
        <View style={S.center}>
          <Ionicons name="cloud-offline-outline" size={32} color="#9CA3AF" />
          <Text style={S.emptyTitle}>Connection Error</Text>
          <Text style={[S.meta, { textAlign: 'center' }]}>{error}</Text>
          <TouchableOpacity style={S.retryBtn} onPress={() => load()}>
            <Text style={S.retryTxt}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : combined.length === 0 ? (
        <View style={S.center}>
          <Ionicons name="megaphone-outline" size={32} color="#9CA3AF" />
          <Text style={S.emptyTitle}>No notices</Text>
          <Text style={S.meta}>{search ? 'Try a different search' : 'Check back later'}</Text>
        </View>
      ) : (
        <FlatList
          data={combined}
          keyExtractor={item => item.id?.toString() ?? item.id}
          renderItem={({ item }) =>
            item.type === 'section'
              ? <View style={S.sectionRow}><Text style={S.sectionLabel}>{item.label}</Text><View style={S.sectionLine} /></View>
              : <NoticeCard notice={item} onPress={setSelected} />
          }
          contentContainerStyle={S.list}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[colors.primary]} tintColor={colors.primary} />}
        />
      )}

      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelected(null)}>
        {selected && <NoticeDetail notice={selected} onClose={() => setSelected(null)} />}
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_SHADOW = Platform.select({
  ios:     { shadowColor: '#C4C9D4', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
  android: { elevation: 2 },
});

const S = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: '#F4F6FB' },

  // Navbar
  navbar: {
    backgroundColor: '#fff', paddingTop: STATUS_BAR_HEIGHT + 6, paddingBottom: 10,
    paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#EAECF4',
    ...Platform.select({ ios: { shadowColor: '#C4C9D4', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 4 }, android: { elevation: 3 } }),
  },
  navIcon:  { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  navTitle: { fontSize: 15, fontWeight: '800', color: '#1A2340', letterSpacing: -0.3 },
  navSub:   { fontSize: 10, color: '#8A95B0', fontWeight: '500', marginTop: 1 },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    margin: 14, marginBottom: 8,
    paddingHorizontal: 14, paddingVertical: 11,
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#EAECF4', ...CARD_SHADOW,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1A2340', padding: 0 },

  // Chips — fixed height + minWidth prevents size jitter
  chips: { paddingHorizontal: 14, gap: 8, paddingBottom: 10 },
  chip: {
    height: 34, minWidth: 60,
    borderRadius: 99, borderWidth: 1.5,
    borderColor: 'rgba(26,60,110,0.15)',
    backgroundColor: '#fff', overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  chipActive:    { borderColor: 'transparent' },
  chipGrad:      { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  chipTxt:       { fontSize: 12, fontWeight: '600', color: '#64748b', paddingHorizontal: 14 },
  chipTxtActive: { color: '#fff' },

  // List
  list:       { padding: 14, paddingTop: 4, gap: 10 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#1A2340' },
  retryBtn:   { marginTop: 4, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 99 },
  retryTxt:   { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Section
  sectionRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  sectionLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: '#94a3b8' },
  sectionLine:  { flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.06)' },

  // Card
  card: {
    backgroundColor: '#fff', borderRadius: 16, flexDirection: 'row',
    overflow: 'hidden', borderWidth: 1, borderColor: '#EAECF4', ...CARD_SHADOW,
  },
  cardPinned: { borderColor: (colors.accent ?? '#F59E0B') + '66', borderWidth: 1.5 },
  cardBar:    { width: 4 },
  cardInner:  { flex: 1, flexDirection: 'row', padding: 13, gap: 11 },
  iconWrap:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardTitle:  { fontSize: 14, fontWeight: '800', color: '#1A2340', lineHeight: 20, flex: 1 },
  cardBody:   { fontSize: 12, color: '#6B7280', lineHeight: 17, marginTop: 3, marginBottom: 8 },

  // Tags
  tagRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 7 },
  catTag:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, backgroundColor: 'rgba(26,60,110,0.08)' },
  catTagTxt:   { fontSize: 10, fontWeight: '700', color: colors.primary },
  targetTag:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, borderWidth: 1 },
  targetTagTxt:{ fontSize: 10, fontWeight: '600' },

  // Footer row
  row:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta:    { fontSize: 11, color: '#9CA3AF' },
  dot:     { fontSize: 11, color: '#D1D5DB' },
  attBadge:{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99, backgroundColor: (colors.accent ?? '#F59E0B') + '18' },
  attBadgeTxt: { fontSize: 10, fontWeight: '700', color: colors.accent },

  // Detail
  detail:     { flex: 1, backgroundColor: '#F4F6FB' },
  detailNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingTop: STATUS_BAR_HEIGHT + 6, paddingBottom: 10,
    paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#EAECF4',
    ...Platform.select({ ios: { shadowColor: '#C4C9D4', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4 }, android: { elevation: 3 } }),
  },
  detailNavTitle: { fontSize: 16, fontWeight: '800', color: '#1A2340' },
  backBtn:        { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#F4F6FB' },
  detailContent:  { padding: 14, gap: 12, paddingBottom: 40 },

  // Hero
  hero: { borderRadius: 18, padding: 20, paddingVertical: 24, overflow: 'hidden' },
  heroIcon: {
    width: 50, height: 50, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  heroCategory: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 6 },
  heroTitle:    { color: '#fff', fontSize: 20, fontWeight: '800', lineHeight: 26 },

  // Cards in detail
  card2: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 10,
    borderWidth: 1, borderColor: '#EAECF4', ...CARD_SHADOW,
  },
  metaRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(26,60,110,0.08)', alignItems: 'center', justifyContent: 'center' },
  metaTxt:  { fontSize: 13, color: '#374151', flex: 1 },
  bodyText: { fontSize: 15, color: '#1A2340', lineHeight: 24 },

  // Attachment
  attImg:  { width: '100%', height: 190, borderRadius: 12, backgroundColor: '#F4F6FB' },
  attRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, backgroundColor: '#F4F6FB' },
  attIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  attName: { fontSize: 13, fontWeight: '600', color: '#1A2340' },
  attSub:  { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
});