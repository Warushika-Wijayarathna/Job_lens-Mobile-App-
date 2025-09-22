module.exports = function (api) {
  api.cache(true)

  const plugins = [];

  plugins.push([
    "module:react-native-dotenv",
    {
      moduleName: "@env",
      path: ".env",
      safe: false,
      allowUndefined: true,
    },
  ]);
  plugins.push('react-native-reanimated/plugin');

  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins,
  }
}
