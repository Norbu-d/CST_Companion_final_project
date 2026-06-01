import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { get, patch } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius } from '../theme/theme';

const STATUS_BAR_HEIGHT = StatusBar.currentHeight || 44;

function formatEnum(value) {
  if (!value) return '—';
  return value
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

function ProfileField({ label, value, icon }) {
  return (
    <View style={s.field}>
      <View style={s.fieldIcon}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={s.fieldBody}>
        <Text style={s.fieldLabel}>{label}</Text>
        <Text style={s.fieldValue}>{value ?? '—'}</Text>
      </View>
    </View>
  );
}

function EditableField({ label, value, onChangeText, icon, multiline, placeholder }) {
  return (
    <View style={s.field}>
      <View style={s.fieldIcon}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={s.fieldBody}>
        <Text style={s.fieldLabel}>{label}</Text>
        <TextInput
          style={[s.input, multiline && s.inputMultiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? `Enter ${label.toLowerCase()}`}
          placeholderTextColor={colors.textLight}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { role, updateUser } = useAuth();
  const [profile, setProfile]     = useState(null);
  const [contact, setContact]     = useState('');
  const [officeHours, setOfficeHours] = useState('');
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [editing, setEditing]     = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await get('/users/me');
      if (!res.success) {
        Alert.alert('Error', res.message || 'Could not load profile');
        return;
      }
      const data = res.data;
      setProfile(data);
      setContact(data.contact ?? '');
      setOfficeHours(data.officeHours ?? '');
    } catch {
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSave = async () => {
    setSaving(true);
    try {
      const body =
        role === 'LECTURER'
          ? { contact: contact.trim() || null, officeHours: officeHours.trim() || null }
          : { contact: contact.trim() || null };

      const res = await patch('/users/me', body);
      if (!res.success) {
        Alert.alert('Error', res.message || 'Could not save profile');
        return;
      }
      setProfile(res.data);
      setContact(res.data.contact ?? '');
      setOfficeHours(res.data.officeHours ?? '');
      await updateUser(res.data);
      setEditing(false);
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch {
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setContact(profile?.contact ?? '');
    setOfficeHours(profile?.officeHours ?? '');
    setEditing(false);
  };

  const isStudent = role === 'STUDENT';
  const isLecturer = role === 'LECTURER';
  const idLabel = isLecturer ? 'Employee ID' : 'Student ID';

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={s.navbar}>
        <LinearGradient colors={[colors.primary, colors.primaryDark ?? '#0F2580']} style={s.navIcon}>
          <Ionicons name="person" size={18} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={s.navTitle}>My Profile</Text>
          <Text style={s.navSub}>{formatEnum(role)}</Text>
        </View>
        {!loading && profile && (
          <TouchableOpacity
            style={s.editBtn}
            onPress={() => (editing ? handleCancel() : setEditing(true))}
            disabled={saving}
          >
            <Ionicons name={editing ? 'close' : 'create-outline'} size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !profile ? (
        <View style={s.center}>
          <Text style={s.emptyText}>Profile unavailable</Text>
          <TouchableOpacity style={s.retryBtn} onPress={load}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={s.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryLight ?? '#2A5298']}
              style={s.hero}
            >
              <View style={s.avatar}>
                <Text style={s.avatarText}>
                  {profile.name?.charAt(0)?.toUpperCase() ?? '?'}
                </Text>
              </View>
              <Text style={s.heroName}>{profile.name}</Text>
              <Text style={s.heroEmail}>{profile.email}</Text>
            </LinearGradient>

            <View style={s.card}>
              <Text style={s.sectionTitle}>Account</Text>
              <ProfileField label={idLabel} value={profile.studentId} icon="id-card-outline" />
              <ProfileField label="Email" value={profile.email} icon="mail-outline" />

              {isStudent && (
                <>
                  <Text style={[s.sectionTitle, s.sectionGap]}>Academic</Text>
                  <ProfileField label="Department" value={formatEnum(profile.department)} icon="business-outline" />
                  <ProfileField
                    label="Current year"
                    value={
                      profile.currentYear
                        ? `Year ${profile.currentYear}${profile.isRepeating ? ' (repeating)' : ''}`
                        : '—'
                    }
                    icon="school-outline"
                  />
                  <ProfileField label="Semester" value={profile.semester ? `Semester ${profile.semester}` : '—'} icon="calendar-outline" />
                  <ProfileField label="Programme" value={profile.programme} icon="book-outline" />
                  <ProfileField label="Intake year" value={profile.intakeYear ? String(profile.intakeYear) : '—'} icon="time-outline" />
                </>
              )}

              {isLecturer && (
                <>
                  <Text style={[s.sectionTitle, s.sectionGap]}>Department</Text>
                  <ProfileField label="Department" value={formatEnum(profile.department)} icon="business-outline" />
                  <ProfileField label="Designation" value={formatEnum(profile.designation)} icon="ribbon-outline" />
                </>
              )}

              <Text style={[s.sectionTitle, s.sectionGap]}>Contact</Text>
              {editing ? (
                <>
                  <EditableField
                    label="Phone / contact"
                    value={contact}
                    onChangeText={setContact}
                    icon="call-outline"
                    placeholder="e.g. 17XXXXXX"
                  />
                  {isLecturer && (
                    <EditableField
                      label="Office hours"
                      value={officeHours}
                      onChangeText={setOfficeHours}
                      icon="time-outline"
                      multiline
                      placeholder="e.g. Mon–Fri 9:00–12:00"
                    />
                  )}
                </>
              ) : (
                <>
                  <ProfileField label="Phone / contact" value={profile.contact} icon="call-outline" />
                  {isLecturer && (
                    <ProfileField label="Office hours" value={profile.officeHours} icon="time-outline" />
                  )}
                </>
              )}
            </View>

            {editing && (
              <TouchableOpacity
                style={[s.saveBtn, saving && s.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={s.saveBtnText}>Save changes</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: STATUS_BAR_HEIGHT + 8,
    paddingHorizontal: spacing.md,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  navSub:   { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { color: colors.textSecondary, fontSize: 15 },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  retryText: { color: '#fff', fontWeight: '600' },
  scroll: { paddingBottom: 32 },
  hero: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.lg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#fff' },
  heroName:  { fontSize: 22, fontWeight: '700', color: '#fff' },
  heroEmail: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  card: {
    margin: spacing.md,
    marginTop: spacing.md,
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textLight,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  sectionGap: { marginTop: spacing.md },
  field: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  fieldIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EEF3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  fieldBody: { flex: 1 },
  fieldLabel: { fontSize: 11, color: colors.textLight, fontWeight: '600', marginBottom: 2 },
  fieldValue: { fontSize: 15, color: colors.text, fontWeight: '500' },
  input: {
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    backgroundColor: colors.cardAlt,
  },
  inputMultiline: { minHeight: 72, paddingTop: 10 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: spacing.md,
    marginTop: 4,
    paddingVertical: 14,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
