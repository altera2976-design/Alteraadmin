# ============================================================
# Project-specific ProGuard / R8 rules
# ============================================================

# ------------------------------------------------------------
# React Native Reanimated & Turbo Modules
# ------------------------------------------------------------
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# ------------------------------------------------------------
# React Native Core
# ------------------------------------------------------------
-keep class com.facebook.react.** { *; }
-keepclassmembers class * extends com.facebook.react.bridge.JavaScriptModule { *; }
-keepclassmembers class * extends com.facebook.react.bridge.NativeModule { *; }
-keepclassmembers class * extends com.facebook.react.uimanager.ViewManager { *; }
-keepclassmembers class * extends com.facebook.react.bridge.ReactContextBaseJavaModule { *; }

# ------------------------------------------------------------
# Expo Native Modules
# ------------------------------------------------------------
-keep class expo.modules.** { *; }
-keep class expo.modules.location.** { *; }
-keep class expo.modules.camera.** { *; }
-keep class expo.modules.securestore.** { *; }
-keep class expo.modules.filesystem.** { *; }
-keep class expo.modules.imagepicker.** { *; }
-keep class expo.modules.sharing.** { *; }
-keep class expo.modules.print.** { *; }

# ------------------------------------------------------------
# React Native SVG
# ------------------------------------------------------------
-keep class com.horcrux.svg.** { *; }

# ------------------------------------------------------------
# Socket.IO
# ------------------------------------------------------------
-keep class io.socket.** { *; }

# ------------------------------------------------------------
# Google Sign-In / Google Play Services
# ------------------------------------------------------------
-keep class com.google.android.gms.auth.api.signin.** { *; }
-keep class com.google.android.gms.** { *; }

# ------------------------------------------------------------
# OkHttp / Networking
# ------------------------------------------------------------
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**

# ------------------------------------------------------------
# Remove Android Log calls in Release
# ------------------------------------------------------------
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}