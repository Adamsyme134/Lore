// src/features/quests/components/widgets/LocationWidget.tsx
import React, { useState } from "react";
import { Pressable, ActivityIndicator, View } from "react-native";
import { AppText } from "../../../../shared/components/AppText";
import { LocationWidgetConfig } from "../../../../shared/types/domain";
import { useQuestExecution } from "../../context/QuestExecutionContext";

type Props = {
  config: LocationWidgetConfig;
};

export function LocationWidget({ config }: Props) {
  const { setVariable } = useQuestExecution();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFound, setIsFound] = useState(false);
  const [count, setCount] = useState(0);

  const fetchLocations = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      // MOCK: Replace with Expo Location in production
      const lat = 51.5074, lon = -0.1278; 

      const query = config.query || "cafe";
      const radius = config.radius || 2000;

      const overpassQuery = `
        [out:json];
        node["amenity"="${query.toLowerCase()}"](around:${radius},${lat},${lon});
        out 10;
      `;
      
      const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`);
      const data = await response.json();
      
      const fetchedOptions = data.elements.map((e: any) => e.tags.name).filter(Boolean);
      const finalOptions = fetchedOptions.length > 0 ? fetchedOptions : ["No places found"];

      // ✨ EXPOSE ARRAY TO CONTEXT (For the Randomiser!)
      if (config.output?.isExposed && config.output.variableName) {
        setVariable(config.output.variableName, finalOptions);
      }
      
      setCount(finalOptions.length);
      setIsFound(true);
    } catch (e) {
      console.error("Failed to fetch locations", e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={{ transform: [{ translateY: 3 }], marginHorizontal: 3 }}>
      <Pressable 
        onPress={fetchLocations} 
        className={`h-[36px] flex-row items-center justify-center px-4 rounded-lg shadow-sm ${isFound ? 'bg-blue border-transparent' : 'bg-white border border-line'}`}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#0000ff" />
        ) : (
          <AppText className={`${isFound ? 'text-white' : 'text-ink'} font-sansSemi text-[14px]`}>
            📍 {isFound ? `Found ${count} places` : `Find ${config.query}`}
          </AppText>
        )}
      </Pressable>
    </View>
  );
}