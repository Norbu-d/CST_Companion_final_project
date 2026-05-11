// src/screens/ContactsScreen.js
// Connected to GET /contacts and GET /lecturer/on-leave

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { get } from '../api/client';
import { colors, spacing, radius, DEPT_COLORS } from '../theme/theme';

export default function ContactsScreen({ navigation }) {
  const [contacts, setContacts]           = useState([]);
  const [onLeaveEmails, setOnLeaveEmails] = useState(new Set());
  const [search, setSearch]               = useState('');
  const [selected, setSelected]           = useState(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [contactsRes, leaveRes] = await Promise.all([
        get('/contacts'),
        get('/lecturer/on-leave'),
      ]);

      if (contactsRes.success) setContacts(contactsRes.data);
      else setError('Failed to load contacts.');

      // /lecturer/on-leave returns User objects — email is at top level
      if (leaveRes.success && Array.isArray(leaveRes.data)) {
        const emails = new Set(leaveRes.data.map(l => l.email?.toLowerCase()));
        setOnLeaveEmails(emails);
      }
    } catch (_) {
      setError('Cannot connect to server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q) ||
      (c.department ?? '').toLowerCase().includes(q)
    );
  }, [contacts, search]);

  const getInitials = (name) =>
    name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  const renderItem = ({ item }) => {
    const dept      = item.department ?? 'General';
    const deptColor = DEPT_COLORS?.[dept] ?? { bg: '#E8EAF6', text: '#3949AB', dot: '#3949AB' };
    const isSelected = selected === item.id;
    const isOnLeave  = onLeaveEmails.has(item.email?.toLowerCase());

    return (
      <TouchableOpacity
        style={[styles.card, isSelected && styles.cardSelected]}
        onPress={() => {
          setSelected(item.id);
          navigation.navigate('ContactDetail', { contact: item });
        }}
        activeOpacity={0.75}
      >
        <View style={[styles.cardAccent, { backgroundColor: isOnLeave ? '#F59E0B' : deptColor.dot }]} />

        <View style={[styles.avatar, { backgroundColor: isOnLeave ? '#FEF3C7' : deptColor.bg }]}>
          <Text style={[styles.avatarText, { color: isOnLeave ? '#92400E' : deptColor.text }]}>
            {getInitials(item.name)}
          </Text>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            {isOnLeave && (
              <View style={styles.leaveBadge}>
                <Ionicons name="moon-outline" size={9} color="#92400E" />
                <Text style={styles.leaveText}>On Leave</Text>
              </View>
            )}
          </View>
          <Text style={styles.role} numberOfLines={1}>{item.role}</Text>
          <View style={styles.phoneRow}>
            <View style={styles.phoneChip}>
              <Ionicons name="call-outline" size={11} color={deptColor.dot} />
              <Text style={[styles.phoneText, { color: deptColor.dot }]}>{item.phone}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardRight}>
          <View style={[styles.deptBadge, { backgroundColor: deptColor.bg }]}>
            <Text style={[styles.deptText, { color: deptColor.text }]} numberOfLines={2}>
              {dept}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={14}
            color={isSelected ? colors.primary : '#ccc'}
            style={styles.chevron}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.primary, '#0f2444']} style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Contacts</Text>
          <Text style={styles.headerSub}>
            {loading ? 'Loading…' : `${contacts.length} lecturers`}
          </Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="people" size={26} color="rgba(255,255,255,0.25)" />
        </View>
      </LinearGradient>

      <View style={styles.searchContainer}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={17} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, role or department…"
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={17} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        {search.length > 0 && (
          <Text style={styles.resultCount}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateText}>Loading contacts…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <View style={styles.stateIconWrap}>
            <Ionicons name="cloud-offline-outline" size={32} color={colors.primary} />
          </View>
          <Text style={styles.stateTitle}>Connection Error</Text>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
            <Ionicons name="refresh-outline" size={15} color="#fff" />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          ListEmptyComponent={
            <View style={styles.center}>
              <View style={styles.stateIconWrap}>
                <Ionicons name="search-outline" size={28} color={colors.primary} />
              </View>
              <Text style={styles.stateTitle}>No results</Text>
              <Text style={styles.stateText}>No contacts match "{search}"</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:            { flex: 1, backgroundColor: '#F1F3F7' },
  header:          { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle:     { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  headerSub:       { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  headerIcon:      { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  searchContainer: { backgroundColor: '#fff', paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#EAECF0' },
  searchWrap:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F8FA', borderRadius: radius.md, paddingHorizontal: spacing.sm, height: 42, borderWidth: 1, borderColor: '#EAECF0' },
  searchIcon:      { marginRight: 8 },
  searchInput:     { flex: 1, fontSize: 14, color: '#1a1a2e' },
  resultCount:     { fontSize: 11, color: '#9CA3AF', marginTop: 6, marginLeft: 2 },
  list:            { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xl },

  card:         { backgroundColor: '#fff', borderRadius: radius.lg, marginBottom: 10, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }, android: { elevation: 2 } }) },
  cardSelected: { backgroundColor: '#F0F5FF' },
  cardAccent:   { width: 4, alignSelf: 'stretch' },
  avatar:       { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginLeft: 12, marginVertical: 14 },
  avatarText:   { fontSize: 15, fontWeight: '800' },
  cardBody:     { flex: 1, paddingLeft: 12, paddingVertical: 14 },
  nameRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  name:         { fontSize: 14, fontWeight: '700', color: '#111827', flexShrink: 1 },
  leaveBadge:   { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 20, borderWidth: 1, borderColor: '#FCD34D' },
  leaveText:    { fontSize: 9, fontWeight: '700', color: '#92400E' },
  role:         { fontSize: 12, color: '#6B7280', marginBottom: 6 },
  phoneRow:     { flexDirection: 'row' },
  phoneChip:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  phoneText:    { fontSize: 11, fontWeight: '600' },
  cardRight:    { alignItems: 'flex-end', paddingRight: 12, paddingVertical: 14, gap: 6 },
  deptBadge:    { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, maxWidth: 90 },
  deptText:     { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  chevron:      { marginTop: 4 },

  center:        { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  stateIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  stateTitle:    { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  stateText:     { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 32, marginTop: 4 },
  retryBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: radius.md },
  retryText:     { color: '#fff', fontWeight: '700', fontSize: 14 },
});