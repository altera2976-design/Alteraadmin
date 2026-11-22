import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { ConfigProvider } from "../context/ConfigContext";

// Prevent the splash screen from auto-hiding before auth loads
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    if (isLoading || !fontsLoaded) return;

    // Hide splash once auth state is known
    SplashScreen.hideAsync();

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      // Not logged in — redirect to login
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      // Already logged in — redirect to dashboard
      router.replace("/(app)/tabs/dashboard");
    }
  }, [isAuthenticated, isLoading, fontsLoaded, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
      <Stack.Screen name="index" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ConfigProvider>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </ConfigProvider>
    </GestureHandlerRootView>
  );
}
