export default {
  expo: {
    name: "JobLens",
    slug: "joblens",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/logo-icon.png",
    scheme: "joblens",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/logo-icon.png",
      resizeMode: "contain",
      backgroundColor: "#3b82f6"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.joblens.app"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/logo-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.joblens.app"
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/logo-icon.png"
    },
    plugins: [
      "expo-router"
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {
        origin: false
      },
      eas: {
        projectId: "923be5ff-b43a-4dbe-83db-35ba061e0f5b"
      }
    }
  }
};
