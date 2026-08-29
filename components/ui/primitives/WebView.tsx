import { View } from 'react-native';
import { withUniwind } from 'uniwind';

// Lightweight placeholder used when the optional native WebView module is not installed.
// Keeping this primitive dependency-free allows the Expo Go development workflow to run.
export const WebView = withUniwind(View);
