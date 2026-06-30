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
  const { variables, setVariable, getVariable } = useQuestExecution();
  
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
  const isWaiting = React.useMemo(() => {
    const rawQuery = normalizedConfig.query || "";
    const isVar = normalizedConfig.queryType === 'variable' || rawQuery.startsWith('$');
    
    if (isVar && rawQuery) {
      const varName = rawQuery.replace(/^\$/, '');
      // Look directly in the variables object for reactive updates
      const data = variables[varName] || variables[rawQuery];
      // If it doesn't exist or is an empty array, we are waiting
      return data === undefined || data === null || (Array.isArray(data) && data.length === 0);
    }
    return false; // Static queries are never waiting
  }, [normalizedConfig, variables]);
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
      
      // Auto-detect if it's a variable by checking for the '$' prefix
      const isVariable = normalizedConfig.queryType === 'variable' || actualQuery.startsWith('$');
      if (isVariable && actualQuery) {
        const varName = actualQuery.replace(/^\$/, ''); // Strip the $ for lookup
        const varData = getVariable(varName) || getVariable(actualQuery); // Try both safely
        actualQuery = Array.isArray(varData) ? (varData[0] || actualQuery) : (varData || actualQuery);
      }
      
      actualQuery = actualQuery.trim();
      // ✨ SMART REGEX: If user types "burgers", this makes it search for "burgers?" 
      // which safely matches BOTH "burger" and "burgers"!
      const safeQuery = actualQuery.replace(/"/g, '\\"');
      const fuzzyQuery = safeQuery.replace(/s$/i, 's?');

      // 🔍 3. Lightning Fast Overpass API Call 
      // Added 'cuisine' to the keys, and removed the API limit which causes syntax crashes.
      // Escape user input for regex safety
const escapeRegex = (str: string) =>
  str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Map common searches onto indexed OSM tags
const CATEGORY_MAP: Record<string, { key: string; value: string }> = {
  cafe: { key: "amenity", value: "cafe" },
  cafés: { key: "amenity", value: "cafe" },
  café: { key: "amenity", value: "cafe" },
  coffee: { key: "amenity", value: "cafe" },

  restaurant: { key: "amenity", value: "restaurant" },
  restaurants: { key: "amenity", value: "restaurant" },

  pub: { key: "amenity", value: "pub" },
  pubs: { key: "amenity", value: "pub" },

  bar: { key: "amenity", value: "bar" },
  bars: { key: "amenity", value: "bar" },

  museum: { key: "tourism", value: "museum" },
  museums: { key: "tourism", value: "museum" },

  hotel: { key: "tourism", value: "hotel" },
  hotels: { key: "tourism", value: "hotel" },

  pharmacy: { key: "amenity", value: "pharmacy" },
  pharmacies: { key: "amenity", value: "pharmacy" },

  supermarket: { key: "shop", value: "supermarket" },
  supermarkets: { key: "shop", value: "supermarket" },

  grocery: { key: "shop", value: "supermarket" },

  fuel: { key: "amenity", value: "fuel" },
  petrol: { key: "amenity", value: "fuel" },
  "petrol station": { key: "amenity", value: "fuel" },
  "gas station": { key: "amenity", value: "fuel" },
  "service station": { key: "amenity", value: "fuel" },
"train station": { key: "railway", value: "station" },
"train stations": { key: "railway", value: "station" },
station: { key: "railway", value: "station" },
railway: { key: "railway", value: "station" },
  bank: { key: "amenity", value: "bank" },
  banks: { key: "amenity", value: "bank" },

  atm: { key: "amenity", value: "atm" },

  park: { key: "leisure", value: "park" },
  parks: { key: "leisure", value: "park" },

  playground: { key: "leisure", value: "playground" },

  library: { key: "amenity", value: "library" },

  cinema: { key: "amenity", value: "cinema" },

  gym: { key: "leisure", value: "fitness_centre" },

  bakery: { key: "shop", value: "bakery" },

  bookstore: { key: "shop", value: "books" },
  bookshop: { key: "shop", value: "books" },
};

const normalizedQuery = actualQuery.trim().toLowerCase();

const category = CATEGORY_MAP[normalizedQuery];

let overpassQuery: string;

if (category) {
  // Fast indexed lookup
  overpassQuery = `
[out:json][timeout:3];
(
  node["${category.key}"="${category.value}"](around:${radius},${lat},${lon});
  way["${category.key}"="${category.value}"](around:${radius},${lat},${lon});
);
out center;
`;
} else {
  // Fallback: search only by name
  const escaped = escapeRegex(actualQuery);

  overpassQuery = `
[out:json][timeout:3];
(
  node["name"~"${escaped}",i](around:${radius},${lat},${lon});
  way["name"~"${escaped}",i](around:${radius},${lat},${lon});
);
out center;
`;
}
      
      console.log("📍 OVERPASS QUERY:\n", overpassQuery);

const response = await fetch(
  "https://overpass-api.de/api/interpreter",
  {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
    },
    body: overpassQuery,
  }
);
      
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
        const cleanVarName = normalizedConfig.output.variableName.replace(/^\$/, '');
        setVariable(cleanVarName, finalOptions);
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
        disabled={isWaiting || isLoading} // ✨ 3. Disable the click
        className={`rounded-lg justify-center items-center px-4 shadow-sm ${
          isWaiting ? 'bg-stone opacity-50' : // ✨ 4. Greyed out state
          isFound ? 'bg-stone border border-line' : 
          (accent?.bg || 'bg-blue')
        }`}
        style={{ height: 36 }}
      >
        {/* Invisible text locks the width based on the label */}
        <AppText className="font-sansSemi text-[14px] opacity-0 h-0">📍 Find {label}</AppText>
        
        <View className="absolute inset-0 justify-center items-center">
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <AppText className={`font-sansSemi text-[14px] ${isFound || isWaiting ? 'text-ink/60' : 'text-white'}`}>
              {isWaiting ? `🔒 Locked` : isFound ? `📍 Found ${count}` : `📍 Find ${label}`}
            </AppText>
          )}
        </View>
      </Pressable>
    </View>
  );
}
