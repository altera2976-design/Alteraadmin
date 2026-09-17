import { Drawer } from 'expo-router/drawer';
import { THEME } from '../../constants/theme';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';

function CustomDrawerContent(props: any) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === 'ADMIN';

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.drawerRoot}>
      <View style={styles.drawerTopCurve} />
      
      <ScrollView contentContainerStyle={{ paddingTop: 60, paddingHorizontal: 20 }}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => router.push('/(app)/tabs/profile')}
          activeOpacity={0.8}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'A'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName} numberOfLines={1}>{user?.name || 'Employee'}</Text>
            <Text style={styles.userRole} numberOfLines={1}>{user?.designation || user?.role || 'Employee'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>

        <View style={styles.navLinks}>
          <DrawerItem icon="home" label="Dashboard" onPress={() => router.push('/(app)/tabs/dashboard')} />
          <DrawerItem icon="person" label="Profile" onPress={() => router.push('/(app)/tabs/profile')} />
          {isAdmin && <DrawerItem icon="people" label="CRM" onPress={() => router.push('/(app)/tabs/crm')} />}
          <DrawerItem icon="briefcase" label={isAdmin ? "Projects" : "My Projects"} onPress={() => router.push('/(app)/tabs/projects')} />
          <DrawerItem icon="cash" label={isAdmin ? "Salary & Payroll" : "My Salary"} onPress={() => router.push('/(app)/salary')} />
          <DrawerItem icon="calendar" label={isAdmin ? "Attendance" : "Selfie Attendance"} onPress={() => router.push('/(app)/attendance')} />
          {isAdmin && <DrawerItem icon="document-text" label="Quotation" onPress={() => router.push('/(app)/quotation')} />}
          {isAdmin && <DrawerItem icon="pie-chart" label="Reports" onPress={() => router.push('/(app)/tabs/reports')} />}
          <DrawerItem icon="settings" label="Settings" onPress={() => router.push('/(app)/tabs/profile')} />
          <DrawerItem icon="log-out" label="Logout" onPress={handleLogout} />
        </View>
      </ScrollView>
    </View>
  );
}

function DrawerItem({ icon, label, isActive, onPress }: any) {
  return (
    <TouchableOpacity style={[styles.drawerItem, isActive && styles.drawerItemActive]} onPress={onPress}>
      <Ionicons name={(icon + '-outline') as any} size={20} color={isActive ? THEME.colors.primary : '#333'} style={styles.drawerIcon} />
      <Text style={[styles.drawerLabel, isActive && styles.drawerLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function AppLayout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          width: '75%',
          backgroundColor: '#fff',
        },
      }}
    >
      {/* We set the main tabs layout as the primary screen in the drawer */}
      <Drawer.Screen name="tabs" options={{ title: 'Home' }} />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerRoot: {
    flex: 1,
    backgroundColor: '#fff',
  },
  drawerTopCurve: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: THEME.colors.primary,
    borderBottomRightRadius: 80,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarText: {
    color: THEME.colors.primary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  userRole: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
  navLinks: {
    gap: 8,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  drawerItemActive: {
    backgroundColor: 'rgba(200,16,46,0.05)',
  },
  drawerIcon: {
    marginRight: 16,
  },
  drawerLabel: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  drawerLabelActive: {
    color: THEME.colors.primary,
    fontWeight: '600',
  },
});
