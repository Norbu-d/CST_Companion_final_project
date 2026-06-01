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
  const day = new Date().getDay();
  return DAY_INDEX_MAP[day] || 'Monday';
}

function formatDept(dept) {
  if (!dept) return '';
  return dept.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getDateForDay(dayKey) {
  const today    = new Date();
  const todayIdx = today.getDay() === 0 ? 7 : today.getDay(); // Mon=1..Sat=6
  const targetIdx = DAYS.findIndex(d => d.key === dayKey) + 1;
  const diff = targetIdx - todayIdx;
  const date = new Date(today);
  date.setDate(today.getDate() + diff);
  return date;
}

// ─── Timeline Class Card ──────────────────────────────────────────────────────

function ClassCard({ cls, role, index, isLast }) {
  const typeColor = TYPE_COLORS[cls.type] || colors.primary;
  const typeIcon  = TYPE_ICONS[cls.type]  || 'calendar-outline';
  const isOnLeave = cls.lecturer?.onLeave;
  // First card gets the highlighted "active" style like the reference
  const isActive  = index === 0;

  return (
    <View style={S.timelineRow}>
      {/* Left: timeline spine */}
      <View style={S.spineCol}>
        <View style={[S.node, isActive && S.nodeActive]}>
          {isActive && <View style={S.nodeInner} />}
        </View>
        {!isLast && <View style={S.spine} />}
      </View>

      {/* Right: card */}
      {isActive ? (
        // Active card — solid primary colour, like the reference's Meeting card
        <LinearGradient
          colors={[colors.primary, '#0a1e4a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[S.card, S.cardActive]}
        >
          <View style={S.cardTopRow}>
            <Text style={[S.subject, S.subjectActive]} numberOfLines={2}>{cls.subject}</Text>
            <Text style={S.timeActive}>{cls.time}</Text>
          </View>

          <View style={S.typePillActive}>
            <Ionicons name={typeIcon} size={9} color={colors.primary} />
            <Text style={S.typePillActiveText}>{cls.type}</Text>
          </View>

          {role === 'STUDENT' && cls.lecturer && (
            <View style={S.metaRowActive}>
              <Ionicons name="person-outline" size={12} color="rgba(255,255,255,0.65)" />
              <Text style={S.metaTextActive} numberOfLines={1}>{cls.lecturer.name}</Text>
              {isOnLeave && (
                <View style={S.onLeavePill}><Text style={S.onLeaveText}>On Leave</Text></View>
              )}
            </View>
          )}
          {role === 'LECTURER' && (
            <View style={S.metaRowActive}>
              <Ionicons name="people-outline" size={12} color="rgba(255,255,255,0.65)" />
              <Text style={S.metaTextActive} numberOfLines={1}>
                Year {cls.year} · {formatDept(cls.department)}
              </Text>
            </View>
          )}

          <View style={S.metaRowActive}>
            <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.65)" />
            <Text style={S.metaTextActive}>{cls.room}</Text>
          </View>
        </LinearGradient>
      ) : (
        // Idle card — white, like the reference's Wakeup/Breakfast cards
        <View style={S.card}>
          <View style={S.cardTopRow}>
            <Text style={S.subject} numberOfLines={2}>{cls.subject}</Text>
            <Text style={S.timeText}>{cls.time}</Text>
          </View>

          <View style={[S.typePill, { backgroundColor: typeColor + '18' }]}>
            <Ionicons name={typeIcon} size={9} color={typeColor} />
            <Text style={[S.typePillText, { color: typeColor }]}>{cls.type}</Text>
          </View>

          {role === 'STUDENT' && cls.lecturer && (
            <View style={S.metaRow}>
              <Ionicons name="person-outline" size={12} color="#9CA3AF" />
              <Text style={S.metaText} numberOfLines={1}>{cls.lecturer.name}</Text>
              {isOnLeave && (
                <View style={S.onLeavePill}><Text style={S.onLeaveText}>On Leave</Text></View>
              )}
            </View>
          )}
          {role === 'LECTURER' && (
            <View style={S.metaRow}>
              <Ionicons name="people-outline" size={12} color="#9CA3AF" />
              <Text style={S.metaText} numberOfLines={1}>
                Year {cls.year} · {formatDept(cls.department)}
              </Text>
            </View>
          )}

          <View style={S.metaRow}>
            <Ionicons name="location-outline" size={12} color="#9CA3AF" />
            <Text style={S.metaText}>{cls.room}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ScheduleScreen() {
  const { user }                      = useAuth();
  const [schedule,  setSchedule]      = useState([]);
  const [loading,   setLoading]       = useState(true);
  const [error,     setError]         = useState(null);
  const [activeDay, setActiveDay]     = useState(getTodayKey());

  const fetchSchedule = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await get('/schedule');
      if (res.success) setSchedule(res.data ?? []);
      else             setError('Could not load schedule.');
    } catch { setError('Cannot connect to server.'); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchSchedule(); }, [fetchSchedule]));

  const dayClasses     = schedule.filter(s => s.day === activeDay);
  const daysWithClasses = new Set(schedule.map(s => s.day));
  const todayKey       = getTodayKey();
  const isToday        = activeDay === todayKey;

  const selectedDate = getDateForDay(activeDay);
  const dateStr      = selectedDate.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const subtitle = user?.role === 'LECTURER'
    ? 'Your teaching timetable'
    : user?.department
      ? `${formatDept(user.department)} · Year ${user.currentYear ?? ''} Sem ${user.semester ?? ''}`
      : 'Your class timetable';

  return (
    <View style={S.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F1F4FA" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ── Header ── */}
        <View style={S.header}>
          <Text style={S.headerDate}>{dateStr}</Text>
          <Text style={S.headerDay}>{isToday ? 'Today' : activeDay}</Text>
          <Text style={S.headerSub}>{subtitle}</Text>
        </View>

        {/* ── Day strip ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={S.dayStrip}
          overScrollMode="never"
        >
          {DAYS.map(day => {
            const isActive   = day.key === activeDay;
            const hasClasses = daysWithClasses.has(day.key);
            const d          = getDateForDay(day.key);
            const num        = d.getDate();
            const count      = schedule.filter(s => s.day === day.key).length;

            return (
              <TouchableOpacity
                key={day.key}
                style={S.dayCol}
                onPress={() => setActiveDay(day.key)}
                activeOpacity={0.75}
              >
                <Text style={[S.dayShort, isActive && S.dayShortActive]}>{day.short}</Text>
                <View style={[S.dayNumWrap, isActive && S.dayNumWrapActive]}>
                  <Text style={[S.dayNum, isActive && S.dayNumActive]}>{num}</Text>
                </View>
                {hasClasses && !loading && (
                  <View style={[S.dot, isActive && S.dotActive]} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Divider ── */}
        <View style={S.divider} />

        {/* ── Content ── */}
        <View style={S.listWrap}>
          {loading ? (
            <View style={S.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : error ? (
            <View style={S.center}>
              <Ionicons name="wifi-outline" size={40} color="#D1D5DB" />
              <Text style={S.errorTitle}>{error}</Text>
              <TouchableOpacity style={S.retryBtn} onPress={fetchSchedule}>
                <Text style={S.retryTxt}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : dayClasses.length === 0 ? (
            <View style={S.empty}>
              <Ionicons name="sunny-outline" size={44} color="#D1D5DB" />
              <Text style={S.emptyTitle}>No classes</Text>
              <Text style={S.emptySub}>
                {user?.role === 'LECTURER' ? 'No classes assigned.' : 'Enjoy your free day!'}
              </Text>
            </View>
          ) : (
            dayClasses.map((cls, idx) => (
              <ClassCard
                key={cls.id}
                cls={cls}
                role={user?.role}
                index={idx}
                isLast={idx === dayClasses.length - 1}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ACCENT = colors.primary;   // deep navy

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F4FA' },

  // Header (no gradient — clean white bg like reference)
  header: {
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 52,
    paddingBottom: 10,
    backgroundColor: '#F1F4FA',
  },
  headerDate: { fontSize: 13, color: '#9CA3AF', fontWeight: '500', marginBottom: 2 },
  headerDay:  { fontSize: 34, fontWeight: '800', color: '#111827', letterSpacing: -1 },
  headerSub:  { fontSize: 12, color: '#9CA3AF', marginTop: 4 },

  // Day strip — evenly spaced columns like the reference
  dayStrip: { paddingHorizontal: 16, paddingVertical: 16, gap: 4 },
  dayCol: { alignItems: 'center', minWidth: 46, paddingHorizontal: 4 },
  dayShort:       { fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginBottom: 6 },
  dayShortActive: { color: ACCENT },
  dayNumWrap: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  dayNumWrapActive: { backgroundColor: ACCENT },
  dayNum:           { fontSize: 15, fontWeight: '700', color: '#374151' },
  dayNumActive:     { color: '#fff' },
  dot:        { width: 5, height: 5, borderRadius: 3, backgroundColor: '#D1D5DB', marginTop: 4 },
  dotActive:  { backgroundColor: ACCENT },

  divider: { height: 1, backgroundColor: '#E5E7EB', marginHorizontal: 22, marginBottom: 8 },

  listWrap: { paddingHorizontal: 22, paddingTop: 8 },

  // Timeline row
  timelineRow: { flexDirection: 'row', marginBottom: 16 },

  // Spine column
  spineCol: { width: 28, alignItems: 'center' },
  node: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2, borderColor: '#D1D5DB',
    backgroundColor: '#F1F4FA',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 18, zIndex: 1,
  },
  nodeActive: { borderColor: ACCENT, width: 20, height: 20, borderRadius: 10, marginTop: 16 },
  nodeInner:  { width: 8, height: 8, borderRadius: 4, backgroundColor: ACCENT },
  spine: {
    width: 2, flex: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 4, marginBottom: -8,
  },

  // Card base
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    marginLeft: 12,
    ...Platform.select({
      ios:     { shadowColor: '#c4c9d4', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
    }),
  },
  cardActive: {
    // gradient applied via LinearGradient wrapper above
  },

  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  subject:       { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  subjectActive: { color: '#fff' },
  timeText:      { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  timeActive:    { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },

  // Type pill — idle
  typePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', borderRadius: 99,
    paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8,
  },
  typePillText: { fontSize: 10, fontWeight: '700' },

  // Type pill — active
  typePillActive: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', borderRadius: 99,
    paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  typePillActiveText: { fontSize: 10, fontWeight: '700', color: ACCENT },

  // Meta rows
  metaRow:       { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  metaText:      { fontSize: 12, color: '#6B7280', flex: 1 },
  metaRowActive: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  metaTextActive:{ fontSize: 12, color: 'rgba(255,255,255,0.75)', flex: 1 },

  onLeavePill: {
    backgroundColor: '#fef3c7', borderRadius: 99,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  onLeaveText: { fontSize: 10, fontWeight: '700', color: '#d97706' },

  center:     { paddingTop: 60, alignItems: 'center', gap: 12 },
  errorTitle: { fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
  retryBtn:   { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: ACCENT, borderRadius: 99 },
  retryTxt:   { color: '#fff', fontSize: 13, fontWeight: '700' },

  empty:      { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#6B7280' },
  emptySub:   { fontSize: 13, color: '#9CA3AF' },
});