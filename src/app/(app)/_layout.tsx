import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
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
    user?.email?.toLowerCase() === "alterakitcheninterior@gmail.com";

  const displayRole =
    isAdmin || user?.email?.toLowerCase() === "alterakitcheninterior@gmail.com"
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

  // Exact 10 main menu items + Logout matching the reference screenshot
  const adminMenuItems = [
    {
      label: "Dashboard",
      icon: "grid-outline",
      route: "/(app)/tabs/dashboard",
    },
    { label: "CRM", icon: "person-outline", route: "/(app)/tabs/crm" },
    {
      label: "Projects",
      icon: "git-network-outline",
      route: "/(app)/tabs/projects",
    },
    { label: "Salary", icon: "cash-outline", route: "/(app)/salary" },
    {
      label: "Attendance",
      icon: "calendar-outline",
      route: "/(app)/attendance",
    },
    {
      label: "Bike Tracking",
      icon: "bicycle-outline",
      route: "/(app)/tabs/bike",
    },
    {
      label: "Quotation",
      icon: "document-text-outline",
      route: "/(app)/quotation",
    },
    {
      label: "Transactions",
      icon: "swap-horizontal-outline",
      route: "/(app)/transactions",
    },
    {
      label: "Reports",
      icon: "stats-chart-outline",
      route: "/(app)/tabs/reports",
    },
    {
      label: "Settings",
      icon: "settings-outline",
      route: "/(app)/tabs/profile",
    },
  ];

  return (
    <View style={styles.drawerCard}>
      {/* 1. DARK MAROON PROFILE HEADER (Top Rounded Corners) */}
      <TouchableOpacity
        style={styles.profileHeader}
        onPress={() => navigateTo("/(app)/tabs/profile")}
        activeOpacity={0.88}
      >
        <View style={styles.profileRow}>
          {/* Circular White Avatar */}
          <View style={styles.avatarCircle}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarInitial}>
                {user?.name?.charAt(0)?.toUpperCase() || "S"}
              </Text>
            )}
          </View>

          {/* User Name & Role */}
          <View style={styles.profileTextWrap}>
            <Text style={styles.profileName} numberOfLines={1}>
              {user?.name || (isAdmin ? "Super Admin" : "Employee")}
            </Text>
            <Text style={styles.profileRole}>{displayRole.toUpperCase()}</Text>
          </View>

          {/* Right Arrow Icon */}
          <Ionicons
            name="chevron-forward"
            size={20}
            color="#FFFFFF"
            style={{ marginLeft: 6 }}
          />
        </View>
      </TouchableOpacity>

      {/* 2. MENU ITEMS (Clean White Background, Scrollable if needed) */}
      <ScrollView
        style={styles.menuScroll}
        contentContainerStyle={styles.menuScrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.menuList}>
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
                  icon="git-network-outline"
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
                  icon="person-outline"
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

          {/* Logout Item */}
          <DrawerMenuItem
            icon="exit-outline"
            label="Logout"
            isActive={false}
            onPress={handleLogout}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function DrawerMenuItem({ icon, label, isActive, onPress }: any) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, isActive && styles.menuItemActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Maroon vertical indicator capsule on far left of active pink pill */}
      {isActive && <View style={styles.activeIndicator} />}

      <Ionicons
        name={icon as any}
        size={23}
        color={isActive ? THEME.colors.primary : "#111827"}
        style={styles.menuIcon}
      />
      <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function AppLayout() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Position sidebar strictly below the top mobile header
  const headerHeight = insets.top + (Platform.OS === "android" ? 56 : 50);
  const bottomGap = Math.max(insets.bottom + 6, 14);

  // Approximately 78-83% of mobile screen width, leaving 17-22% visible on the right
  const drawerWidth = Math.min(Math.round(width * 0.80), 324);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerShown: false,
          drawerType: "front",
          overlayColor: "rgba(0, 0, 0, 0.45)",
          drawerStyle: {
            width: drawerWidth,
            top: headerHeight + 4,
            bottom: bottomGap,
            marginTop: 0,
            marginBottom: 0,
            backgroundColor: "#FFFFFF",
            borderRadius: 28,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
            overflow: "hidden",
            elevation: 16,
            shadowColor: "#000",
            shadowOffset: { width: 3, height: 6 },
            shadowOpacity: 0.28,
            shadowRadius: 14,
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
  // Main floating drawer card
  drawerCard: {
    flex: 1,
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    overflow: "hidden",
  },

  // 1. Profile Header in Dark Maroon with rounded top corners
  profileHeader: {
    backgroundColor: THEME.colors.primary, // Dark maroon (#7A131A)
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
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
    marginRight: 14,
  },
  avatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827", // Bold black initial
  },
  profileTextWrap: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  profileRole: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 2,
    letterSpacing: 0.6,
  },

  // 2. Menu scroll container
  menuScroll: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  menuScrollContent: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    flexGrow: 1,
  },
  menuList: {
    gap: 4,
  },

  // 3. Menu items: outline icons, bold labels
  menuItem: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: "transparent",
  },

  // Active item: Light pink pill background
  menuItemActive: {
    backgroundColor: "#FDECEF", // Exact light pink matching reference screenshot
  },

  // Maroon indicator capsule on far left of active pill
  activeIndicator: {
    position: "absolute",
    left: 0,
    top: 5,
    bottom: 5,
    width: 5,
    backgroundColor: THEME.colors.primary, // #7A131A
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },

  menuIcon: {
    marginRight: 16,
    width: 26,
    textAlign: "center",
  },
  menuLabel: {
    fontSize: 15.5,
    fontWeight: "700",
    color: "#111827", // Bold readable black label
    letterSpacing: 0.2,
  },
  menuLabelActive: {
    color: "#111827",
    fontWeight: "800",
  },
});
