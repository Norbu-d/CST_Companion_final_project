import React from 'react';
import { ActivityIndicator, View, Platform, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/theme';

import LoginScreen         from '../screens/LoginScreen';
import HomeScreen          from '../screens/HomeScreen';
import ContactsScreen      from '../screens/ContactsScreen';
import ContactDetailScreen from '../screens/ContactDetailScreen';
import ScheduleScreen      from '../screens/ScheduleScreen';
import NoticeBoardScreen   from '../screens/NoticeBoardScreen';
import BookingScreen       from '../screens/BookingScreen';
import MyBookingsScreen    from '../screens/MybookingsScreen';
import MyLeaveScreen       from '../screens/MyLeaveScreen';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

// ── Icon map ─────────────────────────────────────────────────────────────────
const TAB_ICONS = {
  Home:      ['home',          'home-outline'],
  Contacts:  ['people',        'people-outline'],
  Schedule:  ['calendar',      'calendar-outline'],
  Notices:   ['notifications', 'notifications-outline'],
  Bookings:  ['bookmark',      'bookmark-outline'],
  Leave:     ['bed',           'bed-outline'],
};

function tabIcon(routeName, focused, color) {
  const [active, inactive] = TAB_ICONS[routeName] ?? ['ellipse', 'ellipse-outline'];
  return <Ionicons name={focused ? active : inactive} size={22} color={color} />;
}

// ── Tab bar style ─────────────────────────────────────────────────────────────
const TAB_BAR_STYLE = {
  backgroundColor: '#fff',
  borderTopWidth: 1,
  borderTopColor: '#EAECF4',
  paddingTop: 8,
  paddingBottom: Platform.OS === 'android' ? 8 : 4,
  ...Platform.select({
    ios: {
      shadowColor: '#9CA3AF',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
    },
    android: { elevation: 10 },
  }),
};

const BASE_TAB_OPTIONS = {
  headerShown: false,
  tabBarStyle: TAB_BAR_STYLE,
  tabBarActiveTintColor:   colors.primary,
  tabBarInactiveTintColor: '#9CA3AF',
  tabBarLabelStyle: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.1,
    marginBottom: Platform.OS === 'android' ? 2 : 0,
  },
};

// ── Role-specific navigators ─────────────────────────────────────────────────

function StudentTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...BASE_TAB_OPTIONS,
        tabBarIcon: ({ focused, color }) => tabIcon(route.name, focused, color),
      })}
    >
      <Tab.Screen name="Home"     component={HomeScreen} />
      <Tab.Screen name="Contacts" component={ContactsScreen} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} />
      <Tab.Screen name="Notices"  component={NoticeBoardScreen} />
      <Tab.Screen name="Bookings" component={BookingScreen} />
    </Tab.Navigator>
  );
}

function LecturerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...BASE_TAB_OPTIONS,
        tabBarIcon: ({ focused, color }) => tabIcon(route.name, focused, color),
      })}
    >
      <Tab.Screen name="Home"     component={HomeScreen} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} />
      <Tab.Screen name="Contacts" component={ContactsScreen} />
      <Tab.Screen name="Notices"  component={NoticeBoardScreen} />
      <Tab.Screen name="Leave"    component={MyLeaveScreen} />
    </Tab.Navigator>
  );
}

function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...BASE_TAB_OPTIONS,
        tabBarIcon: ({ focused, color }) => tabIcon(route.name, focused, color),
      })}
    >
      <Tab.Screen name="Home"     component={HomeScreen} />
      <Tab.Screen name="Contacts" component={ContactsScreen} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} />
      <Tab.Screen name="Notices"  component={NoticeBoardScreen} />
      <Tab.Screen name="Bookings" component={BookingScreen} />
      <Tab.Screen name="Leave"    component={MyLeaveScreen} />
    </Tab.Navigator>
  );
}

function MainTabs() {
  const { role, loading, userLoaded } = useAuth();

  // Wait until AsyncStorage has fully loaded user+role before rendering tabs
  if (!userLoaded || loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (role === 'LECTURER') return <LecturerTabs />;
  if (role === 'ADMIN')    return <AdminTabs />;
  return <StudentTabs />;
}

// ── Shared stack header ──────────────────────────────────────────────────────
const STACK_HEADER = {
  headerStyle: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#EAECF4',
  },
  headerShadowVisible: false,
  headerTintColor: colors.primary,
  headerTitleStyle: { fontWeight: '700', fontSize: 16, color: '#1A2340' },
  headerBackTitle: 'Back',
};

export default function AppNavigator() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!token ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="ContactDetail"
              component={ContactDetailScreen}
              options={{ headerShown: true, title: 'Contact', ...STACK_HEADER }}
            />
            <Stack.Screen
              name="MyBookings"
              component={MyBookingsScreen}
              options={{ headerShown: true, title: 'My Bookings', ...STACK_HEADER }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F6FB',
  },
});