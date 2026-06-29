// src/features/quests/components/widgets/LocationWidget.tsx
import React, { useState } from "react";
import { Pressable, ActivityIndicator, View, Alert } from "react-native";
import * as Location from 'expo-location';
import { AppText } from "../../../../shared/components/AppText";
import { LocationWidgetConfig } from "../../../../shared/types/domain";
import { useQuestExecution } from "../../context/QuestExecutionContext";

type Props = {
  config: LocationWidgetConfig;
  accent?: any; 
};

const parseQueryConfig = (str: string) => {
  const obj: Record<string, string> = {};
  str.split('&').forEach(pair => {
    const [k, v] = pair.split('=');
    if (k) obj[k] = decodeURIComponent(v || '');
  });
  return obj;
};

export function LocationWidget({ config, accent }: Props) {
  const { setVariable, getVariable } = useQuestExecution();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFound, setIsFound] = useState(false);
  const [count, setCount] = useState(0);

  const normalizedConfig = React.useMemo(() => {
    let rawString = "";
    const possibleFields = [config, (config as any)?.query, (config as any)?.config];

    for (const field of possibleFields) {
      if (typeof field === 'string' && field.includes('=')) {
        rawString = field;
        break;
      }
    }

    if (rawString) {
      const parsed = parseQueryConfig(rawString);
      return {
        query: parsed.q || 'cafe',
        queryType: (parsed.qType as "static" | "variable") || 'static',
        centerType: (parsed.center as "current" | "fixed") || 'current',
        radius: parsed.rad || 2000,
        lat: parsed.lat,
        lng: parsed.lng,
        output: {
          isExposed: parsed.isExposed === 'true',
          variableName: parsed.variableName || ''
        }
      } as LocationWidgetConfig;
    }
    return config;
  }, [config]);

  const fetchLocations = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      let lat = Number(normalizedConfig.lat);
      let lon = Number(normalizedConfig.lng);
      const radius = Number(normalizedConfig.radius) || 1000;

      // 📍 1. Resolve Location
      if (normalizedConfig.centerType === 'current') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Lore needs location access.');
          setIsLoading(false);
          return;
        }
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced 
        });
        lat = location.coords.latitude;
        lon = location.coords.longitude;
      } else {
        if (!lat || !lon) {
          lat = 51.5074; 
          lon = -0.1278;
        }
      }

      // 📝 2. Resolve the Search String
      let actualQuery = normalizedConfig.query || "cafe";
      if (normalizedConfig.queryType === 'variable' && actualQuery) {
        const varData = getVariable(actualQuery);
        actualQuery = Array.isArray(varData) ? (varData[0] || actualQuery) : (varData || actualQuery);
      }
      
      actualQuery = actualQuery.trim();

      // ✨ SMART REGEX: If user types "burgers", this makes it search for "burgers?" 
      // which safely matches BOTH "burger" and "burgers"!
      const safeQuery = actualQuery.replace(/"/g, '\\"');
      const fuzzyQuery = safeQuery.replace(/s$/i, 's?');

      // 🔍 3. Lightning Fast Overpass API Call 
      // Added 'cuisine' to the keys, and removed the API limit which causes syntax crashes.
      const overpassQuery = `
        [out:json][timeout:10];
        (
          node[~"^(name|amenity|shop|leisure|tourism|cuisine)$"~"${fuzzyQuery}",i](around:${radius},${lat},${lon});
          way[~"^(name|amenity|shop|leisure|tourism|cuisine)$"~"${fuzzyQuery}",i](around:${radius},${lat},${lon});
        );
        out center;
      `;
      
      const requestUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;
      
      // 🐛 DEBUG LOGGING: Click this URL in your terminal to see exactly what Overpass sees!
      console.log("📍 OVERPASS URL:", requestUrl);
      console.log("📍 OVERPASS QUERY:\\n", overpassQuery);

      const response = await fetch(requestUrl);
      
      if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
      const data = await response.json();

      // Catch silent API syntax errors
      if (data.remark) {
        console.error("⚠️ OVERPASS SYNTAX ERROR:", data.remark);
      }
      
      // 🧹 4. Clean & Deduplicate Results
      const fetchedOptions = (data.elements || [])
        .map((e: any) => {
          const tags = e.tags || {};
          const fallbackName = tags.amenity || tags.shop || tags.tourism || tags.cuisine || actualQuery;
          return tags.name || (fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1));
        })
        .filter(Boolean);
        
      // Limit to 15 in Javascript safely instead of risking API syntax errors
      const uniqueOptions = Array.from(new Set(fetchedOptions)).slice(0, 15) as string[];
      const finalOptions = uniqueOptions.length > 0 ? uniqueOptions : ["No places found nearby"];

      // 🔄 5. Expose Array to Context
      if (normalizedConfig.output?.isExposed && normalizedConfig.output.variableName) {
        setVariable(normalizedConfig.output.variableName, finalOptions);
      }
      
      setCount(uniqueOptions.length);
      setIsFound(true);

    } catch (e) {
      console.error("Failed to fetch locations:", e);
      Alert.alert("Search Error", "Check your console for details.");
    } finally {
      setIsLoading(false);
    }
  };
  let label = normalizedConfig.query || 'Locations';
  if (normalizedConfig.queryType === 'variable') {
    label = `${normalizedConfig.query}`;
  }

  return (
    <View style={{ transform: [{ translateY: 3 }], marginHorizontal: 3 }}>
      <Pressable 
        onPress={fetchLocations} 
        className={`rounded-lg justify-center items-center px-4 shadow-sm ${isFound ? 'bg-stone border border-line' : (accent?.bg || 'bg-blue')}`}
        style={{ height: 36 }}
      >
        {/* Invisible text locks the width based on the label */}
        <AppText className="font-sansSemi text-[14px] opacity-0 h-0">📍 Find {label}</AppText>
        
        <View className="absolute inset-0 justify-center items-center">
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <AppText className={`font-sansSemi text-[14px] ${isFound ? 'text-ink' : 'text-white'}`}>
              {isFound ? `📍 Found ${count}` : `📍 Find ${label}`}
            </AppText>
          )}
        </View>
      </Pressable>
    </View>
  );
}