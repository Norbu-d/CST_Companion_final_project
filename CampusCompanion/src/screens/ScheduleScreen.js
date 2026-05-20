import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { get } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius } from '../theme/theme';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = [
  { key: 'Monday',    short: 'Mon' },
  { key: 'Tuesday',  short: 'Tue' },
  { key: 'Wednesday',short: 'Wed' },
  { key: 'Thursday', short: 'Thu' },
  { key: 'Friday',   short: 'Fri' },
  { key: 'Saturday', short: 'Sat' },
];

const DAY_INDEX_MAP = {
  1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
  4: 'Thursday', 5: 'Friday', 6: 'Saturday',
};

const TYPE_COLORS = {
  Lecture:  '#1A3C6E',
  Lab:      '#0891b2',
  Tutorial: '#7c3aed',
  Workshop: '#b45309',
};

const TYPE_ICONS = {
  Lecture:  'book-outline',
  Lab:      'flask-outline',
  Tutorial: 'school-outline',
  Workshop: 'construct-outline',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayKey() {
  const day = new Date().getDay(); // 0=Sun
  return DAY_INDEX_MAP[day] || 'Monday';
}

function formatDept(dept) {
  if (!dept) return '';
  return dept.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Class Card ───────────────────────────────────────────────────────────────

function ClassCard({ cls, role, index }) {
  const typeColor = TYPE_COLORS[cls.type] || colors.primary;
  const typeIcon  = TYPE_ICONS[cls.type]  || 'calendar-outline';
  const isOnLeave = cls.lecturer?.onLeave;

  return (
    <View style={[styles.classCard, { borderLeftColor: typeColor }]}>
      {/* Session number */}
      <Text style={styles.sessionNum}>#{index + 1}</Text>

      {/* Top row: subject + type badge */}
      <View style={styles.cardTop}>
        <Text style={styles.subject} numberOfLines={2}>{cls.subject}</Text>
        <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
          <Ionicons name={typeIcon} size={9} color="#fff" />
          <Text style={styles.typeText}>{cls.type}</Text>
        </View>
      </View>

      {/* Meta row: time + room */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={12} color="#9CA3AF" />
          <Text style={styles.metaText}>{cls.time}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={12} color="#9CA3AF" />
          <Text style={styles.metaText}>{cls.room}</Text>
        </View>
      </View>

      {/* Lecturer info — shown for students */}
      {role === 'STUDENT' && cls.lecturer && (
        <View style={styles.lecturerRow}>
          <Ionicons name="person-outline" size={12} color="#9CA3AF" />
          <Text style={styles.lecturerText} numberOfLines={1}>
            {cls.lecturer.name}
          </Text>
          {isOnLeave && (
            <View style={styles.onLeavePill}>
              <Text style={styles.onLeaveText}>On Leave</Text>
            </View>
          )}
        </View>
      )}

      {/* Department + year info — shown for lecturers */}
      {role === 'LECTURER' && (
        <View style={styles.lecturerRow}>
          <Ionicons name="people-outline" size={12} color="#9CA3AF" />
          <Text style={styles.lecturerText} numberOfLines={1}>
            Year {cls.year} · {formatDept(cls.department)}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ScheduleScreen() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [activeDay, setActiveDay] = useState(getTodayKey());

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await get('/schedule');
      if (res.success) {
        setSchedule(res.data ?? []);
      } else {
        setError('Could not load schedule.');
      }
    } catch (_) {
      setError('Cannot connect to server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchSchedule(); }, [fetchSchedule]));

  // Filter classes for selected day
  const dayClasses = schedule.filter(s => s.day === activeDay);

  // Build subtitle
  const subtitle = user?.role === 'LECTURER'
    ? 'Your teaching timetable'
    : user?.department
      ? `${formatDept(user.department)} · Year ${user.currentYear ?? ''} Sem ${user.semester ?? ''}`
      : 'Your class timetable';

  // Only show days that have at least one class (or all days if loading)
  const daysWithClasses = new Set(schedule.map(s => s.day));

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f2444" />

      {/* Header */}
      <LinearGradient colors={[colors.primary, '#0f2444']} style={styles.header}>
        <Text style={styles.headerTitle}>Schedule</Text>
        <Text style={styles.headerSub}>{subtitle}</Text>
      </LinearGradient>

      {/* Day selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayRow}
        overScrollMode="never"
      >
        {DAYS.map(day => {
          const isActive  = day.key === activeDay;
          const hasClasses = daysWithClasses.has(day.key);
          const count = schedule.filter(s => s.day === day.key).length;

          return (
            <TouchableOpacity
              key={day.key}
              style={[
                styles.dayChip,
                isActive && styles.dayChipActive,
                !hasClasses && !loading && styles.dayChipEmpty,
              ]}
              onPress={() => setActiveDay(day.key)}
              activeOpacity={0.75}
            >
              <Text style={[styles.dayChipText, isActive && styles.dayChipTextActive]}>
                {day.short}
              </Text>
              {hasClasses && (
                <View style={[styles.dayBadge, isActive && styles.dayBadgeActive]}>
                  <Text style={[styles.dayBadgeText, isActive && styles.dayBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Day label row */}
      <View style={styles.dayLabelRow}>
        <Text style={styles.dayLabel}>{activeDay}</Text>
        {!loading && (
          <Text style={styles.classCount}>
            {dayClasses.length} {dayClasses.length === 1 ? 'class' : 'classes'}
          </Text>
        )}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="wifi-outline" size={40} color="#D1D5DB" />
          <Text style={styles.errorTitle}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchSchedule}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
        >
          {dayClasses.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="sunny-outline" size={44} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No classes today</Text>
              <Text style={styles.emptySub}>
                {user?.role === 'LECTURER' ? 'No classes assigned for this day.' : 'Enjoy your free day!'}
              </Text>
            </View>
          ) : (
            dayClasses.map((cls, idx) => (
              <ClassCard key={cls.id} cls={cls} role={user?.role} index={idx} />
            ))
          )}
          <View style={{ height: spacing.xl }} />
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F3F7' },

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + spacing.md : spacing.md,
    paddingBottom: spacing.lg,
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  headerSub:   { color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 2 },

  dayRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.sm },
  dayChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.full, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  dayChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayChipEmpty:  { opacity: 0.4 },
  dayChipText:       { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  dayChipTextActive: { color: '#fff' },

  dayBadge: {
    backgroundColor: '#F3F4F6', borderRadius: radius.full,
    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  dayBadgeActive:     { backgroundColor: 'rgba(255,255,255,0.25)' },
  dayBadgeText:       { fontSize: 9, fontWeight: '700', color: '#6B7280' },
  dayBadgeTextActive: { color: '#fff' },

  dayLabelRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, marginBottom: spacing.sm,
  },
  dayLabel:   { fontSize: 16, fontWeight: '700', color: '#111827' },
  classCount: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },

  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },

  classCard: {
    backgroundColor: '#fff', borderRadius: radius.lg,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: '#F3F4F6', borderLeftWidth: 4,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
    }),
  },
  sessionNum: {
    position: 'absolute', top: spacing.sm, right: spacing.md,
    fontSize: 10, color: '#D1D5DB', fontWeight: '700',
  },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: spacing.sm, paddingRight: 24,
  },
  subject: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  typeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  metaRow: { flexDirection: 'row', gap: spacing.lg, marginBottom: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#6B7280' },

  lecturerRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  lecturerText: { fontSize: 12, color: '#9CA3AF', flex: 1 },

  onLeavePill: {
    backgroundColor: '#fef3c7', borderRadius: radius.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  onLeaveText: { fontSize: 10, fontWeight: '700', color: '#d97706' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorTitle: { fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
  retryBtn: {
    marginTop: 4, paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: colors.primary, borderRadius: radius.md,
  },
  retryText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#6B7280' },
  emptySub:   { fontSize: 13, color: '#9CA3AF' },
});