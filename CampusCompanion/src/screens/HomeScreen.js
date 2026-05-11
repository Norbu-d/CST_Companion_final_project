import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme/theme';

const { width: SW } = Dimensions.get('window');
const STATUS_BAR_HEIGHT = StatusBar.currentHeight || 44;
const TILE_W = (SW - spacing.md * 2 - 12) / 2;

// ── Quick-access tiles ───────────────────────────────────────────────────────
const QUICK_TILES = [
  {
    label: 'Contacts',
    sub: '8 entries',
    screen: 'Contacts',
    gradColors: ['#4F8EF7', '#6B73FF'],
    emoji: '📞',
  },
  {
    label: 'Schedule',
    sub: '5 classes today',
    screen: 'Schedule',
    gradColors: ['#2DD4BF', '#3B82F6'],
    emoji: '📅',
  },
  {
    label: 'Notices',
    sub: '3 new',
    screen: 'Notices',
    gradColors: ['#F472B6', '#F87171'],
    emoji: '📢',
  },
  {
    label: 'Bookings',
    sub: 'Book a room',
    screen: 'Bookings',
    gradColors: ['#A78BFA', '#818CF8'],
    emoji: '🏫',
  },
];

// ── Stats ────────────────────────────────────────────────────────────────────
const STATS = [
  { value: '5', label: 'Classes\ntoday',  icon: 'school-outline',        color: '#4F8EF7', bg: '#EEF3FF' },
  { value: '3', label: 'New\nnotices',    icon: 'notifications-outline', color: '#F472B6', bg: '#FDF2F8' },
  { value: '8', label: 'Total\ncontacts', icon: 'people-outline',        color: '#2DD4BF', bg: '#EFFAF8' },
];

