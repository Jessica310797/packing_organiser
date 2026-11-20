import { StatusBar } from "expo-status-bar";
import { useKeepAwake } from "expo-keep-awake";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Share, StyleSheet } from "react-native";
import type { WebViewMessageEvent } from "react-native-webview";
import { WebView } from "react-native-webview";
import gameHtml from "./src/gameHtml";

const BG = "#3C3489";

// The game asks the app to open the share sheet with its result text
function onGameMessage(e: WebViewMessageEvent) {
  try {
    const msg = JSON.parse(e.nativeEvent.data);
    if (msg?.type === "share" && typeof msg.message === "string") Share.share({ message: msg.message });
  } catch {}
}

export default function App() {
  // Keep the screen on while people are mid-turn and the phone is being passed around.
  useKeepAwake();

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={["top", "bottom", "left", "right"]}>
        <StatusBar style="light" />
        <WebView
          style={styles.web}
          originWhitelist={["*"]}
          // A fixed origin keeps the browser storage (preferences, saved cards) between launches.
          source={{ html: gameHtml, baseUrl: "https://whatyousayin.app/" }}
          domStorageEnabled
          javaScriptEnabled
          bounces={false}
          overScrollMode="never"
          setSupportMultipleWindows={false}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          hideKeyboardAccessoryView
          keyboardDisplayRequiresUserAction={false}
          textZoom={100}
          onMessage={onGameMessage}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  web: { flex: 1, backgroundColor: BG },
});
