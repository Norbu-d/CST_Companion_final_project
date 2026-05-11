# 📱 Campus Companion

> A React Native mobile application built for new students at the **College of Science and Technology (CST), Rinchending, Phuentsholing** — Royal University of Bhutan.
> Built for SWE201 – Cross Platform Development | Programming Assignment 1 | Year 2, Sem 4.

---

## 📌 App Overview

**Campus Companion** is a multi-screen mobile application designed to help new students at CST quickly access essential college information from a single app. Instead of navigating multiple websites or asking around campus, students can open the app and instantly find:

- Important campus contacts with phone and email access
- Their weekly class schedule organized by day
- The latest college announcements and notices
- Quick navigation to all key sections from the home screen

The app is built with **React Native + Expo** using **JavaScript**, and follows a clean, modular architecture suitable for extension in future assignments.

---

## ✨ Features

| Feature | Description |
|---|---|
| **Home Screen** | Gradient hero banner, live stat cards (classes/notices/contacts), 2×2 quick-access tile grid, pinned notice alert strip |
| **Contacts Screen** | Full contact list using `FlatList`, live search/filter bar, department color-coded cards with avatar, phone preview, and dept badge |
| **Contact Detail Screen** | Full contact profile with Call and Email action buttons (`Linking` API), office hours, info card, accessed via Stack navigation with parameter passing |
| **Schedule Screen** | Weekday selector pill chips (auto-highlights today), color-coded class cards by type (Lab/Lecture/Tutorial), empty state for free days |
| **Notice Board Screen** | Category filter chips (All / Exam / Academic / Event / Notice), pinned notices, color-coded badges, FlatList with empty state |
| **Navigation** | Bottom Tab Navigator (Home, Contacts, Schedule, Notices) + Stack Navigator for Contact Detail screen |
| **Dynamic Styles** | Active day chip, selected contact highlight, active filter chip, `Platform.select` shadows |
| **Responsive Design** | `Dimensions` API, flex-based layouts, `ScrollView`/`FlatList` throughout, safe area insets |

---

## 🗂️ Project Structure

```
CampusCompanion/
├── App.js                          # Root entry point
├── README.md
├── assets/
│   └── icon.png
├── src/
│   ├── navigation/
│   │   └── AppNavigator.js         # Stack + Bottom Tab navigator setup
│   ├── screens/
│   │   ├── HomeScreen.js           # Home with hero, stats, quick tiles
│   │   ├── ContactsScreen.js       # FlatList of contacts with search
│   │   ├── ContactDetailScreen.js  # Detail view — receives params from stack
│   │   ├── ScheduleScreen.js       # Weekly timetable with day selector
│   │   └── NoticeBoardScreen.js    # Announcements with category filter
│   └── theme/
│       └── theme.js                # Colors, spacing, typography, shadows, dept/type color maps
```

---

## 🛠️ Prerequisites

Before running the project, make sure you have the following installed:

- **Node.js** v16 or higher → [nodejs.org](https://nodejs.org)
- **npm** (comes with Node.js) or **Yarn**
- **Expo CLI** (install globally)
- **Android Studio** with an Android emulator set up, OR a physical Android/iOS device with the **Expo Go** app installed

---

## 🚀 Installation & Running

### Step 1 — Clone the repository

```bash
git clone https://github.com/<your-username>/CampusCompanion.git
cd CampusCompanion
```

### Step 2 — Install dependencies

```bash
npm install
```

This installs all packages listed in `package.json`, including:
- `@react-navigation/native`
- `@react-navigation/stack`
- `@react-navigation/bottom-tabs`
- `react-native-screens`
- `react-native-safe-area-context`
- `react-native-gesture-handler`
- `react-native-reanimated`
- `expo-linear-gradient`
- `@expo/vector-icons`

### Step 3 — Install Expo-specific packagesss

```bash and nex
npx expo install react-native-screens react-native-safe-area-context react-native-gesture-handler react-native-reanimated expo-linear-gradient
```

### Step 4 — Start the development server

```bash
npx expo start
```

### Step 5 — Run on your preferred platform

| Method | Command / Action |
|---|---|
| Android emulator | Press `a` in the terminal after `expo start` |
| iOS simulator (Mac only) | Press `i` in the terminal |
| Physical device | Scan the QR code with **Expo Go** (Android) or the **Camera app** (iOS) |

---

## 📦 Key Dependencies

```json
"dependencies": {
  "expo": "~52.0.0",
  "react": "18.3.2",
  "react-native": "0.76.3",
  "@react-navigation/native": "^6.x",
  "@react-navigation/stack": "^6.x",
  "@react-navigation/bottom-tabs": "^6.x",
  "react-native-screens": "~4.1.0",
  "react-native-safe-area-context": "4.12.0",
  "react-native-gesture-handler": "~2.20.2",
  "react-native-reanimated": "~3.16.1",
  "expo-linear-gradient": "~14.0.1",
  "@expo/vector-icons": "^14.0.2"
}
```

---

## 📋 Navigation Architecture

```
AppNavigator (Stack)
├── Main (Bottom Tabs)
│   ├── Home          → HomeScreen.js
│   ├── Contacts      → ContactsScreen.js
│   ├── Schedule      → ScheduleScreen.js
│   └── Notices       → NoticeBoardScreen.js
└── ContactDetail     → ContactDetailScreen.js
                         (receives { contact } via route.params)
```

Parameter passing example (ContactsScreen → ContactDetailScreen):
```js
navigation.navigate('ContactDetail', { contact: item });
// Retrieved in ContactDetailScreen:
const { contact } = route.params;
```

---

## ⚠️ Known Issues & Limitations

1. **Call / Email on emulator** — The `Linking.openURL('tel:...')` and `mailto:` actions require a real device. On most emulators these will silently fail or show an alert. Test on a physical device for full functionality.

2. **Static data** — All contacts, schedules, and notices are hardcoded. In a production version these would be fetched from a backend API or college VLE.

3. **No authentication** — The app has no login screen. Future assignments may add student login via the RUB/CST student portal.

4. **No dark mode** — Light theme only in this version. A dark mode toggle was considered but deferred to keep the scope focused on core requirements.

5. **Campus Map screen** — The "Campus Map" tile on the Home screen is visible but currently non-functional (placeholder for future implementation).

6. **iOS gesture handler** — On iOS, wrap `App.js` content inside `<GestureHandlerRootView>` from `react-native-gesture-handler` if gesture conflicts arise.

---

## 👤 Author

**[Your Full Name]**
Student ID: 02230293
Programme: BE Software Engineering — Year 2, Semester 4
College of Science and Technology, RUB
Phuentsholing, Bhutan#