export default function HomeScreen({ navigation }) {
  const { logout, user } = useAuth();

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const go = (screen) => { if (screen) navigation.navigate(screen); };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Navbar ────────────────────────────────────────────────────────── */}
      <View style={s.navbar}>
        {/* Logo + app name */}
        <View style={s.navBrand}>
          <View style={s.logoWrap}>
            <Image
              source={require('../../assets/cst_logo.jpg')}
              style={s.logoImg}
              resizeMode="cover"
            />
          </View>
          <View>
            <Text style={s.brandName}>Campus Companion</Text>
            <Text style={s.brandSub}>CST · RUB</Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={s.navBtn}
          onPress={logout}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="log-out-outline" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
      >
        {/* ── Greeting ──────────────────────────────────────────────────── */}
        <View style={s.greetWrap}>
          <Text style={s.greetHi}>{getGreeting()},</Text>
          <Text style={s.greetName}>
            {user?.name?.split(' ')[0] ?? 'Student'} 👋
          </Text>
          <Text style={s.greetDate}>{dateStr}</Text>
        </View>

        {/* ── Hero banner ───────────────────────────────────────────────── */}
        <View style={s.heroBannerWrap}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark ?? '#0F2580']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.heroBanner}
          >
            {/* Deco circles */}
            <View style={s.bc1} />
            <View style={s.bc2} />
            <View style={s.bc3} />

            {/* Logo watermark right side */}
            <View style={s.bannerLogo}>
              <Image
                source={require('../../assets/cst_logo.jpg')}
                style={s.bannerLogoImg}
                resizeMode="cover"
              />
            </View>

            <View style={s.bannerContent}>
              <View style={s.bannerTagPill}>
                <Text style={s.bannerTagText}>WELCOME</Text>
              </View>
              <Text style={s.bannerTitle}>Campus Companion</Text>
              <TouchableOpacity
                style={s.bannerBtn}
                onPress={() => go('Notices')}
                activeOpacity={0.85}
              >
                <Text style={s.bannerBtnText}>View Notices</Text>
                <Ionicons name="arrow-forward" size={12} color={colors.primary} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* ── Stat cards ────────────────────────────────────────────────── */}
        <View style={s.statRow}>
          {STATS.map((st, i) => (
            <View key={i} style={s.statCard}>
              <View style={[s.statIcon, { backgroundColor: st.bg }]}>
                <Ionicons name={st.icon} size={16} color={st.color} />
              </View>
              <Text style={s.statValue}>{st.value}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Quick Access ──────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Quick Access</Text>
          <View style={s.tileGrid}>
            {QUICK_TILES.map((tile) => (
              <TouchableOpacity
                key={tile.label}
                style={s.tile}
                onPress={() => go(tile.screen)}
                activeOpacity={0.82}
              >
                <LinearGradient
                  colors={tile.gradColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.tileGrad}
                >
                  <View style={s.tileDeco} />
                  <Text style={s.tileEmoji}>{tile.emoji}</Text>
                  <Text style={s.tileLabel}>{tile.label}</Text>
                  <Text style={s.tileSub}>{tile.sub}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Latest Alert ──────────────────────────────────────────────── */}
        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Latest Alert</Text>
            <TouchableOpacity onPress={() => go('Notices')}>
              <Text style={s.sectionLink}>See all</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={s.noticeCard}
            onPress={() => go('Notices')}
            activeOpacity={0.82}
          >
            {/* Amber left bar */}
            <View style={s.noticeBar} />
            <View style={s.noticeBody}>
              <View style={s.noticeTopRow}>
                <View style={s.noticeTagPill}>
                  <Text style={s.noticeTagText}>📣  Exam</Text>
                </View>
                <Text style={s.noticeTime}>2 hrs ago</Text>
              </View>
              <Text style={s.noticeTitle}>Mid-Semester Exams</Text>
              <Text style={s.noticeDesc}>
                Exams begin April 10th for all Year 2 students. Check the VLE for the full timetable.
              </Text>
            </View>
            <View style={s.noticeArrow}>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F4F6FB' },
  scroll: { flex: 1 },

  // ── Navbar
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingTop: STATUS_BAR_HEIGHT + 6,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EAECF4',
    ...Platform.select({
      ios:     { shadowColor: '#C4C9D4', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  navBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoWrap: {
    width: 40, height: 40, borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5, borderColor: '#E0E7FF',
    backgroundColor: '#fff',
  },
  logoImg:   { width: '100%', height: '100%' },
  brandName: { fontSize: 15, fontWeight: '800', color: '#1A2340', letterSpacing: -0.3 },
  brandSub:  { fontSize: 10, color: '#8A95B0', fontWeight: '500', marginTop: 1 },
  navBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: '#F4F6FB',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#EAECF4',
  },

  // ── Greeting
  greetWrap: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 2 },
  greetHi:   { fontSize: 13, color: '#8A95B0', fontWeight: '500' },
  greetName: { fontSize: 26, fontWeight: '800', color: '#1A2340', letterSpacing: -0.6, marginTop: 1 },
  greetDate: { fontSize: 11, color: '#B0B8CC', marginTop: 5, fontWeight: '400' },

  // ── Hero banner
  heroBannerWrap: { paddingHorizontal: 16, marginTop: 16 },
  heroBanner: {
    borderRadius: 22,
    padding: 20,
    paddingTop: 22,
    paddingBottom: 22,
    overflow: 'hidden',
    minHeight: 140,
  },
  bc1: {
    position: 'absolute', right: -40, top: -40,
    width: 170, height: 170, borderRadius: 85,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  bc2: {
    position: 'absolute', right: 60, bottom: -20,
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  bc3: {
    position: 'absolute', left: -20, top: 40,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  // Logo watermark (right side of banner)
  bannerLogo: {
    position: 'absolute',
    right: 20, top: '50%',
    marginTop: -28,
    width: 56, height: 56, borderRadius: 14,
    overflow: 'hidden',
    opacity: 0.18,
    backgroundColor: '#fff',
  },
  bannerLogoImg: { width: '100%', height: '100%' },

  bannerContent: { zIndex: 2 },
  bannerTagPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 10,
  },
  bannerTagText: { color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  bannerTitle: {
    color: '#fff', fontSize: 22, fontWeight: '800',
    letterSpacing: -0.4, marginBottom: 14,
  },
  bannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bannerBtnText: { color: colors.primary, fontSize: 12, fontWeight: '700' },

  // ── Stat row
  statRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAECF4',
    ...Platform.select({
      ios:     { shadowColor: '#C4C9D4', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  statIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 7,
  },
  statValue: { fontSize: 20, fontWeight: '800', color: '#1A2340', lineHeight: 24 },
  statLabel: { fontSize: 9, fontWeight: '600', color: '#9CA3AF', marginTop: 3, textAlign: 'center', lineHeight: 13 },

  // ── Section
  section:    { paddingHorizontal: 16, marginTop: 22 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1A2340', letterSpacing: -0.3, marginBottom: 12 },
  sectionLink:  { fontSize: 12, color: colors.primary, fontWeight: '600' },

  // ── 2×2 Gradient tile grid
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile:     { width: TILE_W, borderRadius: 20, overflow: 'hidden' },
  tileGrad: {
    padding: 16,
    paddingBottom: 18,
    height: 118,
    justifyContent: 'flex-end',
  },
  tileDeco: {
    position: 'absolute',
    right: -16, top: -16,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  tileEmoji: { fontSize: 28, marginBottom: 6 },
  tileLabel: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  tileSub:   { color: 'rgba(255,255,255,0.72)', fontSize: 10, marginTop: 2 },

  // ── Notice card
  noticeCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EAECF4',
    ...Platform.select({
      ios:     { shadowColor: '#C4C9D4', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  noticeBar: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: '#F59E0B',
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  noticeBody: { flex: 1, padding: 14 },
  noticeTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  noticeTagPill: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  noticeTagText: { fontSize: 10, fontWeight: '700', color: '#92400E' },
  noticeTime:    { fontSize: 10, color: '#9CA3AF', fontWeight: '500' },
  noticeTitle:   { fontSize: 13, fontWeight: '800', color: '#1A2340', marginBottom: 4, lineHeight: 18 },
  noticeDesc:    { fontSize: 11, color: '#6B7280', lineHeight: 16 },
  noticeArrow:   { paddingRight: 14 },
});