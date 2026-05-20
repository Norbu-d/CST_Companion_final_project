import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { get, post, del } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius } from '../theme/theme';

const REASON_OPTIONS = [
  'Conference / Workshop',
  'Medical Leave',
  'Personal Leave',
  'Field Work',
  'Training',
  'Other',
];

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isActive(leave) {
  const today = new Date();
  return leave.status === 'APPROVED' && new Date(leave.startDate) <= today && new Date(leave.endDate) >= today;
}

function isUpcoming(leave) {
  return leave.status === 'APPROVED' && new Date(leave.startDate) > new Date();
}

function getStatusBadge(status) {
  if (status === 'APPROVED') return { color: '#10b981', bg: '#d1fae5', text: 'Approved' };
  if (status === 'REJECTED') return { color: '#ef4444', bg: '#fee2e2', text: 'Rejected' };
  return { color: '#f59e0b', bg: '#fef3c7', text: 'Awaiting Approval' };
}

function DatePicker({ label, value, onChange }) {
  const d = value ? new Date(value) : new Date();

  const adjust = (field, delta) => {
    const next = new Date(d);
    if (field === 'day')   next.setDate(next.getDate() + delta);
    if (field === 'month') next.setMonth(next.getMonth() + delta);
    if (field === 'year')  next.setFullYear(next.getFullYear() + delta);
    onChange(next.toISOString().split('T')[0]);
  };

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <View style={dpStyles.wrap}>
      <Text style={dpStyles.label}>{label}</Text>
      <View style={dpStyles.row}>
        {[
          { field: 'day',   val: d.getDate(),          pad: true  },
          { field: 'month', val: months[d.getMonth()], pad: false },
          { field: 'year',  val: d.getFullYear(),       pad: false },
        ].map(({ field, val, pad }) => (
          <View key={field} style={dpStyles.col}>
            <TouchableOpacity onPress={() => adjust(field,  1)} style={dpStyles.btn}>
              <Ionicons name="chevron-up" size={16} color={colors.primary} />
            </TouchableOpacity>
            <Text style={dpStyles.val}>{pad ? String(val).padStart(2, '0') : val}</Text>
            <TouchableOpacity onPress={() => adjust(field, -1)} style={dpStyles.btn}>
              <Ionicons name="chevron-down" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}

const dpStyles = StyleSheet.create({
  wrap:  { flex: 1 },
  label: { fontSize: 11, fontWeight: '700', color: '#6B7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  row:   { flexDirection: 'row', gap: 4, backgroundColor: '#F9FAFB', borderRadius: radius.md, padding: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  col:   { flex: 1, alignItems: 'center', gap: 2 },
  btn:   { padding: 4 },
  val:   { fontSize: 15, fontWeight: '700', color: '#111827', minWidth: 32, textAlign: 'center' },
});

export default function MyLeaveScreen() {
  const { user } = useAuth();

  const today = new Date().toISOString().split('T')[0];

  const [leaves, setLeaves]         = useState([]);
  const [collegeLeaves, setCollegeLeaves] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [startDate, setStartDate]   = useState(today);
  const [endDate, setEndDate]       = useState(today);
  const [reason, setReason]         = useState(REASON_OPTIONS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting]     = useState(null);

  const fetchLeaves = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Get own leaves
      const res = await get(`/lecturer/leave/${user.id}`);
      if (res.success) setLeaves(res.data);
      
      // Get all college leaves (for leave board) — filter out own leaves
      const collegeRes = await get('/lecturer/leave/all');
      if (collegeRes.success) {
        const others = collegeRes.data.filter(l => l.userId !== user.id && l.status === 'APPROVED');
        setCollegeLeaves(others);
      }
    } catch (_) {}
    finally { setLoading(false); }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { fetchLeaves(); }, [fetchLeaves]));

  const handleSubmit = async () => {
    if (endDate < startDate) {
      Alert.alert('Invalid Dates', 'End date must be on or after the start date.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await post('/lecturer/leave', { startDate, endDate, reason });
      if (res.success) {
        setShowForm(false);
        setStartDate(today);
        setEndDate(today);
        setReason(REASON_OPTIONS[0]);
        fetchLeaves();
      } else {
        Alert.alert('Error', res.message ?? 'Could not submit leave.');
      }
    } catch (_) {
      Alert.alert('Error', 'Cannot connect to server.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Cancel Leave',
      'Are you sure you want to cancel this leave record?',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Leave', style: 'destructive',
          onPress: async () => {
            setDeleting(id);
            try {
              const data = await del(`/lecturer/leave/${id}`);
              if (data.success) fetchLeaves();
              else Alert.alert('Error', data.message ?? 'Could not cancel leave.');
            } catch (_) {
              Alert.alert('Error', 'Cannot connect to server.');
            } finally {
              setDeleting(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.primary, '#0f2444']} style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>My Leave</Text>
          <Text style={styles.headerSub}>Manage your campus availability</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowForm(v => !v)}
        >
          <Ionicons name={showForm ? 'close' : 'add'} size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>New Leave Request</Text>

            <View style={styles.dateRow}>
              <DatePicker label="From" value={startDate} onChange={setStartDate} />
              <View style={styles.dateSep}>
                <Ionicons name="arrow-forward" size={16} color="#9CA3AF" />
              </View>
              <DatePicker label="Until" value={endDate} onChange={setEndDate} />
            </View>

            <Text style={styles.reasonLabel}>Reason</Text>
            <View style={styles.reasonGrid}>
              {REASON_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.reasonChip, reason === opt && styles.reasonChipActive]}
                  onPress={() => setReason(opt)}
                >
                  <Text style={[styles.reasonText, reason === opt && styles.reasonTextActive]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.formSummary}>
              <Ionicons name="information-circle-outline" size={14} color="#1d4ed8" />
              <Text style={styles.formSummaryText}>
                Students and admin will see you as unavailable during this period.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.5 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator size="small" color="#fff" />
                : <>
                    <Ionicons name="checkmark-circle-outline" size={17} color="#fff" />
                    <Text style={styles.submitText}>Submit Leave</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : leaves.length === 0 && !showForm ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="bed-outline" size={32} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No leave records</Text>
            <Text style={styles.emptyText}>Tap + to mark yourself as unavailable for a date range.</Text>
          </View>
        ) : (
          <>
            {leaves.filter(l => l.status === 'APPROVED' || l.status === 'PENDING').length > 0 && (
              <>
                {leaves.filter(l => (l.status === 'APPROVED' || l.status === 'PENDING') && isActive(l)).length > 0 && (
                  <LeaveSection 
                    title="Currently On Leave" 
                    leaves={leaves.filter(l => (l.status === 'APPROVED' || l.status === 'PENDING') && isActive(l))} 
                    onDelete={handleDelete} 
                    deleting={deleting}
                    showStatus={true}
                  />
                )}
                {leaves.filter(l => (l.status === 'APPROVED' || l.status === 'PENDING') && isUpcoming(l)).length > 0 && (
                  <LeaveSection 
                    title="Upcoming" 
                    leaves={leaves.filter(l => (l.status === 'APPROVED' || l.status === 'PENDING') && isUpcoming(l))} 
                    onDelete={handleDelete} 
                    deleting={deleting}
                    showStatus={true}
                  />
                )}
                {leaves.filter(l => l.status === 'PENDING').length > 0 && (
                  <LeaveSection 
                    title="Awaiting Approval" 
                    leaves={leaves.filter(l => l.status === 'PENDING')} 
                    onDelete={handleDelete} 
                    deleting={deleting}
                    showStatus={true}
                  />
                )}
                {leaves.filter(l => l.status === 'REJECTED').length > 0 && (
                  <LeaveSection 
                    title="Rejected" 
                    leaves={leaves.filter(l => l.status === 'REJECTED')} 
                    onDelete={handleDelete} 
                    deleting={deleting}
                    showStatus={true}
                  />
                )}
              </>
            )}
            <CollegeLeaveBoard leaves={collegeLeaves} />
          </>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </View>
  );
}

function LeaveSection({ title, leaves, onDelete, deleting, showStatus = false }) {
  return (
    <>
      <Text style={[styles.sectionLabel, { color: colors.primary }]}>{title}</Text>
      {leaves.map(leave => {
        const statusInfo = getStatusBadge(leave.status);
        const color = isActive(leave) ? '#d97706' : isUpcoming(leave) ? colors.primary : '#9CA3AF';
        
        return (
          <View key={leave.id} style={styles.leaveCard}>
            <View style={[styles.leaveAccent, { backgroundColor: color }]} />
            <View style={styles.leaveBody}>
              <View style={styles.leaveTop}>
                <View style={styles.leaveDates}>
                  <Ionicons name="calendar-outline" size={13} color={color} />
                  <Text style={styles.leaveDateText}>
                    {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
                  </Text>
                </View>
                {showStatus && (
                  <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
                      {statusInfo.text}
                    </Text>
                  </View>
                )}
                {onDelete && (
                  <TouchableOpacity
                    onPress={() => onDelete(leave.id)}
                    disabled={deleting === leave.id}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    {deleting === leave.id
                      ? <ActivityIndicator size="small" color="#ef4444" />
                      : <Ionicons name="trash-outline" size={15} color="#ef4444" />
                    }
                  </TouchableOpacity>
                )}
              </View>
              {leave.reason && (
                <Text style={styles.leaveReason}>{leave.reason}</Text>
              )}
            </View>
          </View>
        );
      })}
    </>
  );
}

function CollegeLeaveBoard({ leaves }) {
  if (leaves.length === 0) return null;
  
  const today = new Date();
  const onLeaveNow = leaves.filter(l => new Date(l.startDate) <= today && new Date(l.endDate) >= today);
  
  if (onLeaveNow.length === 0) return null;

  return (
    <View style={{ marginTop: spacing.xl }}>
      <Text style={[styles.sectionLabel, { color: colors.primary }]}>📋 College Leave Board</Text>
      <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: spacing.md, marginLeft: spacing.md }}>
        Lecturers currently on leave
      </Text>
      {onLeaveNow.map(leave => (
        <View key={leave.id} style={[styles.boardCard]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={styles.boardAvatar}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>
                {leave.user?.name?.charAt(0) ?? '?'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }}>
                {leave.user?.name}
              </Text>
              <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>
                {leave.user?.department?.replace(/_/g, ' ')}
              </Text>
              <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                Until {formatDate(leave.endDate)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#F1F3F7' },
  header:  { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  addBtn:  { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

  content: { padding: spacing.md, paddingBottom: spacing.xl },

  formCard:  { backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }, android: { elevation: 2 } }) },
  formTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: spacing.md },
  dateRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md },
  dateSep:   { paddingTop: 20 },

  reasonLabel:     { fontSize: 11, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  reasonGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  reasonChip:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: '#E5E7EB' },
  reasonChipActive:{ backgroundColor: colors.primary + '12', borderColor: colors.primary },
  reasonText:      { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  reasonTextActive:{ color: colors.primary },

  formSummary:     { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#EFF6FF', borderRadius: radius.md, padding: 10, borderWidth: 1, borderColor: '#BFDBFE', marginBottom: spacing.md },
  formSummaryText: { flex: 1, fontSize: 11, color: '#1d4ed8', lineHeight: 17 },

  submitBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 13 },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing.sm, marginTop: spacing.sm },

  leaveCard:   { backgroundColor: '#fff', borderRadius: radius.lg, marginBottom: 10, flexDirection: 'row', overflow: 'hidden', ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }, android: { elevation: 1 } }) },
  leaveAccent: { width: 4, alignSelf: 'stretch' },
  leaveBody:   { flex: 1, padding: spacing.md },
  leaveTop:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  leaveDates:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leaveDateText: { fontSize: 13, fontWeight: '700', color: '#111827' },
  leaveReason: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  
  statusBadge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  statusBadgeText:  { fontSize: 11, fontWeight: '600' },

  boardCard:    { backgroundColor: '#fff', borderRadius: radius.lg, marginBottom: 12, padding: spacing.md, borderWidth: 1.5, borderColor: '#E5E7EB', ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 1 } }, android: { elevation: 1 } }) },
  boardAvatar:  { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },

  center:     { paddingTop: 60, alignItems: 'center' },
  emptyState: { paddingTop: 60, alignItems: 'center', paddingHorizontal: spacing.lg },
  emptyIcon:  { width: 72, height: 72, borderRadius: 36, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptyText:  { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
});