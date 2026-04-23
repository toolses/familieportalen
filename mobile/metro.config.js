const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// react-native-calendars ships TypeScript source – Metro needs to transform it
// and resolve it directly since package.json "main" already includes ".ts"
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-calendars') {
    return {
      filePath: require.resolve('react-native-calendars/src/index.ts'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Ensure react-native-calendars TypeScript source is transpiled (not excluded)
config.transformer = {
  ...config.transformer,
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/(?!.*\\bnode_modules\\b)|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-calendars)',
  ],
};

module.exports = withNativeWind(config, { input: './global.css' });
