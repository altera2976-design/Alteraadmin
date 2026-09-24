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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { THEME } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";

function CustomDrawerContent(props: any) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

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
  const dynamicTopPadding = Math.max(insets.top + 12, Platform.OS === "ios" ? 52 : 44);

  return (
    <View style={styles.drawerRoot}>
      {/* 1. RED HEADER SECTION */}
      <TouchableOpacity
        style={[styles.headerSection, { paddingTop: dynamicTopPadding }]}
        onPress={() => navigateTo("/(app)/tabs/profile")}
        activeOpacity={0.85}
      >
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || "S"}
              </Text>
            )}
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.name || "Sahendra kumar"}
            </Text>
            <Text style={styles.userRole} numberOfLines={1}>
              {displayRole.toUpperCase()}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color="#FFFFFF"
            style={{ opacity: 0.9 }}
          />
        </View>
      </TouchableOpacity>

      {/* 2. WHITE NAVIGATION AREA */}
      <ScrollView
        style={styles.whiteNavArea}
        contentContainerStyle={styles.navContainerStyle}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.navLinks}>
          <DrawerItem
            icon="grid"
            label="Dashboard"
            isActive={isItemActive("/(app)/tabs/dashboard")}
            onPress={() => navigateTo("/(app)/tabs/dashboard")}
          />

          {isAdmin ? (
            <>
              <DrawerItem
                icon="people"
                label="CRM"
                isActive={isItemActive("/(app)/tabs/crm")}
                onPress={() => navigateTo("/(app)/tabs/crm")}
              />
              <DrawerItem
                icon="briefcase"
                label="Projects"
                isActive={isItemActive("/(app)/tabs/projects")}
                onPress={() => navigateTo("/(app)/tabs/projects")}
              />
              <DrawerItem
                icon="cash"
                label="Salary"
                isActive={isItemActive("/(app)/salary")}
                onPress={() => navigateTo("/(app)/salary")}
              />
              <DrawerItem
                icon="calendar"
                label="Attendance"
                isActive={isItemActive("/(app)/attendance")}
                onPress={() => navigateTo("/(app)/attendance")}
              />
              <DrawerItem
                icon="bicycle"
                label="Bike Tracking"
                isActive={isItemActive("/(app)/tabs/bike")}
                onPress={() => navigateTo("/(app)/tabs/bike")}
              />
              <DrawerItem
                icon="document-text"
                label="Quotation"
                isActive={isItemActive("/(app)/quotation")}
                onPress={() => navigateTo("/(app)/quotation")}
              />
              <DrawerItem
                icon="card"
                label="Transactions"
                isActive={isItemActive("/(app)/transactions")}
                onPress={() => navigateTo("/(app)/transactions")}
              />
              <DrawerItem
                icon="stats-chart"
                label="Reports"
                isActive={isItemActive("/(app)/tabs/reports")}
                onPress={() => navigateTo("/(app)/tabs/reports")}
              />
              <DrawerItem
                icon="settings"
                label="Settings"
                isActive={isItemActive("/(app)/tabs/profile")}
                onPress={() => navigateTo("/(app)/tabs/profile")}
              />
            </>
          ) : (
            <>
              <DrawerItem
                icon="briefcase"
                label="My Projects"
                isActive={isItemActive("/(app)/tabs/projects")}
                onPress={() => navigateTo("/(app)/tabs/projects")}
              />
              <DrawerItem
                icon="cash"
                label="My Salary"
                isActive={isItemActive("/(app)/salary")}
                onPress={() => navigateTo("/(app)/salary")}
              />
              <DrawerItem
                icon="calendar"
                label="Selfie Attendance"
                isActive={isItemActive("/(app)/attendance")}
                onPress={() => navigateTo("/(app)/attendance")}
              />
              <DrawerItem
                icon="bicycle"
                label="Bike Tracking"
                isActive={isItemActive("/(app)/tabs/bike")}
                onPress={() => navigateTo("/(app)/tabs/bike")}
              />
              <DrawerItem
                icon="settings"
                label="Settings"
                isActive={isItemActive("/(app)/tabs/profile")}
                onPress={() => navigateTo("/(app)/tabs/profile")}
              />
            </>
          )}

          <DrawerItem
            icon="log-out"
            label="Logout"
            isActive={false}
            onPress={handleLogout}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function DrawerItem({ icon, emoji, label, isActive, onPress }: any) {
  const getIconName = (name: string) => {
    if (!name) return null;
    if (name === "bar-chart") return "stats-chart-outline";
    if (name.endsWith("-outline")) return name;
    return `${name}-outline`;
  };

  const iconName = getIconName(icon);

  return (
    <TouchableOpacity
      style={[styles.drawerItem, isActive && styles.drawerItemActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {emoji ? (
        <Text style={{ fontSize: 18, marginRight: 14 }}>{emoji}</Text>
      ) : iconName ? (
        <Ionicons
          name={iconName as any}
          size={20}
          color={isActive ? THEME.colors.primary : "#333333"}
          style={styles.drawerIcon}
        />
      ) : null}
      <Text style={[styles.drawerLabel, isActive && styles.drawerLabelActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function AppLayout() {
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(Math.round(width * 0.78), 340);

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          width: drawerWidth,
          backgroundColor: "#fff",
        },
      }}
    >
      {/* We set the main tabs layout as the primary screen in the drawer */}
      <Drawer.Screen name="tabs" options={{ title: "Home" }} />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerRoot: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  headerSection: {
    backgroundColor: THEME.colors.primary,
    paddingTop: Platform.OS === "ios" ? 56 : 48,
    paddingBottom: 22,
    paddingHorizontal: 20,
    borderBottomRightRadius: 36,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarText: {
    color: THEME.colors.primary,
    fontSize: 20,
    fontWeight: "bold",
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  userRole: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
    letterSpacing: 0.5,
  },
  whiteNavArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  navContainerStyle: {
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  navLinks: {
    gap: 10,
  },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "transparent",
  },
  drawerItemActive: {
    backgroundColor: "#FCE8EB",
    borderLeftWidth: 4,
    borderLeftColor: THEME.colors.primary,
  },
  drawerIcon: {
    marginRight: 14,
  },
  drawerLabel: {
    fontSize: 15,
    color: "#333333",
    fontWeight: "500",
  },
  drawerLabelActive: {
    color: THEME.colors.primary,
    fontWeight: "700",
  },
});
