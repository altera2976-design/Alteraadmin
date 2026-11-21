import { Tabs, useNavigation } from 'expo-router';
import { THEME } from '../../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Platform, TouchableOpacity, View, Image } from 'react-native';

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
      style={{ marginLeft: 16 }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="menu-outline" size={28} color="#111" />
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#fff',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: THEME.colors.border,
        },
        headerTitleStyle: {
          fontSize: 16,
          fontWeight: '700',
          color: '#111',
        },
        headerLeft: () => <DrawerMenuButton />,
        headerRight: () => (
          <TouchableOpacity style={{ marginRight: 16 }}>
            <Ionicons name="notifications-outline" size={24} color={THEME.colors.primary} />
            <View style={{ position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: THEME.colors.primary }} />
          </TouchableOpacity>
        ),
        tabBarActiveTintColor: THEME.colors.primary,
        tabBarInactiveTintColor: THEME.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: THEME.colors.border,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 12,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          headerTitleAlign: 'center',
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Image 
                source={require('../../../../assets/images/logo-transparent.png')} 
                style={{ width: 140, height: 40 }} 
                resizeMode="contain" 
              />
            </View>
          ),
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="home-outline"
              size={size || 24}
              color={typeof color === 'string' ? color : THEME.colors.primary}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="crm"
        options={{
          title: 'CRM',
          headerTitle: 'CRM',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="people-outline"
              size={size || 24}
              color={typeof color === 'string' ? color : THEME.colors.primary}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projects',
          headerTitle: 'Projects',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="briefcase-outline"
              size={size || 24}
              color={typeof color === 'string' ? color : THEME.colors.primary}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="bike"
        options={{
          title: 'Bike',
          headerTitle: 'Bike Tracking',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="bicycle-outline"
              size={size || 24}
              color={typeof color === 'string' ? color : THEME.colors.primary}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          headerTitle: 'Reports',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="pie-chart-outline"
              size={size || 24}
              color={typeof color === 'string' ? color : THEME.colors.primary}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            try {
              (navigation as any)?.getParent?.()?.openDrawer?.() ?? (navigation as any)?.openDrawer?.();
            } catch {
              // safe fallback
            }
          },
        })}
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="ellipsis-horizontal-outline"
              size={size || 24}
              color={typeof color === 'string' ? color : THEME.colors.primary}
            />
          ),
        }}
      />
      {/* Hide the original profile screen from the tabs, it's accessible via drawer */}
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}
