// src/screens/BookingScreen.js
// Fully connected to backend API

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions, TextInput, Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { get, post } from '../api/client';
import { colors, spacing, radius, shadows } from '../theme/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TIME_SLOTS = [
  '8:00–9:00', '9:00–10:00', '10:00–11:00',
  '11:00–12:00', '12:00–13:00', '13:00–14:00',
  '14:00–15:00', '15:00–16:00', '16:00–17:00',
];

const FACILITY_META = {
  football: { icon: 'football-outline',      color: '#16a34a', colorLight: '#dcfce7' },
  hall:     { icon: 'business-outline',       color: '#7c3aed', colorLight: '#ede9fe' },
  lab1:     { icon: 'desktop-outline',        color: '#2563eb', colorLight: '#dbeafe' },
  lab2:     { icon: 'hardware-chip-outline',  color: '#d97706', colorLight: '#fef3c7' },
  lab3:     { icon: 'phone-portrait-outline', color: '#0d9488', colorLight: '#ccfbf1' },
};

const DEFAULT_META = { icon: 'cube-outline', color: colors.primary, colorLight: '#EEF2FF' };

function getMeta(facilityKey, dbColor) {
  const meta = FACILITY_META[facilityKey] ?? DEFAULT_META;
  return { ...meta, color: dbColor || meta.color };
}

function getNext7Days() {
  const days = [];
  const DAY = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      key:     d.toISOString().split('T')[0],
      day:     DAY[d.getDay()],
      date:    d.getDate(),
      month:   MON[d.getMonth()],
      isToday: i === 0,
    });
  }
  return days;
}

const DATES = getNext7Days();

// ─── Friendly error parser ───────────────────────────────────────────────────
function parseSubmitError(message) {
  if (!message) return { title: 'Booking Failed', body: 'Something went wrong. Please try again.' };

  const lower = message.toLowerCase();

  if (lower.includes('already booked by')) {
    // Extract name from "One or more slots are already booked by Tenzin Wangchuk"
    const match = message.match(/already booked by (.+)/i);
    const name = match ? match[1] : 'another student';
    return {
      title: 'Slot Already Taken',
      body: `These slots are already booked by ${name}. Please select different times.`,
    };
  }
  if (lower.includes('slot') && lower.includes('conflict'))
    return {
      title: 'Time Slot Unavailable',
      body: 'One or more of your selected slots are already booked. Please pick different times.',
    };
  if (lower.includes('purpose') && lower.includes('short'))
    return {
      title: 'Purpose Too Short',
      body: 'Please write a brief description of why you need this facility (at least 5 characters).',
    };
  if (lower.includes('purpose'))
    return {
      title: 'Invalid Purpose',
      body: message,
    };
  if (lower.includes('connect') || lower.includes('network') || lower.includes('server'))
    return {
      title: 'Connection Error',
      body: 'Could not reach the server. Check your internet connection and try again.',
    };
  if (lower.includes('unauthorized') || lower.includes('token'))
    return {
      title: 'Session Expired',
      body: 'Your session has expired. Please log out and log in again.',
    };

  return { title: 'Booking Failed', body: message };
}

