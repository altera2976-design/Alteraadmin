import { Ionicons } from '@expo/vector-icons';
import { Tabs, useNavigation, useRouter } from 'expo-router';
import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../../../constants/theme';
import { useAuth } from '../../../context/AuthContext';

function DrawerMenuButton() {
  const navigation = useNavigation<any>();
  return (
    <TouchableOpacity
      onPress={() => {
        try {
          if (navigation?.openDrawer) {
            navigation.openDrawer();
          } else if (navigation?.getParent) {
            navigation.getParent()?.openDrawer?.();
          }
        } catch {
          // safe fallback
        }
      }}
      style={styles.headerButtonLeft}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      activeOpacity={0.7}
    >
      <Ionicons name="menu" size={28} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

function NotificationButton() {
  return (
    <TouchableOpacity
      style={styles.headerButtonRight}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      activeOpacity={0.7}
    >
      <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
      <View style={styles.notificationDot} />
    </TouchableOpacity>
  );
}

function CustomBottomTabBar({ state, navigation: propNavigation }: any) {
  const insets = useSafeAreaInsets();
  const hookNavigation = useNavigation<any>();
  const router = useRouter();
  const navigation = propNavigation || hookNavigation;

  // The 3 options for the fixed bottom navigation bar
  const tabs = [
    {
      name: 'dashboard',
      label: 'Home',
      icon: 'home-outline',
      activeIcon: 'home',
    },
    {
      name: 'modules',
      label: 'Modules',
      icon: 'grid-outline',
      activeIcon: 'grid',
    },
    {
      name: 'more',
      label: 'More',
      icon: 'ellipsis-horizontal-outline',
      activeIcon: 'ellipsis-horizontal',
      isMore: true,
    },
  ];

  const currentRouteName = state?.routes ? state.routes[state.index]?.name : undefined;

  return (
    <View
      style={[
        styles.bottomBarContainer,
        {
          paddingBottom: Math.max(insets.bottom, 10),
          height: 62 + Math.max(insets.bottom, 10),
        },
      ]}
    >
      <View style={styles.bottomBarInner}>
        {tabs.map((tab) => {
          const isFocused =
            currentRouteName === tab.name ||
            (tab.name === 'dashboard' &&
              (currentRouteName === 'index' || !currentRouteName));

          const onPress = () => {
            if (tab.isMore) {
              try {
                navigation?.getParent?.()?.openDrawer?.() ??
                  navigation?.openDrawer?.() ??
                  hookNavigation?.getParent?.()?.openDrawer?.() ??
                  hookNavigation?.openDrawer?.();
              } catch {
                // safe fallback
              }
              return;
            }

            try {
              let isPrevented = false;
              if (navigation && typeof navigation.emit === 'function') {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: tab.name,
                  canPreventDefault: true,
                });
                isPrevented = !!event?.defaultPrevented;
              }

              if (!isFocused && !isPrevented) {
                if (navigation && typeof navigation.navigate === 'function') {
                  navigation.navigate(tab.name);
                } else {
                  router.push(`/(app)/tabs/${tab.name}` as any);
                }
              }
            } catch (navErr) {
              try {
                router.push(`/(app)/tabs/${tab.name}` as any);
              } catch {
                // safe fallback
              }
            }
          };

          return (
            <TouchableOpacity
              key={tab.name}
              onPress={onPress}
              activeOpacity={0.75}
              style={[styles.tabItem, isFocused && styles.tabItemActive]}
            >
              <Ionicons
                name={(isFocused ? tab.activeIcon : tab.icon) as any}
                size={22}
                color={isFocused ? THEME.colors.primary : '#222222'}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isFocused ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || (user as any)?.role === 'SUPER_ADMIN';

  return (
    <Tabs
      tabBar={(props) => <CustomBottomTabBar {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: THEME.colors.primary, // Full-width maroon header
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 3,
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '700',
          color: '#FFFFFF',
        },
        headerTintColor: '#FFFFFF',
        headerTitleAlign: 'left',
        headerLeft: () => <DrawerMenuButton />,
        headerRight: () => <NotificationButton />,
      }}
    >
      {/* 3 visible tabs in bottom navigation */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          headerTitle: 'Dashboard',
        }}
      />
      <Tabs.Screen
        name="modules"
        options={{
          title: 'Modules',
          headerTitle: 'Modules',
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          headerTitle: 'More',
        }}
      />

      {/* Other tabs remain valid routable screens, hidden from the 3-item bottom bar */}
      <Tabs.Screen
        name="crm"
        options={{
          href: null,
          title: 'CRM',
          headerTitle: 'CRM',
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          href: null,
          title: 'Projects',
          headerTitle: 'Projects',
        }}
      />
      <Tabs.Screen
        name="bike"
        options={{
          href: null,
          title: 'Bike Tracking',
          headerTitle: 'Bike Tracking',
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          href: null,
          title: 'Reports',
          headerTitle: 'Reports',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
          title: 'Settings',
          headerTitle: 'Settings',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  // Header Buttons
  headerButtonLeft: {
    marginLeft: 16,
    marginRight: 10,
    padding: 4,
  },
  headerButtonRight: {
    marginRight: 16,
    padding: 6,
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53E3E',
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
  },

  // 6. Fixed Bottom Navigation Bar
  bottomBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF', // White background
    borderTopLeftRadius: 24, // Rounded upper corners
    borderTopRightRadius: 24,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderTopWidth: Platform.OS === 'android' ? 0 : StyleSheet.hairlineWidth,
    borderTopColor: '#EEEEEE',
  },
  bottomBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: 20,
  },
  tabItem: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 18,
    minWidth: 84,
  },
  tabItemActive: {
    backgroundColor: '#FCE8EB', // Light pink background
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 3,
  },
  tabLabelActive: {
    color: THEME.colors.primary, // Maroon text
    fontWeight: '700',
  },
  tabLabelInactive: {
    color: '#222222', // Black text
    fontWeight: '500',
  },
});
