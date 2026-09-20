# Add project specific ProGuard rules here.
# For more details, see http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated & turbo modules
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# React Native Core
-keep class com.facebook.react.** { *; }
-keepclassmembers class * extends com.facebook.react.bridge.JavaScriptModule { *; }
-keepclassmembers class * extends com.facebook.react.bridge.NativeModule { *; }
-keepclassmembers class * extends com.facebook.react.uimanager.ViewManager { *; }
-keepclassmembers class * extends com.facebook.react.bridge.ReactContextBaseJavaModule { *; }

# Expo native modules & native features
-keep class expo.modules.** { *; }
-keep class expo.modules.location.** { *; }
-keep class expo.modules.camera.** { *; }
-keep class expo.modules.securestore.** { *; }
-keep class expo.modules.filesystem.** { *; }
-keep class expo.modules.imagepicker.** { *; }
-keep class expo.modules.sharing.** { *; }
-keep class expo.modules.print.** { *; }
-keep class com.horcrux.svg.** { *; }
-keep class io.socket.** { *; }

# Google Sign In
-keep class com.google.android.gms.auth.api.signin.** { *; }
-keep class com.google.android.gms.** { *; }

# Networking (OkHttp/Axios)
-dontwarn okio.**
-dontwarn javax.annotation.**
-keep class okhttp3.** { *; }
-keepinterface okhttp3.** { *; }
-dontwarn okhttp3.**

# Strip unnecessary debug logs in release builds
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}
