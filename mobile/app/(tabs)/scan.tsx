import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Button, Alert } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import apiClient from '../../api/client';

export default function ScanScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    getCameraPermissions();
  }, []);

  const handleBarCodeScanned = async ({ type, data }: { type: string, data: string }) => {
    setScanned(true);
    setLoading(true);
    setProduct(null);
    try {
      // We expect data to be the barcode (SKU)
      const res = await apiClient.get(`/api/products/barcode/${data}`);
      if (res.data && res.data.data) {
        setProduct(res.data.data);
      } else {
        Alert.alert("Not Found", "Product not found in system.");
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
         Alert.alert("Not Found", "Product not found in system.");
      } else {
         Alert.alert("Error", "Failed to fetch product details.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text>Requesting for camera permission</Text></View>;
  }
  if (hasPermission === false) {
    return <View style={styles.container}><Text>No access to camera</Text></View>;
  }

  return (
    <View style={styles.container}>
      <CameraView
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "ean13", "code128"],
        }}
        style={StyleSheet.absoluteFill}
      />

      {scanned && (
        <View style={styles.resultContainer}>
          {loading ? (
             <Text style={styles.resultText}>Looking up product...</Text>
          ) : product ? (
            <View>
              <Text style={styles.titleText}>{product.name}</Text>
              <Text style={styles.resultText}>SKU: {product.sku}</Text>
              <Text style={styles.resultText}>Category: {product.categoryName}</Text>
            </View>
          ) : (
            <Text style={styles.resultText}>No result</Text>
          )}
          <View style={{ marginTop: 20 }}>
            <Button title={'Tap to Scan Again'} onPress={() => setScanned(false)} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  resultContainer: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  titleText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  resultText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  }
});
