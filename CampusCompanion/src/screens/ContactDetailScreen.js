// src/screens/ContactDetailScreen.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows, DEPT_COLORS } from '../theme/theme';
import { get } from '../api/client';

function formatLeaveDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ContactDetailScreen({ route }) {
  const { contact } = route.params;

  // Use department (new field name from User-based API)
  const dept      = contact.department ?? contact.dept ?? 'General';
  const deptColor = DEPT_COLORS?.[dept] ?? { bg: '#E8EAF6', text: '#3949AB', dot: '#3949AB' };

  const [onLeave, setOnLeave] = useState(null);

  useEffect(() => {
    const checkLeave = async () => {
      try {
        const res = await get('/lecturer/on-leave');
        if (res.success && Array.isArray(res.data)) {
          const match = res.data.find(
            (leave) => leave.email?.toLowerCase() === contact.email?.toLowerCase()
          );
          setOnLeave(match ?? null);
        }
      } catch (_) {}
    };
    checkLeave();
  }, [contact.email]);

  const handleCall = () => {
    const url = `tel:${contact.phone}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) Linking.openURL(url);
        else Alert.alert('Not supported', 'Phone calls are not supported on this device.');
      })
      .catch(() => Alert.alert('Error', 'Could not open phone dialler.'));
  };

  const handleEmail = () => {
    const url = `mailto:${contact.email}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) Linking.openURL(url);
        else Alert.alert('Not supported', 'Email is not supported on this device.');
      })
      .catch(() => Alert.alert('Error', 'Could not open mail client.'));
  };

  const getInitials = (name) =>
    name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        overScrollMode="never"
      >
        {/* ── HERO ── */}
        <View style={styles.hero}>
          <View style={[styles.avatar, { backgroundColor: deptColor.dot }]}>
            <Text style={styles.avatarText}>{getInitials(contact.name)}</Text>
          </View>
          <Text style={styles.name}>{contact.name}</Text>
          <Text style={styles.role}>{contact.role}</Text>

          <View style={[styles.heroBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <Text style={styles.heroBadgeText}>{dept} Department</Text>
          </View>

          {onLeave && (
            <View style={styles.leaveBadge}>
              <Ionicons name="bed-outline" size={12} color="#b45309" />
              <Text style={styles.leaveBadgeText}>
                On Leave · {formatLeaveDate(onLeave.startDate)} – {formatLeaveDate(onLeave.endDate)}
              </Text>
            </View>
          )}
        </View>

        {/* ── ACTION BUTTONS ── */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, styles.callBtn]} onPress={handleCall}>
            <Ionicons name="call" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.emailBtn]} onPress={handleEmail}>
            <Ionicons name="mail" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>Email</Text>
          </TouchableOpacity>
        </View>

        {/* ── CONTACT INFO CARD ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Contact Information</Text>
          <View style={styles.infoCard}>

            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <View style={[styles.infoIconWrap, { backgroundColor: deptColor.bg }]}>
                <Ionicons name="call-outline" size={16} color={deptColor.dot} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{contact.phone ?? 'N/A'}</Text>
              </View>
            </View>

            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <View style={[styles.infoIconWrap, { backgroundColor: deptColor.bg }]}>
                <Ionicons name="mail-outline" size={16} color={deptColor.dot} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{contact.email}</Text>
              </View>
            </View>

            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <View style={[styles.infoIconWrap, { backgroundColor: deptColor.bg }]}>
                <Ionicons name="business-outline" size={16} color={deptColor.dot} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Department</Text>
                <Text style={styles.infoValue}>{dept}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={[styles.infoIconWrap, { backgroundColor: deptColor.bg }]}>
                <Ionicons name="time-outline" size={16} color={deptColor.dot} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Office Hours</Text>
                <Text style={styles.infoValue}>{contact.officeHours ?? 'Mon–Fri, 9:00–17:00'}</Text>
              </View>
            </View>

          </View>
        </View>

        {/* ── ON LEAVE CARD ── */}
        {onLeave && (
          <View style={styles.section}>
            <View style={styles.leaveInfoCard}>
              <Ionicons name="bed-outline" size={18} color="#b45309" />
              <View style={{ flex: 1 }}>
                <Text style={styles.leaveInfoTitle}>Currently on leave</Text>
                <Text style={styles.leaveInfoText}>
                  {formatLeaveDate(onLeave.startDate)} – {formatLeaveDate(onLeave.endDate)}
                  {onLeave.reason ? `  ·  ${onLeave.reason}` : ''}
                </Text>
                <Text style={styles.leaveInfoSub}>
                  You may still email them — they will respond when they return.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── TIP CARD ── */}
        <View style={styles.section}>
          <View style={styles.tipCard}>
            <Ionicons name="information-circle-outline" size={18} color={colors.blue} />
            <Text style={styles.tipText}>
              For urgent matters outside office hours, send an email with subject line{' '}
              <Text style={{ fontWeight: '700' }}>[URGENT]</Text> and the team will respond
              as soon as possible.
            </Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  hero: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  avatarText:    { color: '#fff', fontSize: 28, fontWeight: '800' },
  name:          { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  role:          { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 4 },
  heroBadge:     { marginTop: spacing.sm, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 4 },
  heroBadgeText: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' },

  leaveBadge: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF3C7',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  leaveBadgeText: { fontSize: 11, fontWeight: '600', color: '#b45309' },

  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: -22,
    marginBottom: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.lg,
    ...shadows.md,
  },
  callBtn:       { backgroundColor: colors.primary },
  emailBtn:      { backgroundColor: colors.accent },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  section:      { paddingHorizontal: spacing.md, marginTop: spacing.md },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.textLight, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing.sm },

  infoCard:      { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadows.sm },
  infoRow:       { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  infoIconWrap:  { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  infoLabel:     { fontSize: 11, color: colors.textLight, marginBottom: 2 },
  infoValue:     { fontSize: 14, fontWeight: '600', color: colors.text },

  leaveInfoCard:  { backgroundColor: '#FFFBEB', borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', borderWidth: 1, borderColor: '#FCD34D' },
  leaveInfoTitle: { fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: 2 },
  leaveInfoText:  { fontSize: 12, color: '#b45309', marginBottom: 4 },
  leaveInfoSub:   { fontSize: 11, color: '#b45309', opacity: 0.8, lineHeight: 16 },

  tipCard: { backgroundColor: colors.blueLight, borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', borderWidth: 1, borderColor: '#BFDBFE' },
  tipText: { flex: 1, fontSize: 12, color: colors.blueDark, lineHeight: 18 },
});