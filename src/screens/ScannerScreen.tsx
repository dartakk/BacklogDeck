import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function ScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Caricamento permessi...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Nessun accesso alla fotocamera.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Concedi permessi</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = ({ data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);
    router.replace(`/search?barcode=${encodeURIComponent(data)}`);
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128"],
        }}
      >
        <View style={styles.overlay}>
          <Text style={styles.scanTitle}>📷 Scanner Giochi Fisici</Text>
          <View style={styles.viewfinder} />
          {scanned && (
            <TouchableOpacity
              style={styles.button}
              onPress={() => setScanned(false)}
            >
              <Text style={styles.buttonText}>Scansiona di nuovo</Text>
            </TouchableOpacity>
          )}
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121214" },
  camera: { flex: 1, width: "100%" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121214",
    padding: 20,
  },
  text: { color: "#fff", fontSize: 16, textAlign: "center", marginBottom: 16 },
  overlay: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    padding: 40,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  scanTitle: { color: "#fff", fontSize: 22, fontWeight: "bold", marginTop: 20 },
  viewfinder: {
    width: 260,
    height: 160,
    borderWidth: 2,
    borderColor: "#6366f1",
    borderRadius: 16,
  },
  button: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
