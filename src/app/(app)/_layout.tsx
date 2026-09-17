import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { THEME } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";

function CustomDrawerContent(props: any) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const isAdmin =
    user?.role === "ADMIN" ||
    user?.role === "SUPER_ADMIN" ||
    user?.role?.toUpperCase() === "ADMIN" ||
    user?.role?.toUpperCase() === "SUPER_ADMIN" ||
    user?.email?.toLowerCase() === "admin@company.com" ||
    user?.email?.toLowerCase()?.includes("admin");
  const displayRole =
    isAdmin || user?.email?.toLowerCase() === "admin@company.com"
      ? "ADMIN"
      : user?.designation || user?.role || "Employee";

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  return (
    <View style={styles.drawerRoot}>
      <View style={styles.drawerTopCurve} />

      <ScrollView
        contentContainerStyle={{ paddingTop: 60, paddingHorizontal: 20 }}
      >
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => router.push("/(app)/tabs/profile")}
          activeOpacity={0.8}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0) || "A"}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.name || "Super Admin"}
            </Text>
            <Text style={styles.userRole} numberOfLines={1}>
              {displayRole}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>

        <View style={styles.navLinks}>
          <DrawerItem
            emoji="📊"
            label="Dashboard"
            onPress={() => router.push("/(app)/tabs/dashboard")}
          />
          {isAdmin ? (
            <>
              <DrawerItem
                emoji="👥"
                label="CRM"
                onPress={() => router.push("/(app)/tabs/crm")}
              />
              <DrawerItem
                emoji="📁"
                label="Projects"
                onPress={() => router.push("/(app)/tabs/projects")}
              />
              <DrawerItem
                emoji="💵"
                label="Salary"
                onPress={() => router.push("/(app)/salary")}
              />
              <DrawerItem
                emoji="📅"
                label="Attendance"
                onPress={() => router.push("/(app)/attendance")}
              />
              <DrawerItem
                emoji="📑"
                label="Quotation"
                onPress={() => router.push("/(app)/quotation")}
              />
              <DrawerItem
                emoji="📈"
                label="Reports"
                onPress={() => router.push("/(app)/tabs/reports")}
              />
              <DrawerItem
                emoji="⚙️"
                label="Settings"
                onPress={() => router.push("/(app)/tabs/profile")}
              />
            </>
          ) : (
            <>
              <DrawerItem
                emoji="📁"
                label="My Projects"
                onPress={() => router.push("/(app)/tabs/projects")}
              />
              <DrawerItem
                emoji="💵"
                label="My Salary"
                onPress={() => router.push("/(app)/salary")}
              />
              <DrawerItem
                emoji="📅"
                label="Selfie Attendance"
                onPress={() => router.push("/(app)/attendance")}
              />
              <DrawerItem
                emoji="⚙️"
                label="Settings"
                onPress={() => router.push("/(app)/tabs/profile")}
              />
            </>
          )}
          <DrawerItem emoji="🚪" label="Logout" onPress={handleLogout} />
        </View>
      </ScrollView>
    </View>
  );
}

function DrawerItem({ icon, emoji, label, isActive, onPress }: any) {
  return (
    <TouchableOpacity
      style={[styles.drawerItem, isActive && styles.drawerItemActive]}
      onPress={onPress}
    >
      {emoji ? (
        <Text style={{ fontSize: 18, marginRight: 14 }}>{emoji}</Text>
      ) : (
        <Ionicons
          name={(icon + "-outline") as any}
          size={20}
          color={isActive ? THEME.colors.primary : "#333"}
          style={styles.drawerIcon}
        />
      )}
      <Text style={[styles.drawerLabel, isActive && styles.drawerLabelActive]}>
        {label}
      </Text>
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
          width: "75%",
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
    backgroundColor: "#fff",
  },
  drawerTopCurve: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: THEME.colors.primary,
    borderBottomRightRadius: 80,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 40,
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarText: {
    color: THEME.colors.primary,
    fontSize: 20,
    fontWeight: "bold",
  },
  userName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  userRole: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
  },
  navLinks: {
    gap: 8,
  },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  drawerItemActive: {
    backgroundColor: "rgba(200,16,46,0.05)",
  },
  drawerIcon: {
    marginRight: 16,
  },
  drawerLabel: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  drawerLabelActive: {
    color: THEME.colors.primary,
    fontWeight: "600",
  },
});