export default function BookingScreen({ navigation }) {

  const [facilities, setFacilities]         = useState([]);
  const [loadingList, setLoadingList]       = useState(true);
  const [listError, setListError]           = useState('');

  const [activeView, setActiveView]             = useState('list');
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [selectedDate, setSelectedDate]         = useState(DATES[0].key);
  const [slotMap, setSlotMap]                   = useState({}); // { slotIndex: { bookedBy, status } }
  const [loadingSlots, setLoadingSlots]         = useState(false);
  const [selectedSlots, setSelectedSlots]       = useState([]);
  const [purpose, setPurpose]                   = useState('');
  const [submitting, setSubmitting]             = useState(false);
  const [showSuccess, setShowSuccess]           = useState(false);
  const [submitError, setSubmitError]           = useState(null); // { title, body }

  // ── Fetch facilities ──────────────────────────────────────────────────────
  const fetchFacilities = useCallback(async () => {
    setLoadingList(true);
    setListError('');
    try {
      const res = await get('/facilities');
      if (res.success) setFacilities(res.data);
      else setListError('Failed to load facilities.');
    } catch (_) {
      setListError('Cannot connect to server.');
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { fetchFacilities(); }, [fetchFacilities]);

  // ── Fetch booked slots ────────────────────────────────────────────────────
  const fetchSlots = useCallback(async (facilityId, date) => {
    setLoadingSlots(true);
    setSlotMap({});
    try {
      const res = await get(`/bookings/slots?facilityId=${facilityId}&date=${date}`);
      if (res.success) setSlotMap(res.data.slotMap ?? {});
    } catch (_) {}
    finally { setLoadingSlots(false); }
  }, []);

  useEffect(() => {
    if (selectedFacility) {
      fetchSlots(selectedFacility.id, selectedDate);
      setSelectedSlots([]);
    }
  }, [selectedFacility, selectedDate]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getSlotStatus = (i) => {
    if (slotMap[i])                return 'booked';
    if (selectedSlots.includes(i)) return 'selected';
    return 'available';
  };

  const toggleSlot = (i) => {
    if (slotMap[i]) return; // already taken
    setSelectedSlots(prev =>
      prev.includes(i) ? prev.filter(s => s !== i) : [...prev, i]
    );
  };

  const handleFacilityPress = (fac) => {
    setSelectedFacility(fac);
    setSelectedSlots([]);
    setPurpose('');
    setSubmitError(null);
    setSelectedDate(DATES[0].key);
    setActiveView('detail');
  };

  const handleBack = () => {
    setActiveView('list');
    setSelectedFacility(null);
    setSelectedSlots([]);
    setSubmitError(null);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedSlots.length || !purpose.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await post('/bookings', {
        facilityId: selectedFacility.id,
        date:       selectedDate,
        slots:      selectedSlots,
        purpose:    purpose.trim(),
      });
      if (res.success) {
        setShowSuccess(true);
      } else {
        // Handle Zod validation error array
        let message = res.message;
        if (res.errors && res.errors.length > 0) {
          message = res.errors.map(e => e.message).join(' ');
        }
        setSubmitError(parseSubmitError(message));
      }
    } catch (_) {
      setSubmitError(parseSubmitError('Cannot connect to server.'));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (showSuccess) {
    const meta = getMeta(selectedFacility?.facilityKey, selectedFacility?.color);
    const selectedDateObj = DATES.find(d => d.key === selectedDate);
    const slotLabels = selectedSlots.sort((a, b) => a - b).map(i => TIME_SLOTS[i]);

    return (
      <View style={styles.successOverlay}>
        <View style={styles.successCard}>

          {/* Animated checkmark circle */}
          <View style={[styles.successRing, { borderColor: meta.color + '33' }]}>
            <View style={[styles.successIconWrap, { backgroundColor: meta.color }]}>
              <Ionicons name="checkmark" size={36} color="#fff" />
            </View>
          </View>

          <Text style={styles.successTitle}>Request Submitted!</Text>
          <Text style={styles.successSub}>
            Your booking request has been sent to the admin for approval.
            You'll be able to track its status in My Bookings.
          </Text>

          {/* Booking summary inside success */}
          <View style={[styles.successSummary, { borderColor: meta.color + '33' }]}>
            <View style={[styles.successSummaryHeader, { backgroundColor: meta.color + '12' }]}>
              <Ionicons name={meta.icon} size={14} color={meta.color} />
              <Text style={[styles.successFacilityName, { color: meta.color }]}>
                {selectedFacility?.name}
              </Text>
            </View>
            <View style={styles.successSummaryBody}>
              <View style={styles.successRow}>
                <Ionicons name="calendar-outline" size={13} color="#6B7280" />
                <Text style={styles.successRowText}>
                  {selectedDateObj?.day}, {selectedDateObj?.date} {selectedDateObj?.month}
                </Text>
              </View>
              <View style={styles.successRow}>
                <Ionicons name="time-outline" size={13} color="#6B7280" />
                <Text style={styles.successRowText} numberOfLines={2}>
                  {slotLabels.join(', ')}
                </Text>
              </View>
              <View style={styles.successRow}>
                <Ionicons name="location-outline" size={13} color="#6B7280" />
                <Text style={styles.successRowText}>{selectedFacility?.location}</Text>
              </View>
            </View>
          </View>

          {/* Pending badge */}
          <View style={styles.pendingBadge}>
            <Ionicons name="time-outline" size={12} color="#d97706" />
            <Text style={styles.pendingText}>Pending admin approval</Text>
          </View>

          {/* Actions */}
          <View style={styles.successActions}>
            <TouchableOpacity
              style={[styles.successBtn, { backgroundColor: meta.color }]}
              onPress={() => {
                setShowSuccess(false);
                handleBack();
                navigation.navigate('MyBookings');
              }}
            >
              <Ionicons name="bookmark-outline" size={15} color="#fff" />
              <Text style={styles.successBtnText}>View My Bookings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.successBtnOutline}
              onPress={() => { setShowSuccess(false); handleBack(); }}
            >
              <Text style={styles.successBtnOutlineText}>Back to Facilities</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────
  if (activeView === 'list') {
    return (
      <View style={styles.root}>
        <LinearGradient colors={[colors.primary, '#0f2444']} style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Bookings</Text>
            <Text style={styles.headerSub}>Reserve campus facilities</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="calendar" size={24} color="rgba(255,255,255,0.25)" />
          </View>
        </LinearGradient>

        {loadingList ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.stateText}>Loading facilities…</Text>
          </View>
        ) : listError ? (
          <View style={styles.center}>
            <View style={styles.stateIconWrap}>
              <Ionicons name="cloud-offline-outline" size={30} color={colors.primary} />
            </View>
            <Text style={styles.stateTitle}>Connection Error</Text>
            <Text style={styles.stateText}>{listError}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchFacilities}>
              <Ionicons name="refresh-outline" size={15} color="#fff" />
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            <View style={styles.infoStrip}>
              <Ionicons name="information-circle-outline" size={16} color="#1d4ed8" />
              <Text style={styles.infoText}>
                Select a facility to check availability and submit a booking request.
              </Text>
            </View>
            <Text style={styles.sectionLabel}>Available Facilities</Text>
            {facilities.map((fac) => {
              const meta = getMeta(fac.facilityKey, fac.color);
              return (
                <TouchableOpacity
                  key={fac.id}
                  style={styles.facilityCard}
                  onPress={() => handleFacilityPress(fac)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.facilityAccent, { backgroundColor: meta.color }]} />
                  <View style={[styles.facilityIconWrap, { backgroundColor: meta.colorLight }]}>
                    <Ionicons name={meta.icon} size={24} color={meta.color} />
                  </View>
                  <View style={styles.facilityInfo}>
                    <Text style={styles.facilityName}>{fac.name}</Text>
                    <Text style={styles.facilityDesc} numberOfLines={1}>{fac.description}</Text>
                    <View style={styles.facilityChips}>
                      <View style={styles.chip}>
                        <Ionicons name="people-outline" size={10} color="#6B7280" />
                        <Text style={styles.chipText}>{fac.capacity}</Text>
                      </View>
                      <View style={styles.chip}>
                        <Ionicons name="location-outline" size={10} color="#6B7280" />
                        <Text style={styles.chipText} numberOfLines={1}>{fac.location}</Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                </TouchableOpacity>
              );
            })}
            <View style={styles.warningStrip}>
              <Ionicons name="alert-circle-outline" size={14} color="#92400E" />
              <Text style={styles.warningText}>
                Bookings require admin approval. Submit at least 24 hours in advance.
              </Text>
            </View>
          </ScrollView>
        )}
      </View>
    );
  }

  // ── Detail / booking view ─────────────────────────────────────────────────
  const meta = getMeta(selectedFacility?.facilityKey, selectedFacility?.color);
  const selectedDateObj = DATES.find(d => d.key === selectedDate);

  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.primary, '#0f2444']} style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={18} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{selectedFacility?.name}</Text>
          <Text style={styles.headerSub}>{selectedFacility?.location}</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>

        {/* Banner */}
        <View style={[styles.banner, { borderLeftColor: meta.color }]}>
          <View style={[styles.bannerIcon, { backgroundColor: meta.colorLight }]}>
            <Ionicons name={meta.icon} size={28} color={meta.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerName}>{selectedFacility?.name}</Text>
            <Text style={styles.bannerDesc}>{selectedFacility?.description}</Text>
            <View style={[styles.capacityChip, { backgroundColor: meta.colorLight }]}>
              <Ionicons name="people-outline" size={11} color={meta.color} />
              <Text style={[styles.capacityText, { color: meta.color }]}>{selectedFacility?.capacity}</Text>
            </View>
          </View>
        </View>

        {/* Rules */}
        {selectedFacility?.rules?.length > 0 && (
          <View style={styles.rulesCard}>
            <View style={styles.rulesHeader}>
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
              <Text style={styles.rulesTitle}>Facility Rules</Text>
            </View>
            {selectedFacility.rules.map((rule, i) => (
              <View key={i} style={styles.ruleRow}>
                <View style={[styles.ruleDot, { backgroundColor: meta.color }]} />
                <Text style={styles.ruleText}>{rule}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Step 1: Date */}
        <Text style={styles.stepLabel}>
          <Text style={[styles.stepNum, { backgroundColor: meta.color }]}>1</Text>
          {'  '}Select Date
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
          {DATES.map((d) => {
            const active = selectedDate === d.key;
            return (
              <TouchableOpacity
                key={d.key}
                style={[styles.dateChip, active && { backgroundColor: meta.color, borderColor: meta.color }]}
                onPress={() => setSelectedDate(d.key)}
                activeOpacity={0.75}
              >
                <Text style={[styles.dateDay, active && styles.dateActiveText]}>{d.day}</Text>
                <Text style={[styles.dateNum2, active && styles.dateActiveText]}>{d.date}</Text>
                <Text style={[styles.dateMon, active && { color: 'rgba(255,255,255,0.7)' }]}>{d.month}</Text>
                {d.isToday && <View style={[styles.todayDot, { backgroundColor: active ? '#fff' : meta.color }]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Step 2: Slots */}
        <Text style={styles.stepLabel}>
          <Text style={[styles.stepNum, { backgroundColor: meta.color }]}>2</Text>
          {'  '}Select Time Slot{selectedSlots.length > 1 ? 's' : ''}
          {selectedSlots.length > 0 && (
            <Text style={{ color: meta.color, fontWeight: '700' }}> ({selectedSlots.length} selected)</Text>
          )}
        </Text>

        <View style={styles.legend}>
          {[
            { bg: '#dcfce7', border: '#86efac', label: 'Available' },
            { bg: meta.color, border: meta.color, label: 'Selected'  },
            { bg: '#F3F4F6', border: '#E5E7EB', label: 'Booked'    },
          ].map(l => (
            <View key={l.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: l.bg, borderColor: l.border }]} />
              <Text style={styles.legendText}>{l.label}</Text>
            </View>
          ))}
        </View>

        {loadingSlots ? (
          <View style={styles.slotsLoading}>
            <ActivityIndicator size="small" color={meta.color} />
            <Text style={styles.stateText}>Checking availability…</Text>
          </View>
        ) : (
          <View style={styles.slotsGrid}>
            {TIME_SLOTS.map((slot, i) => {
              const status = getSlotStatus(i);
              const bookerName = slotMap[i]?.bookedBy;
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.slotChip,
                    status === 'available' && styles.slotAvailable,
                    status === 'selected'  && { backgroundColor: meta.color, borderColor: meta.color },
                    status === 'booked'    && styles.slotBooked,
                  ]}
                  onPress={() => toggleSlot(i)}
                  disabled={status === 'booked'}
                  activeOpacity={0.75}
                >
                  <Text style={[
                    styles.slotText,
                    status === 'selected' && { color: '#fff' },
                    status === 'booked'   && styles.slotTextBooked,
                  ]}>{slot}</Text>
                  {status === 'booked' && (
                    <>
                      <Ionicons name="lock-closed" size={9} color="#9CA3AF" />
                      {bookerName && (
                        <Text style={styles.slotBookerName} numberOfLines={1}>{bookerName}</Text>
                      )}
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Step 3: Purpose */}
        <Text style={styles.stepLabel}>
          <Text style={[styles.stepNum, { backgroundColor: meta.color }]}>3</Text>
          {'  '}Purpose of Booking
        </Text>
        <View style={styles.inputCard}>
          <TextInput
            style={styles.purposeInput}
            placeholder="e.g. Inter-department football practice, Year 3 study group…"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            maxLength={200}
            value={purpose}
            onChangeText={text => { setPurpose(text); setSubmitError(null); }}
            textAlignVertical="top"
          />
          <View style={styles.charCountRow}>
            {purpose.trim().length > 0 && purpose.trim().length < 5 && (
              <Text style={styles.charHint}>
                {5 - purpose.trim().length} more character{5 - purpose.trim().length !== 1 ? 's' : ''} needed
              </Text>
            )}
            <Text style={[styles.charCount, purpose.length > 180 && styles.charCountWarn]}>
              {purpose.length}/200
            </Text>
          </View>
        </View>

        {/* Summary */}
        {selectedSlots.length > 0 && purpose.trim().length >= 5 && (
          <View style={[styles.summaryCard, { borderColor: meta.color + '44' }]}>
            <View style={styles.summaryHeader}>
              <Ionicons name="receipt-outline" size={14} color={meta.color} />
              <Text style={[styles.summaryTitle, { color: meta.color }]}>Booking Summary</Text>
            </View>
            {[
              { label: 'Facility', value: selectedFacility?.name },
              { label: 'Date',     value: `${selectedDateObj?.day}, ${selectedDateObj?.date} ${selectedDateObj?.month}` },
              { label: 'Slots',    value: selectedSlots.sort((a,b)=>a-b).map(i=>TIME_SLOTS[i]).join(', ') },
            ].map(row => (
              <View key={row.label} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{row.label}</Text>
                <Text style={styles.summaryValue} numberOfLines={2}>{row.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Error card ── */}
        {submitError && (
          <View style={styles.errorCard}>
            <View style={styles.errorIconWrap}>
              <Ionicons name="alert-circle" size={22} color="#ef4444" />
            </View>
            <View style={styles.errorBody}>
              <Text style={styles.errorTitle}>{submitError.title}</Text>
              <Text style={styles.errorMessage}>{submitError.body}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setSubmitError(null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: meta.color },
            (!selectedSlots.length || purpose.trim().length < 5 || submitting) && styles.submitDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!selectedSlots.length || purpose.trim().length < 5 || submitting}
          activeOpacity={0.8}
        >
          {submitting
            ? <ActivityIndicator size="small" color="#fff" />
            : <>
                <Ionicons name="calendar-outline" size={17} color="#fff" />
                <Text style={styles.submitText}>
                  {selectedSlots.length
                    ? `Submit Booking (${selectedSlots.length} slot${selectedSlots.length > 1 ? 's' : ''})`
                    : 'Select slots to continue'}
                </Text>
              </>
          }
        </TouchableOpacity>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F3F7' },

  // Header
  header:      { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  headerIcon:  { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },

  // List
  listContent:  { padding: spacing.md, paddingBottom: spacing.xl },
  infoStrip:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#EFF6FF', borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: '#BFDBFE', marginBottom: spacing.md },
  infoText:     { flex: 1, fontSize: 12, color: '#1d4ed8', lineHeight: 18 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing.sm },

  facilityCard:     { backgroundColor: '#fff', borderRadius: radius.lg, marginBottom: 10, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }, android: { elevation: 2 } }) },
  facilityAccent:   { width: 4, alignSelf: 'stretch' },
  facilityIconWrap: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginLeft: 12, marginVertical: 14 },
  facilityInfo:     { flex: 1, paddingLeft: 12, paddingVertical: 14, paddingRight: 4 },
  facilityName:     { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  facilityDesc:     { fontSize: 12, color: '#6B7280', marginBottom: 6 },
  facilityChips:    { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip:             { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F3F4F6', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  chipText:         { fontSize: 10, color: '#6B7280' },
  warningStrip:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFFBEB', borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: '#FCD34D', marginTop: spacing.sm },
  warningText:      { flex: 1, fontSize: 11, color: '#92400E', lineHeight: 17 },

  // Detail
  detailContent: { padding: spacing.md, paddingBottom: spacing.xl },
  banner:        { backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', gap: spacing.md, borderLeftWidth: 4, marginBottom: spacing.md, ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }, android: { elevation: 2 } }) },
  bannerIcon:    { width: 54, height: 54, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  bannerName:    { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 4 },
  bannerDesc:    { fontSize: 12, color: '#6B7280', lineHeight: 17, marginBottom: 8 },
  capacityChip:  { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  capacityText:  { fontSize: 11, fontWeight: '600' },

  rulesCard:   { backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }, android: { elevation: 1 } }) },
  rulesHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  rulesTitle:  { fontSize: 12, fontWeight: '700', color: '#111827' },
  ruleRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  ruleDot:     { width: 5, height: 5, borderRadius: 3, marginTop: 6 },
  ruleText:    { flex: 1, fontSize: 12, color: '#6B7280', lineHeight: 18 },

  stepLabel:   { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: spacing.sm, marginTop: spacing.sm },
  stepNum:     { color: '#fff', fontSize: 11, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },

  dateRow:       { gap: 8, paddingBottom: spacing.sm, paddingRight: spacing.md, marginBottom: spacing.sm },
  dateChip:      { width: 58, paddingVertical: 10, borderRadius: radius.lg, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center', gap: 2 },
  dateDay:       { fontSize: 10, fontWeight: '600', color: '#6B7280' },
  dateNum2:      { fontSize: 18, fontWeight: '800', color: '#111827' },
  dateMon:       { fontSize: 9, color: '#9CA3AF' },
  dateActiveText:{ color: '#fff' },
  todayDot:      { width: 5, height: 5, borderRadius: 3, marginTop: 2 },

  legend:     { flexDirection: 'row', gap: 16, marginBottom: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:  { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5 },
  legendText: { fontSize: 11, color: '#6B7280' },

  slotsLoading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: spacing.md },
  slotsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  slotChip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    width: (SCREEN_WIDTH - spacing.md * 2 - 16) / 3,
    paddingVertical: 10, borderRadius: radius.md, borderWidth: 1.5,
  },
  slotAvailable:  { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
  slotBooked:     { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' },
  slotText:       { fontSize: 11, fontWeight: '600', color: '#15803d' },
  slotTextBooked: { color: '#9CA3AF' },
  slotBookerName: { fontSize: 9, color: '#9CA3AF', textAlign: 'center', marginTop: 1 },

  inputCard:    { backgroundColor: '#fff', borderRadius: radius.lg, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: spacing.md, ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }, android: { elevation: 1 } }) },
  purposeInput: { padding: spacing.md, fontSize: 13, color: '#111827', minHeight: 90 },
  charCountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingBottom: 8 },
  charHint:     { fontSize: 10, color: '#d97706', fontWeight: '600' },
  charCount:    { fontSize: 10, color: '#9CA3AF' },
  charCountWarn:{ color: '#ef4444' },

  summaryCard:   { borderRadius: radius.lg, padding: spacing.md, backgroundColor: '#FAFBFF', borderWidth: 1.5, marginBottom: spacing.md },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  summaryTitle:  { fontSize: 12, fontWeight: '700' },
  summaryRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryLabel:  { fontSize: 12, color: '#6B7280' },
  summaryValue:  { fontSize: 12, fontWeight: '600', color: '#111827', flex: 1, textAlign: 'right', paddingLeft: 16 },

  // ── Error card ──
  errorCard:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FEF2F2', borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1.5, borderColor: '#FECACA' },
  errorIconWrap:{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  errorBody:    { flex: 1 },
  errorTitle:   { fontSize: 13, fontWeight: '700', color: '#991B1B', marginBottom: 3 },
  errorMessage: { fontSize: 12, color: '#B91C1C', lineHeight: 18 },

  submitBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.lg, paddingVertical: 15, ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }, android: { elevation: 4 } }) },
  submitDisabled:{ opacity: 0.45 },
  submitText:    { color: '#fff', fontSize: 14, fontWeight: '700' },

  // States
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  stateIconWrap:{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  stateTitle:   { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  stateText:    { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 32, marginTop: 8 },
  retryBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: radius.md },
  retryText:    { color: '#fff', fontWeight: '700', fontSize: 14 },

  // ── Success overlay ──
  successOverlay: { flex: 1, backgroundColor: 'rgba(10,24,50,0.96)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  successCard:    { backgroundColor: '#fff', borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', width: '100%' },

  successRing:     { width: 88, height: 88, borderRadius: 44, borderWidth: 6, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  successIconWrap: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },

  successTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 6, textAlign: 'center' },
  successSub:   { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: spacing.md },

  successSummary:       { width: '100%', borderRadius: radius.lg, borderWidth: 1.5, overflow: 'hidden', marginBottom: spacing.md },
  successSummaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.md, paddingVertical: 10 },
  successFacilityName:  { fontSize: 13, fontWeight: '700' },
  successSummaryBody:   { paddingHorizontal: spacing.md, paddingVertical: 10, gap: 8 },
  successRow:           { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  successRowText:       { fontSize: 12, color: '#374151', flex: 1, lineHeight: 18 },

  pendingBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, marginBottom: spacing.lg, borderWidth: 1, borderColor: '#FCD34D' },
  pendingText:  { fontSize: 11, fontWeight: '700', color: '#d97706' },

  successActions:      { width: '100%', gap: 10 },
  successBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.md, paddingVertical: 13 },
  successBtnText:      { color: '#fff', fontSize: 14, fontWeight: '700' },
  successBtnOutline:   { borderRadius: radius.md, paddingVertical: 13, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center' },
  successBtnOutlineText:{ fontSize: 14, fontWeight: '600', color: '#6B7280' },
});