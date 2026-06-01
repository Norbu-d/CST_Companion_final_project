// src/screens/ContactsScreen.js

import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Platform, StatusBar, Linking, Modal, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { get } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors, DEPT_COLORS } from '../theme/theme';

const STATUS_H = StatusBar.currentHeight || 44;

const DEPARTMENT_OPTIONS = [
  'SOFTWARE_ENGINEERING',
  'INFORMATION_TECHNOLOGY',
  'ELECTRICAL_ENGINEERING',
  'CIVIL_ENGINEERING',
  'MECHANICAL_ENGINEERING',
  'ELECTRONICS_ENGINEERING',
  'INSTRUMENTATION_ENGINEERING',
  'ARCHITECTURE',
  'WATER_RESOURCE_ENGINEERING',
  'GEOLOGY',
];

function formatDept(dept) {
  if (!dept) return '';
  return String(dept).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function contactsScopeParam(deptFilter) {
  if (deptFilter === 'all') return 'all';
  if (deptFilter === 'mine') return 'mine';
  return deptFilter;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

const Avatar = memo(function Avatar({ name, color, textColor, size = 48 }) {
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  return (
    <View style={[av.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <Text style={[av.txt, { color: textColor, fontSize: size * 0.3 }]}>{initials}</Text>
    </View>
  );
});

const av = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  txt:  { fontWeight: '800' },
});

// ─── Contact Row ──────────────────────────────────────────────────────────────

const ContactRow = memo(function ContactRow({ item, onLeave, onPress }) {
  const dept      = formatDept(item.department) || 'Unassigned';
  const deptColor = DEPT_COLORS?.[item.department] ?? { bg: '#E8EAF6', text: '#3949AB', dot: '#3949AB' };

  return (
    <TouchableOpacity style={S.row} onPress={onPress} activeOpacity={0.72}>
      <View style={S.avatarWrap}>
        <Avatar
          name={item.name}
          color={onLeave ? '#FEF3C7' : deptColor.bg}
          textColor={onLeave ? '#92400E' : deptColor.text}
          size={50}
        />
        <View style={[S.statusDot, { backgroundColor: onLeave ? '#F59E0B' : '#22c55e' }]} />
      </View>

      <View style={S.info}>
        <View style={S.nameRow}>
          <Text style={S.name} numberOfLines={1}>{item.name}</Text>
          {onLeave && (
            <View style={S.leavePill}>
              <Text style={S.leaveTxt}>On Leave</Text>
            </View>
          )}
        </View>
        <Text style={S.role} numberOfLines={1}>{item.role}</Text>
        <Text style={S.dept} numberOfLines={1}>{dept}</Text>
      </View>

      <View style={S.actions}>
        <TouchableOpacity
          style={[S.actionBtn, { backgroundColor: colors.primary + '12' }]}
          onPress={() => item.phone && Linking.openURL(`tel:${item.phone}`)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="call" size={15} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[S.actionBtn, { backgroundColor: '#0891b2' + '12' }]}
          onPress={() => item.email && Linking.openURL(`mailto:${item.email}`)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="mail" size={15} color="#0891b2" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

// ─── Department picker (dropdown — no horizontal sliding) ─────────────────────

function getFilterLabel(deptFilter, myDepartment) {
  if (deptFilter === 'mine') return myDepartment ? formatDept(myDepartment) : 'My Department';
  if (deptFilter === 'all') return 'All Departments';
  return formatDept(deptFilter);
}

function DepartmentPicker({ myDepartment, deptFilter, onChange }) {
  const [open, setOpen] = useState(false);

  const options = useMemo(() => {
    const list = [
      { value: 'mine', label: myDepartment ? formatDept(myDepartment) : 'My Department' },
      { value: 'all', label: 'All Departments' },
    ];
    DEPARTMENT_OPTIONS.forEach(dept => {
      if (dept !== myDepartment) {
        list.push({ value: dept, label: formatDept(dept) });
      }
    });
    return list;
  }, [myDepartment]);

  const currentLabel = getFilterLabel(deptFilter, myDepartment);

  const pick = (value) => {
    onChange(value);
    setOpen(false);
  };

  return (
    <View style={S.pickerBar}>
      <Text style={S.pickerLabel}>Showing lecturers from</Text>
      <TouchableOpacity
        style={S.pickerBtn}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <View style={S.pickerBtnLeft}>
          <Ionicons name="business-outline" size={18} color={colors.primary} />
          <Text style={S.pickerBtnText} numberOfLines={2}>{currentLabel}</Text>
        </View>
        <Ionicons name="chevron-down" size={20} color={colors.primary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={S.modalOverlay}>
          <TouchableOpacity style={S.modalBackdrop} activeOpacity={1} onPress={() => setOpen(false)} />
          <View style={S.modalSheet}>
            <View style={S.modalHandle} />
            <Text style={S.modalTitle}>Select department</Text>
            <ScrollView style={S.modalList} showsVerticalScrollIndicator={false}>
              {options.map(opt => {
                const selected = deptFilter === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[S.modalOption, selected && S.modalOptionActive]}
                    onPress={() => pick(opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[S.modalOptionTxt, selected && S.modalOptionTxtActive]}>
                      {opt.label}
                    </Text>
                    {selected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={S.modalClose} onPress={() => setOpen(false)}>
              <Text style={S.modalCloseTxt}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ContactsScreen({ navigation }) {
  const { user, role } = useAuth();
  const myDepartment = user?.department ?? null;

  // FIX: Default is always 'mine' (My Department) for every user role.
  // Previously: students defaulted to 'mine', lecturers defaulted to 'all'.
  // Now both start on 'mine' so users see their own department first.
  const [contacts,      setContacts]      = useState([]);
  const [onLeaveEmails, setOnLeaveEmails] = useState(new Set());
  const [search,        setSearch]        = useState('');
  const [deptFilter,    setDeptFilter]    = useState('mine');
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [error,         setError]         = useState('');
  const [noDeptMessage, setNoDeptMessage] = useState('');
  const firstFilterLoad = useRef(true);

  const loadOnLeave = useCallback(async () => {
    try {
      const lRes = await get('/lecturer/on-leave');
      if (lRes.success && Array.isArray(lRes.data)) {
        setOnLeaveEmails(new Set(
          lRes.data.map(l => (l.user?.email ?? l.email)?.toLowerCase()).filter(Boolean)
        ));
      }
    } catch { /* non-fatal */ }
  }, []);

  const loadContacts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    setNoDeptMessage('');

    const scope = contactsScopeParam(deptFilter);
    try {
      const cRes = await get(`/contacts?scope=${encodeURIComponent(scope)}`);
      if (cRes.success) {
        setContacts(cRes.data ?? []);
        if (cRes.message) setNoDeptMessage(cRes.message);
      } else {
        setError(cRes.message || 'Failed to load contacts.');
      }
    } catch {
      setError('Cannot connect to server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [deptFilter]);

  useFocusEffect(useCallback(() => {
    loadOnLeave();
  }, [loadOnLeave]));

  useEffect(() => {
    if (firstFilterLoad.current) {
      firstFilterLoad.current = false;
      loadContacts(false);
    } else {
      loadContacts(true);
    }
  }, [deptFilter, loadContacts]);

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q) ||
      formatDept(c.department).toLowerCase().includes(q)
    );
  }, [contacts, search]);

  const listData = useMemo(() => {
    const items = [];
    let lastLetter = null;
    filtered.forEach(c => {
      const letter = (c.name?.[0] ?? '#').toUpperCase();
      if (letter !== lastLetter) {
        items.push({ type: 'header', letter, key: `h-${letter}` });
        lastLetter = letter;
      }
      items.push({ type: 'contact', ...c, key: `c-${c.id}` });
    });
    return items;
  }, [filtered]);

  const renderItem = useCallback(({ item }) => {
    if (item.type === 'header') {
      return <Text style={S.sectionLetter}>{item.letter}</Text>;
    }
    const isOnLeave = onLeaveEmails.has(item.email?.toLowerCase());
    return (
      <ContactRow
        item={item}
        onLeave={isOnLeave}
        onPress={() => navigation.navigate('ContactDetail', { contact: item })}
      />
    );
  }, [onLeaveEmails, navigation]);

  const filterLabel = getFilterLabel(deptFilter, myDepartment).toLowerCase();

  return (
    <View style={S.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Fixed top: header + search + filters */}
      <View style={S.topFixed}>
        <LinearGradient colors={[colors.primary, '#0a1e4a']} style={S.header}>
          <View style={S.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={S.headerTitle}>Contacts</Text>
              <Text style={S.headerSub}>
                {loading && !refreshing
                  ? 'Loading…'
                  : `${filtered.length} lecturer${filtered.length !== 1 ? 's' : ''} · ${filterLabel}`}
              </Text>
            </View>
            {refreshing && (
              <ActivityIndicator size="small" color="rgba(255,255,255,0.8)" style={{ marginLeft: 8 }} />
            )}
          </View>

          <View style={S.searchBar}>
            <Ionicons name="search-outline" size={16} color="#9CA3AF" />
            <TextInput
              style={S.searchInput}
              placeholder="Search name or department…"
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>

        <DepartmentPicker
          myDepartment={myDepartment}
          deptFilter={deptFilter}
          onChange={setDeptFilter}
        />
      </View>

      {/* List fills remaining space */}
      {loading && !refreshing ? (
        <View style={S.listArea}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={S.stateText}>Loading contacts…</Text>
        </View>
      ) : error ? (
        <View style={S.listArea}>
          <View style={S.stateIcon}>
            <Ionicons name="cloud-offline-outline" size={30} color={colors.primary} />
          </View>
          <Text style={S.stateTitle}>Connection Error</Text>
          <Text style={S.stateText}>{error}</Text>
          <TouchableOpacity style={S.retryBtn} onPress={() => loadContacts(false)}>
            <Ionicons name="refresh-outline" size={15} color="#fff" />
            <Text style={S.retryTxt}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          style={S.list}
          data={listData}
          keyExtractor={item => item.key}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          contentContainerStyle={S.listContent}
          refreshing={refreshing}
          onRefresh={() => loadContacts(true)}
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={8}
          removeClippedSubviews={Platform.OS === 'android'}
          ListEmptyComponent={
            <View style={S.emptyWrap}>
              <View style={S.stateIcon}>
                <Ionicons name="people-outline" size={26} color={colors.primary} />
              </View>
              <Text style={S.stateTitle}>No lecturers found</Text>
              <Text style={S.stateText}>
                {noDeptMessage ||
                  (search
                    ? `No contacts match "${search}"`
                    : `No lecturers in ${filterLabel} yet.`)}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F6FB' },

  topFixed: {
    flexShrink: 0,
    zIndex: 10,
    backgroundColor: '#F4F6FB',
    ...Platform.select({
      android: { elevation: 4 },
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
    }),
  },

  header: {
    paddingTop: Platform.OS === 'android' ? STATUS_H + 10 : 52,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  headerTop:   { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 3 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 14,
    paddingHorizontal: 14, height: 44,
    ...Platform.select({
      android: { elevation: 2 },
      ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
    }),
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1A2340', padding: 0 },

  pickerBar: {
    backgroundColor: '#F4F6FB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  pickerLabel: { fontSize: 11, fontWeight: '600', color: '#6B7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primary + '40',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 52,
    ...Platform.select({
      android: { elevation: 1 },
      ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
    }),
  },
  pickerBtnLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 8 },
  pickerBtnText: { flex: 1, fontSize: 15, fontWeight: '700', color: '#111827' },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: '70%',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#D1D5DB', alignSelf: 'center', marginTop: 10, marginBottom: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 12 },
  modalList: { maxHeight: 320 },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  modalOptionActive: { backgroundColor: colors.primary + '12' },
  modalOptionTxt: { fontSize: 15, fontWeight: '600', color: '#374151', flex: 1 },
  modalOptionTxtActive: { color: colors.primary, fontWeight: '700' },
  modalClose: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  modalCloseTxt: { fontSize: 15, fontWeight: '700', color: colors.primary },

  list:        { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  listArea:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },

  sectionLetter: {
    fontSize: 12, fontWeight: '800', color: colors.primary,
    letterSpacing: 1, textTransform: 'uppercase',
    paddingVertical: 6, paddingHorizontal: 4, marginTop: 4,
  },

  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16,
    padding: 12, marginBottom: 8,
    ...Platform.select({
      android: { elevation: 1 },
      ios: { shadowColor: '#c4c9d4', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
    }),
  },

  avatarWrap: { position: 'relative', marginRight: 12 },
  statusDot:  {
    position: 'absolute', bottom: 1, right: 1,
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 2, borderColor: '#fff',
  },

  info:    { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name:    { fontSize: 14, fontWeight: '700', color: '#111827', flexShrink: 1 },
  role:    { fontSize: 12, color: '#6B7280' },
  dept:    { fontSize: 11, color: '#9CA3AF' },

  leavePill: {
    backgroundColor: '#FEF3C7', borderRadius: 99,
    paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1, borderColor: '#FCD34D',
  },
  leaveTxt: { fontSize: 9, fontWeight: '700', color: '#92400E' },

  actions:   { flexDirection: 'column', gap: 7, marginLeft: 8 },
  actionBtn: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },

  emptyWrap:  { alignItems: 'center', paddingTop: 48, paddingHorizontal: 32, gap: 8 },
  stateIcon:  { width: 60, height: 60, borderRadius: 30, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  stateTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  stateText:  { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  retryBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 99, marginTop: 8 },
  retryTxt:   { color: '#fff', fontWeight: '700', fontSize: 13 },
});