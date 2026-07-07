const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Some packages (e.g. zustand) ship an ESM build containing raw
// `import.meta` references that break when Metro's web bundler resolves the
// `import` export condition into a non-module <script>. Prefer the
// CommonJS/react-native build on every platform, which these packages build
// without import.meta.
config.resolver.unstable_conditionNames = ["require", "react-native"];

module.exports = config;
