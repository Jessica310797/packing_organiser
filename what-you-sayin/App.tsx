import { StatusBar } from "expo-status-bar";
import { useKeepAwake } from "expo-keep-awake";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import gameHtml from "./src/gameHtml";

const PAPER = "#FFFCF3";

export default function App() {
  // Keep the screen on while people are mid-turn and the phone is being passed around.
  useKeepAwake();

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={["top", "bottom", "left", "right"]}>
        <StatusBar style="dark" />
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
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAPER },
  web: { flex: 1, backgroundColor: PAPER },
});
