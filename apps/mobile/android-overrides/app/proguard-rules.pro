# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Preserve line number information for debugging stack traces in Play Console
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Capacitor Core and Bridge Architecture
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keep class * extends com.getcapacitor.Bridge { *; }
-keep class * extends com.getcapacitor.BridgeActivity { *; }
-keep class com.getcapacitor.plugin.** { *; }

# Keep JavascriptInterface methods accessible from WebView
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Official and Community Capacitor Plugins (Camera, Geolocation, Haptics, Push, etc.)
-keep class com.capacitorjs.plugins.** { *; }
-keep class com.getcapacitor.community.** { *; }

# Cordova Plugin Compatibility
-keep class org.apache.cordova.** { *; }

# Firebase Cloud Messaging & Google Play Services
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

