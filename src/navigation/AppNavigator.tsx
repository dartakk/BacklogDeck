import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

// Import delle tue schermate
import HomeScreen from "../screens/HomeScreen";
import ScannerScreen from "../screens/ScannerScreen";
import RouletteScreen from "../screens/RouletteScreen";
import CommunityScreen from "../screens/CommunityScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#121214",
            borderTopColor: "#27272a",
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarActiveTintColor: "#6366f1",
          tabBarInactiveTintColor: "#71717a",
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap = "home";

            if (route.name === "Home") {
              iconName = focused ? "game-controller" : "game-controller-outline";
            } else if (route.name === "Scanner") {
              iconName = focused ? "scan" : "scan-outline";
            } else if (route.name === "Roulette") {
              iconName = focused ? "shuffle" : "shuffle-outline";
            } else if (route.name === "Community") {
              iconName = focused ? "people" : "people-outline";
            } else if (route.name === "Profilo") {
              iconName = focused ? "person" : "person-outline";
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Scanner" component={ScannerScreen} />
        <Tab.Screen name="Roulette" component={RouletteScreen} />
        <Tab.Screen name="Community" component={CommunityScreen} />
        <Tab.Screen name="Profilo" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}