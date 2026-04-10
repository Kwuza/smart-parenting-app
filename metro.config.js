const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add polyfill for crypto.randomUUID (Hermes doesn't support it)
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'crypto') {
    return {
      type: 'sourceFile',
      filePath: require.resolve('./polyfills.js'),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
