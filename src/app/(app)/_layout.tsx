import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import React from "react";
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

  // Exact 11 menu items specified by user with outline icons
  const adminMenuItems = [
    { label: "Dashboard", icon: "grid-outline", route: "/(app)/tabs/dashboard" },
    { label: "CRM", icon: "people-outline", route: "/(app)/tabs/crm" },
    { label: "Projects", icon: "briefcase-outline", route: "/(app)/tabs/projects" },
    { label: "Salary", icon: "cash-outline", route: "/(app)/salary" },
    { label: "Attendance", icon: "calendar-outline", route: "/(app)/attendance" },
    { label: "Bike Tracking", icon: "bicycle-outline", route: "/(app)/tabs/bike" },
    { label: "Quotation", icon: "document-text-outline", route: "/(app)/quotation" },
    { label: "Transactions", icon: "card-outline", route: "/(app)/transactions" },
    { label: "Reports", icon: "stats-chart-outline", route: "/(app)/tabs/reports" },
    { label: "Settings", icon: "settings-outline", route: "/(app)/tabs/profile" },
  ];

  return (
    <View style={styles.drawerRoot}>
      {/* 1. DARK MAROON PROFILE HEADER (Top Rounded Corners) */}
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

      {/* 2. MENU ITEMS (Vertically Scrollable, Light Pink Active Background, Maroon Active Indicator) */}
      <ScrollView
        style={styles.menuScroll}
        contentContainerStyle={styles.menuScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.menuContainer}>
          {isAdmin ? (
            <>
              {adminMenuItems.map((item) => {
                const active = isItemActive(item.route);
                return (
                  <DrawerMenuItem
                    key={item.label}
                    icon={item.icon}
                    label={item.label}
                    isActive={active}
                    onPress={() => navigateTo(item.route)}
                  />
                );
              })}
            </>
          ) : (
            <>
              <DrawerMenuItem
                icon="grid-outline"
                label="Dashboard"
                isActive={isItemActive("/(app)/tabs/dashboard")}
                onPress={() => navigateTo("/(app)/tabs/dashboard")}
              />
              {(user?.employeeAppPermissions?.projects ?? true) && (
                <DrawerMenuItem
                  icon="briefcase-outline"
                  label="Projects"
                  isActive={isItemActive("/(app)/tabs/projects")}
                  onPress={() => navigateTo("/(app)/tabs/projects")}
                />
              )}
              {user?.employeeAppPermissions?.salary === true && (
                <DrawerMenuItem
                  icon="cash-outline"
                  label="Salary"
                  isActive={isItemActive("/(app)/salary")}
                  onPress={() => navigateTo("/(app)/salary")}
                />
              )}
              {(user?.employeeAppPermissions?.attendance ?? true) && (
                <DrawerMenuItem
                  icon="calendar-outline"
                  label="Attendance"
                  isActive={isItemActive("/(app)/attendance")}
                  onPress={() => navigateTo("/(app)/attendance")}
                />
              )}
              {user?.employeeAppPermissions?.bikeTracking === true && (
                <DrawerMenuItem
                  icon="bicycle-outline"
                  label="Bike Tracking"
                  isActive={isItemActive("/(app)/tabs/bike")}
                  onPress={() => navigateTo("/(app)/tabs/bike")}
                />
              )}
              {user?.employeeAppPermissions?.crm === true && (
                <DrawerMenuItem
                  icon="people-outline"
                  label="CRM"
                  isActive={isItemActive("/(app)/tabs/crm")}
                  onPress={() => navigateTo("/(app)/tabs/crm")}
                />
              )}
              {user?.employeeAppPermissions?.quotation === true && (
                <DrawerMenuItem
                  icon="document-text-outline"
                  label="Quotation"
                  isActive={isItemActive("/(app)/quotation")}
                  onPress={() => navigateTo("/(app)/quotation")}
                />
              )}
              {user?.employeeAppPermissions?.reports === true && (
                <DrawerMenuItem
                  icon="stats-chart-outline"
                  label="Reports"
                  isActive={isItemActive("/(app)/tabs/reports")}
                  onPress={() => navigateTo("/(app)/tabs/reports")}
                />
              )}
              <DrawerMenuItem
                icon="settings-outline"
                label="Settings"
                isActive={isItemActive("/(app)/tabs/profile")}
                onPress={() => navigateTo("/(app)/tabs/profile")}
              />
            </>
          )}

          {/* Logout Menu Item */}
          <DrawerMenuItem
            icon="log-out-outline"
            label="Logout"
            isActive={false}
            isLogout={true}
            onPress={handleLogout}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function DrawerMenuItem({ icon, label, isActive, isLogout, onPress }: any) {
  return (
    <TouchableOpacity
      style={[
        styles.drawerItem,
        isActive && styles.drawerItemActive,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon as any}
        size={21}
        color={
          isLogout
            ? "#E53E3E"
            : isActive
            ? THEME.colors.primary
            : "#333333"
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

  // Android standard header is 56dp, iOS ~50dp; positioned below mobile header
  const headerHeight = insets.top + (Platform.OS === "android" ? 56 : 50);

  // Approximately 80-85% of mobile screen width
  const drawerWidth = Math.min(Math.round(width * 0.83), 340);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
        <Drawer.Screen name="attendance" options={{ drawerItemStyle: { display: "none" } }} />
        <Drawer.Screen name="project-detail" options={{ drawerItemStyle: { display: "none" } }} />
        <Drawer.Screen name="quotation" options={{ drawerItemStyle: { display: "none" } }} />
        <Drawer.Screen name="salary" options={{ drawerItemStyle: { display: "none" } }} />
        <Drawer.Screen name="transactions" options={{ drawerItemStyle: { display: "none" } }} />
      </Drawer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  drawerRoot: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  // 1. Profile section: Dark maroon background, proper padding & alignment
  profileSection: {
    backgroundColor: THEME.colors.primary, // #7A131A
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
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.85)",
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: "800",
    color: THEME.colors.primary,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  // 2. Menu scroll container
  menuScroll: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  menuScrollContent: {
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  menuContainer: {
    gap: 4,
  },
  // 3. Menu items: outline icons, bold labels, light pink active background, maroon left indicator
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "transparent",
    backgroundColor: "transparent",
  },
  drawerItemActive: {
    backgroundColor: "#FCE8EB", // Light pink active background
    borderLeftColor: THEME.colors.primary, // Maroon active indicator
  },
  drawerIcon: {
    marginRight: 14,
    width: 24,
    textAlign: "center",
  },
  drawerLabel: {
    fontSize: 14.5,
    fontWeight: "600",
    color: "#333333",
    letterSpacing: 0.2,
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
