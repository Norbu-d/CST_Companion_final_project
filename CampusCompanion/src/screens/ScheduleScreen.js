import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows, CLASS_TYPE_COLORS } from '../theme/theme';

const SCHEDULE = {
  Mon: [
    { time: '8:00 – 9:00',   subject: 'Cross Platform Dev',  room: 'Lab 3', type: 'Lab'     },
    { time: '9:00 – 10:00',  subject: 'Software Engineering', room: 'LH 1',  type: 'Lecture' },
    { time: '11:00 – 12:00', subject: 'Database Systems',     room: 'LH 2',  type: 'Lecture' },
  ],
  Tue: [
    { time: '8:00 – 9:00',   subject: 'Web Technologies',    room: 'Lab 1', type: 'Lab'     },
    { time: '10:00 – 11:00', subject: 'Networks',             room: 'LH 3',  type: 'Lecture' },
    { time: '14:00 – 15:00', subject: 'Networks',             room: 'Lab 2', type: 'Tutorial'},
  ],
  Wed: [
    { time: '9:00 – 10:00',  subject: 'Cross Platform Dev',  room: 'LH 1',  type: 'Lecture' },
    { time: '11:00 – 12:00', subject: 'Software Engineering', room: 'LH 2',  type: 'Lecture' },
    { time: '14:00 – 16:00', subject: 'Database Systems',     room: 'Lab 2', type: 'Lab'     },
  ],
  Thu: [
    { time: '8:00 – 9:00',   subject: 'Networks',            room: 'LH 1',  type: 'Lecture' },
    { time: '10:00 – 12:00', subject: 'Web Technologies',    room: 'Lab 1', type: 'Lab'     },
    { time: '14:00 – 15:00', subject: 'Cross Platform Dev',  room: 'LH 3',  type: 'Tutorial'},
  ],
  Fri: [
    { time: '9:00 – 10:00',  subject: 'Cross Platform Dev',  room: 'LH 2',  type: 'Lecture' },
    { time: '11:00 – 12:00', subject: 'Elective',             room: 'LH 4',  type: 'Lecture' },
  ],
};

const DAYS = [
  { key: 'Mon', full: 'Monday'    },
  { key: 'Tue', full: 'Tuesday'   },
  { key: 'Wed', full: 'Wednesday' },
  { key: 'Thu', full: 'Thursday'  },
  { key: 'Fri', full: 'Friday'    },
];

const TYPE_ICONS = {
  Lab:      'flask-outline',
  Lecture:  'book-outline',
  Tutorial: 'school-outline',
  Workshop: 'construct-outline',
};

export default function ScheduleScreen() {
  const todayIndex = new Date().getDay();
  const defaultDay = todayIndex >= 1 && todayIndex <= 5 ? DAYS[todayIndex - 1].key : 'Mon';
  const [activeDay, setActiveDay] = useState(defaultDay);

  const classes = SCHEDULE[activeDay] || [];
  const activeDayFull = DAYS.find((d) => d.key === activeDay)?.full || activeDay;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Schedule</Text>
        <Text style={styles.headerSub}>Weekly class timetable · Year 3 Sem 2</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayRow}
        overScrollMode="never"
      >
        {DAYS.map((day) => {
          const isActive = day.key === activeDay;
          const dayClasses = SCHEDULE[day.key] || [];
          return (
            <TouchableOpacity
              key={day.key}
              style={[styles.dayChip, isActive && styles.dayChipActive]}
              onPress={() => setActiveDay(day.key)}
              activeOpacity={0.75}
            >
              <Text style={[styles.dayChipText, isActive && styles.dayChipTextActive]}>
                {day.key}
              </Text>
              <View style={[styles.dayBadge, isActive && styles.dayBadgeActive]}>
                <Text style={[styles.dayBadgeText, isActive && styles.dayBadgeTextActive]}>
                  {dayClasses.length}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.dayLabelRow}>
        <Text style={styles.dayLabel}>{activeDayFull}</Text>
        <Text style={styles.classCount}>
          {classes.length} class{classes.length !== 1 ? 'es' : ''}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
      >
        {classes.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="sunny-outline" size={44} color={colors.border} />
            <Text style={styles.emptyTitle}>No classes today</Text>
            <Text style={styles.emptySub}>Enjoy your free day!</Text>
          </View>
        ) : (
          classes.map((cls, idx) => {
            const typeColor = CLASS_TYPE_COLORS[cls.type] || colors.primary;
            const typeIcon  = TYPE_ICONS[cls.type] || 'calendar-outline';
            return (
              <View key={idx} style={[styles.classCard, { borderLeftColor: typeColor }]}>
                <View style={styles.cardTop}>
                  <Text style={styles.subject} numberOfLines={1}>{cls.subject}</Text>
                  <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
                    <Ionicons name={typeIcon} size={10} color="#fff" />
                    <Text style={styles.typeText}>{cls.type}</Text>
                  </View>
                </View>
                <View style={styles.cardBottom}>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={13} color={colors.textLight} />
                    <Text style={styles.metaText}>{cls.time}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="location-outline" size={13} color={colors.textLight} />
                    <Text style={styles.metaText}>{cls.room}</Text>
                  </View>
                </View>
                <Text style={styles.sessionNum}>Session {idx + 1}</Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingTop: StatusBar.currentHeight + spacing.md || 48,
    paddingBottom: spacing.md,
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  headerSub:   { color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 2 },

  dayRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.sm },
  dayChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.full, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
  },
  dayChipActive:     { backgroundColor: colors.primary, borderColor: colors.primary },
  dayChipText:       { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  dayChipTextActive: { color: '#fff' },

  dayBadge: {
    backgroundColor: colors.background, borderRadius: radius.full,
    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  dayBadgeActive:     { backgroundColor: 'rgba(255,255,255,0.2)' },
  dayBadgeText:       { fontSize: 9, fontWeight: '700', color: colors.textSecondary },
  dayBadgeTextActive: { color: '#fff' },

  dayLabelRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, marginBottom: spacing.sm,
  },
  dayLabel:   { fontSize: 16, fontWeight: '700', color: colors.text },
  classCount: { fontSize: 12, color: colors.textLight, fontWeight: '500' },

  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },

  classCard: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4, ...shadows.md,
  },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.sm,
  },
  subject:   { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1, marginRight: spacing.sm },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  typeText:  { color: '#fff', fontSize: 10, fontWeight: '700' },

  cardBottom: { flexDirection: 'row', gap: spacing.lg },
  metaItem:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:   { fontSize: 12, color: colors.textSecondary },

  sessionNum: { position: 'absolute', bottom: spacing.sm, right: spacing.md, fontSize: 10, color: colors.border, fontWeight: '600' },

  empty:      { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.textSecondary },
  emptySub:   { fontSize: 13, color: colors.textLight },
});