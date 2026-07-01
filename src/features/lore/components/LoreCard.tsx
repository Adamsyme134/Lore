import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin } from 'lucide-react-native';

interface LoreCardProps {
  heroImageUri: string;
  title: string;
  caption: string;
  locationName: string;
  coordinates?: string;
}

export const LoreCard = ({ heroImageUri, title, caption, locationName, coordinates }: LoreCardProps) => {
  return (
    <View className="w-full aspect-[3/4] bg-[#0a0a0a] overflow-hidden relative" collapsable={false}>
      {/* Hero Image */}
      <Image 
        source={{ uri: heroImageUri }} 
        className="absolute w-full h-full" 
        resizeMode="cover" 
      />

      {/* Cinematic Gradients for Text Readability */}
      <LinearGradient 
        colors={['rgba(0,0,0,0.5)', 'transparent']} 
        className="absolute top-0 w-full h-1/3" 
      />
      <LinearGradient 
        colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']} 
        className="absolute bottom-0 w-full h-1/2" 
      />

      {/* Top Left Logo */}
      <Text className="absolute top-12 left-8 text-white font-serif text-lg tracking-[0.3em]">
        LORE
      </Text>

      {/* Title Block */}
      <View className="absolute top-[25%] left-8 right-8">
        <Text className="text-white font-serif text-5xl uppercase leading-[1.1] tracking-wide shadow-sm">
          {title}
        </Text>
        <Text className="text-white/80 font-sans text-xs tracking-[0.3em] mt-4 uppercase">
          Quest Complete
        </Text>
      </View>

      {/* Caption & Quote Mark */}
      <View className="absolute bottom-24 right-8 w-2/3 flex flex-col items-end">
        <Text className="text-white font-serif text-7xl leading-[0.5] h-12 overflow-visible">
          ”
        </Text>
        <Text className="text-white font-serif italic text-lg text-right mt-2 leading-relaxed shadow-sm">
          {caption}
        </Text>
      </View>

      {/* Location Block */}
      <View className="absolute bottom-8 left-0 right-0 flex flex-row justify-center items-center space-x-3">
        <MapPin color="white" size={18} strokeWidth={1.5} />
        <View className="flex flex-col">
          <Text className="text-white font-sans text-xs tracking-[0.2em] uppercase">
            {locationName}
          </Text>
          {coordinates && (
            <Text className="text-white/70 font-sans text-[10px] tracking-[0.2em] mt-1">
              {coordinates}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};