import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { StatusBar } from "expo-status-bar";
import React, { useMemo } from "react";
import {
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { THEME } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useConfig } from "../../context/ConfigContext";

function CustomDrawerContent(props: any) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const userRole = (user as any)?.role;
  const isAdmin =
    userRole === "ADMIN" ||
    userRole === "SUPER_ADMIN" ||
    userRole?.toUpperCase() === "ADMIN" ||
    userRole?.toUpperCase() === "SUPER_ADMIN" ||
    user?.email?.toLowerCase() === "admin@company.com" ||
    user?.email?.toLowerCase()?.includes("admin");

  const displayRole =
    isAdmin || user?.email?.toLowerCase() === "admin@company.com"
      ? "ADMIN"
      : user?.designation || userRole || "EMPLOYEE";

  const handleLogout = async () => {
    props.navigation?.closeDrawer?.();
    await logout();
    router.replace("/(auth)/login");
  };

  const navigateTo = (path: string) => {
    props.navigation?.closeDrawer?.();
    router.push(path as any);
  };

  const isItemActive = (routePath: string) => {
    if (!pathname) {
      return routePath.includes("dashboard");
    }
    if (routePath.includes("dashboard")) {
      return (
        pathname.includes("dashboard") ||
        pathname === "/" ||
        pathname.endsWith("/tabs") ||
        pathname.endsWith("(app)")
      );
    }
    const key = routePath.split("/").pop();
    return key ? pathname.includes(key) : false;
  };

  const avatarUri = (user as any)?.profileImage || (user as any)?.avatar;

  const { modules } = useConfig();

  // The 11 exact menu items as default fallback
  const adminMenuItems = [
    { label: "Dashboard", icon: "grid-outline", route: "/(app)/tabs/dashboard", isLogout: false },
    { label: "CRM", icon: "people-outline", route: "/(app)/tabs/crm", isLogout: false },
    { label: "Projects", icon: "briefcase-outline", route: "/(app)/tabs/projects", isLogout: false },
    { label: "Salary", icon: "cash-outline", route: "/(app)/salary", isLogout: false },
    { label: "Attendance", icon: "calendar-outline", route: "/(app)/attendance", isLogout: false },
    { label: "Bike Tracking", icon: "bicycle-outline", route: "/(app)/tabs/bike", isLogout: false },
    { label: "Quotation", icon: "document-text-outline", route: "/(app)/quotation", isLogout: false },
    { label: "Transactions", icon: "card-outline", route: "/(app)/transactions", isLogout: false },
    { label: "Reports", icon: "stats-chart-outline", route: "/(app)/tabs/reports", isLogout: false },
    { label: "Settings", icon: "settings-outline", route: "/(app)/tabs/profile", isLogout: false },
    { label: "Logout", icon: "log-out-outline", route: "", isLogout: true },
  ];

  const employeeMenuItems = [
    { label: "Dashboard", icon: "grid-outline", route: "/(app)/tabs/dashboard", isLogout: false },
    { label: "Projects", icon: "briefcase-outline", route: "/(app)/tabs/projects", isLogout: false },
    { label: "Salary", icon: "cash-outline", route: "/(app)/salary", isLogout: false },
    { label: "Attendance", icon: "calendar-outline", route: "/(app)/attendance", isLogout: false },
    { label: "Bike Tracking", icon: "bicycle-outline", route: "/(app)/tabs/bike", isLogout: false },
    { label: "Settings", icon: "settings-outline", route: "/(app)/tabs/profile", isLogout: false },
    { label: "Logout", icon: "log-out-outline", route: "", isLogout: true },
  ];

  // Dynamic modules synchronized from Dashboard in real-time
  const menuList = useMemo(() => {
    if (modules && modules.length > 0) {
      const activeMobileModules = modules.filter(
        (m: any) => m.enabled !== false && m.mobileVisible !== false
      );

      const userRoleUpper = ((userRole as string) || "EMPLOYEE").toUpperCase();
      const isSuper = isAdmin || userRoleUpper === "SUPER_ADMIN";

      const filtered = activeMobileModules.filter((m: any) => {
        if (isSuper) return true;
        if (!m.allowedRoles || m.allowedRoles.length === 0) return true;
        return m.allowedRoles.includes(userRoleUpper);
      });

      const dynamicList: { label: string; icon: string; route: string; isLogout: boolean }[] = filtered.map((m: any) => ({
        label: m.label,
        icon: m.icon || "grid-outline",
        route: m.mobileRoute || "/(app)/tabs/dashboard",
        isLogout: false,
      }));

      dynamicList.push({
        label: "Logout",
        icon: "log-out-outline",
        route: "",
        isLogout: true,
      });

      return dynamicList;
    }

    return isAdmin ? adminMenuItems : employeeMenuItems;
  }, [modules, isAdmin, userRole]);

  return (
    <View style={styles.drawerRoot}>
      {/* 1. DARK MAROON PROFILE SECTION (Rounded Upper Corners) */}
      <TouchableOpacity
        style={styles.profileSection}
        onPress={() => navigateTo("/(app)/tabs/profile")}
        activeOpacity={0.85}
      >
        <View style={styles.profileRow}>
          <View style={styles.avatarCircle}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarInitial}>
                {user?.name?.charAt(0)?.toUpperCase() || "S"}
              </Text>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>
              {user?.name || (isAdmin ? "Super Admin" : "Employee")}
            </Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {displayRole.toUpperCase()}
              </Text>
            </View>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color="#FFFFFF"
            style={{ opacity: 0.9 }}
          />
        </View>
      </TouchableOpacity>

      {/* 2. SIDEBAR MENU ITEMS (Vertically Scrollable, Outline Icons) */}
      <ScrollView
        style={styles.whiteNavArea}
        contentContainerStyle={styles.navContainerStyle}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.navLinks}>
          {menuList.map((item) => {
            if (item.isLogout) {
              return (
                <DrawerMenuItem
                  key="logout"
                  icon={item.icon}
                  label={item.label}
                  isActive={false}
                  isLogout={true}
                  onPress={handleLogout}
                />
              );
            }

            const targetRoute = item.route || "";
            const active = isItemActive(targetRoute);
            return (
              <DrawerMenuItem
                key={item.label}
                icon={item.icon}
                label={item.label}
                isActive={active}
                onPress={() => targetRoute && navigateTo(targetRoute)}
              />
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function DrawerMenuItem({ icon, label, isActive, isLogout, onPress }: any) {
  return (
    <TouchableOpacity
      style={[styles.drawerItem, isActive && styles.drawerItemActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon as any}
        size={20}
        color={
          isLogout ? "#E53E3E" : isActive ? THEME.colors.primary : "#333333"
        }
        style={styles.drawerIcon}
      />
      <Text
        style={[
          styles.drawerLabel,
          isActive && styles.drawerLabelActive,
          isLogout && styles.logoutLabel,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function AppLayout() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Android ActionBar is 56dp, iOS standard header ~50dp
  const headerHeight = insets.top + (Platform.OS === "android" ? 56 : 50);

  // Approximately 80-85% of mobile screen width
  const drawerWidth = Math.min(Math.round(width * 0.83), 340);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerShown: false,
          drawerType: "front",
          overlayColor: "rgba(0, 0, 0, 0.55)",
          drawerStyle: {
            width: drawerWidth,
            backgroundColor: "#FFFFFF",
            marginTop: headerHeight + 6,
            marginBottom: Math.max(insets.bottom, 16) + 16,
            borderRadius: 26,
            borderTopRightRadius: 26,
            borderBottomRightRadius: 26,
            overflow: "hidden",
            elevation: 12,
            shadowColor: "#000",
            shadowOffset: { width: 4, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
          },
        }}
      >
        <Drawer.Screen name="tabs" options={{ title: "Home" }} />
        <Drawer.Screen
          name="attendance"
          options={{ drawerItemStyle: { display: "none" } }}
        />
        <Drawer.Screen
          name="project-detail"
          options={{ drawerItemStyle: { display: "none" } }}
        />
        <Drawer.Screen
          name="quotation"
          options={{ drawerItemStyle: { display: "none" } }}
        />
        <Drawer.Screen
          name="salary"
          options={{ drawerItemStyle: { display: "none" } }}
        />
        <Drawer.Screen
          name="transactions"
          options={{ drawerItemStyle: { display: "none" } }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  drawerRoot: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  // 3. Profile section: dark maroon background with rounded upper corners
  profileSection: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  avatarImg: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  avatarInitial: {
    color: THEME.colors.primary,
    fontSize: 22,
    fontWeight: "700",
  },
  profileInfo: {
    flex: 1,
    justifyContent: "center",
  },
  profileName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  roleBadge: {
    alignSelf: "flex-start",
    marginTop: 4,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  roleBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },

  // 4. Navigation Links
  whiteNavArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  navContainerStyle: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  navLinks: {
    gap: 4,
  },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "transparent",
    borderLeftWidth: 4,
    borderLeftColor: "transparent",
  },
  drawerItemActive: {
    backgroundColor: "#FCE8EB", // Light pink background
    borderLeftColor: THEME.colors.primary, // Maroon left indicator
  },
  drawerIcon: {
    marginRight: 14,
  },
  drawerLabel: {
    fontSize: 14.5,
    color: "#222222",
    fontWeight: "500",
  },
  drawerLabelActive: {
    color: THEME.colors.primary,
    fontWeight: "700",
  },
  logoutLabel: {
    color: "#E53E3E",
    fontWeight: "600",
  },
});
