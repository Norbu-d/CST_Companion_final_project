import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { post } from '../api/client';
import { colors, spacing, radius, shadows } from '../theme/theme';

const { width: SW, height: SH } = Dimensions.get('window');

export default function LoginScreen() {
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [focused, setFocused]       = useState(null);

  const passwordRef = useRef(null);

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      setError('Please enter your Student ID / email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await post('/auth/login', {
        email: identifier.trim(),
        password,
      });
      if (res.success) {
        await login(res.data.token, res.data.user);
      } else {
        setError(res.message || 'Invalid credentials. Please try again.');
      }
    } catch (_) {
      setError('Cannot connect to server. Check your network or backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* ── Decorative circles ───────────────────────────────────────────── */}
      <View style={s.circleLarge} />
      <View style={s.circleSmall} />

      {/* ── Logo + text — sits inside the circle zone ────────────────────── */}
      <View style={s.logoContainer}>
        <View style={s.logoRing}>
          <Image
            source={require('../../assets/cst_logo.jpg')}
            style={s.logoImg}
            resizeMode="cover"
          />
        </View>
        <Text style={s.appName}>Campus Companion</Text>
        <Text style={s.collegeName}>College of Science and Technology · RUB</Text>
      </View>

      {/* ── Form bottom sheet ────────────────────────────────────────────── */}
      <KeyboardAvoidingView
        style={s.formOuter}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={s.form}>

          {/* Student ID / Email */}
          <View style={[s.field, focused === 'id' && s.fieldFocused]}>
            <Ionicons
              name="person-outline"
              size={18}
              color={focused === 'id' ? colors.primary : colors.textLight}
            />
            <TextInput
              style={s.fieldInput}
              placeholder="Student ID or college email"
              placeholderTextColor={colors.textLight}
              value={identifier}
              onChangeText={t => { setIdentifier(t); setError(''); }}
              onFocus={() => setFocused('id')}
              onBlur={() => setFocused(null)}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          {/* Password */}
          <View style={[s.field, focused === 'pass' && s.fieldFocused]}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={focused === 'pass' ? colors.primary : colors.textLight}
            />
            <TextInput
              ref={passwordRef}
              style={s.fieldInput}
              placeholder="Password (default: Student ID)"
              placeholderTextColor={colors.textLight}
              value={password}
              onChangeText={t => { setPassword(t); setError(''); }}
              onFocus={() => setFocused('pass')}
              onBlur={() => setFocused(null)}
              secureTextEntry={!showPass}
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity
              onPress={() => setShowPass(v => !v)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons
                name={showPass ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={colors.textLight}
              />
            </TouchableOpacity>
          </View>

          {/* Error */}
          {!!error && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle-outline" size={14} color={colors.redDark} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          {/* Sign in button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.88}
            style={[s.btn, loading && s.btnDisabled]}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Sign In</Text>
            }
          </TouchableOpacity>

          <Text style={s.hint}>
            Default password is your Student ID — e.g. 02241241
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Sizing constants — tweak these if spacing feels off on your device ───────
const CIRCLE_SIZE = SW * 0.72;
const SMALL_SIZE  = SW * 0.52;

// Logo sits at 7% from top — well inside the navy circle zone
const LOGO_TOP  = SH * 0.12;

// Form starts at 42% — fields land roughly in the vertical middle of the screen
const FORM_TOP  = SH * 0.38;

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F1F3F7',
  },

  // ── Circles
  circleLarge: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: colors.primary,
    top: -(CIRCLE_SIZE * 0.28),
    left: -(CIRCLE_SIZE * 0.18),
  },
  circleSmall: {
    position: 'absolute',
    width: SMALL_SIZE,
    height: SMALL_SIZE,
    borderRadius: SMALL_SIZE / 2,
    backgroundColor: colors.primaryLight,
    top: -(SMALL_SIZE * 0.35),
    right: -(SMALL_SIZE * 0.12),
  },

  // ── Logo block
  logoContainer: {
    position: 'absolute',
    top: LOGO_TOP,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  logoRing: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 3,
    borderColor: colors.accent,
    overflow: 'hidden',
    backgroundColor: '#fff',
    marginBottom: 12,
    ...shadows.lg,
  },
  logoImg: {
    width: '100%',
    height: '100%',
  },

  // App name — navy so it reads on both the circle and the gray background
  appName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.3,
    marginBottom: 4,
    // Thin white outline effect via text shadow so it pops on the dark circle too
    textShadowColor: 'rgba(255,255,255,0.9)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  collegeName: {
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 0.2,
    textShadowColor: 'rgba(255,255,255,0.9)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  // ── Form sheet
  formOuter: {
    position: 'absolute',
    top: FORM_TOP,
    left: 0,
    right: 0,
    bottom: 0,
  },
  form: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: spacing.lg,
    paddingTop: 28,
    paddingBottom: 24,
    ...shadows.lg,
  },

  // ── Fields
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F1F3F7',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 16,
    height: 50,
    marginBottom: 14,
  },
  fieldFocused: {
    borderColor: colors.primary,
    backgroundColor: '#EEF2F9',
  },
  fieldInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    padding: 0,
    includeFontPadding: false,
  },

  // ── Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    backgroundColor: colors.redLight,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 11,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: colors.redDark,
    lineHeight: 17,
  },

  // ── Button
  btn: {
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 16,
    ...shadows.md,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.4,
  },

  // ── Hint
  hint: {
    fontSize: 11,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 16,
  },
});