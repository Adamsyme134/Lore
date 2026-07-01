// src/features/quests/components/widgets/MapWidget.tsx
import React, { useState } from 'react';
import { View, Platform, Pressable, Linking } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { AppText } from '../../../../shared/components/AppText';

export function MapWidget({ config }: { config: string }) {
  const [selectedPin, setSelectedPin] = useState<any>(null);

  // Parse config (e.g. title=Pub Crawl&pins=51.5,-0.12,Pub 1|51.6,-0.13,Pub 2)
  const parsed: Record<string, string> = {};
  config.split('&').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      const k = pair.substring(0, idx);
      const v = pair.substring(idx + 1);
      if (k) parsed[k] = decodeURIComponent(v || '');
    }
  });

  // Parse pins: lat,lng,title|lat,lng,title
  const pins = (parsed.pins || '').split('|').map((pinStr, index) => {
    const [lat, lng, ...titleParts] = pinStr.split(',');
    return {
      id: String(index),
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      title: titleParts.join(',') || 'Pin'
    };
  }).filter(p => !isNaN(p.latitude) && !isNaN(p.longitude));

  const defaultRegion = pins.length > 0 ? {
    latitude: pins[0].latitude,
    longitude: pins[0].longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  } : { latitude: 51.752, longitude: -1.2577, latitudeDelta: 0.09, longitudeDelta: 0.09 };

  const openInExternalMaps = (pin: any) => {
    const scheme = Platform.select({
      ios: `maps:0,0?q=${pin.title}@${pin.latitude},${pin.longitude}`,
      android: `geo:0,0?q=${pin.latitude},${pin.longitude}(${pin.title})`,
    });
    const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${pin.latitude},${pin.longitude}`;
    
    if (scheme) {
      Linking.canOpenURL(scheme).then(supported => {
        if (supported) Linking.openURL(scheme);
        else Linking.openURL(fallbackUrl);
      });
    } else {
      Linking.openURL(fallbackUrl);
    }
  };

  return (
    <View className="w-full my-3 rounded-xl overflow-hidden border border-line bg-stone relative" style={{ height: 350 }}>
      <MapView
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={defaultRegion}
        style={{ flex: 1 }}
        scrollEnabled={true}
        zoomEnabled={true}
        pitchEnabled={true}
        showsUserLocation={true}
        onPress={() => setSelectedPin(null)}
      >
        {pins.map(pin => (
          <Marker
            key={pin.id}
            coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
            onPress={() => setSelectedPin(pin)}
          />
        ))}
      </MapView>
      
      {/* Floating Detail Card */}
      {selectedPin && (
        <View className="absolute bottom-4 left-4 right-4 bg-white p-4 rounded-xl shadow-lg border border-line">
          <AppText variant="subtitle" className="text-ink">{selectedPin.title}</AppText>
          <View className="flex-row gap-3 mt-3">
            <Pressable onPress={() => openInExternalMaps(selectedPin)} className="bg-ink px-4 py-2 rounded-full flex-1 items-center">
              <AppText className="text-ivory font-sansSemi text-xs">Open in Maps ↗</AppText>
            </Pressable>
            <Pressable onPress={() => setSelectedPin(null)} className="bg-stone px-4 py-2 rounded-full items-center border border-line">
              <AppText className="text-ink font-sansSemi text-xs">Close</AppText>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}