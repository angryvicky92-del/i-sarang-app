import 'react-native-url-polyfill/auto';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Map, List as ListIcon, MessageCircle, User } from 'lucide-react-native';

import { SearchProvider } from './src/contexts/SearchContext';
import { AuthProvider } from './src/contexts/AuthContext';
import HomeScreen from './src/screens/HomeScreen';
import HomeMapScreen from './src/screens/HomeMapScreen';
import CenterListScreen from './src/screens/CenterListScreen';
import CenterDetailScreen from './src/screens/CenterDetailScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import MyPageScreen from './src/screens/MyPageScreen';
import LoginScreen from './src/screens/LoginScreen';
import WritePostScreen from './src/screens/WritePostScreen';
import AdminApprovalScreen from './src/screens/AdminApprovalScreen';
import PostDetailScreen from './src/screens/PostDetailScreen';
import JobDetailScreen from './src/screens/JobDetailScreen';
import TeacherCertificationScreen from './src/screens/TeacherCertificationScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: '#75BA57', headerShown: false }}>
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen} 
        options={{ tabBarLabel: '홈', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} 
      />
      <Tab.Screen 
        name="MapTab" 
        component={HomeMapScreen} 
        options={{ tabBarLabel: '지도', tabBarIcon: ({ color, size }) => <Map color={color} size={size} /> }} 
      />
      <Tab.Screen 
        name="ListTab" 
        component={CenterListScreen} 
        options={{ tabBarLabel: '목록', tabBarIcon: ({ color, size }) => <ListIcon color={color} size={size} /> }} 
      />
      <Tab.Screen 
        name="CommunityTab" 
        component={CommunityScreen} 
        options={{ tabBarLabel: '커뮤니티', tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} /> }} 
      />
      <Tab.Screen 
        name="MyPageTab" 
        component={MyPageScreen} 
        options={{ tabBarLabel: '마이페이지', tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }} 
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SearchProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false, headerBackTitleVisible: false }}>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen 
              name="Detail" 
              component={CenterDetailScreen} 
              options={{ headerShown: false, title: '어린이집 상세' }} 
            />
            <Stack.Screen 
              name="Login" 
              component={LoginScreen} 
            />
            <Stack.Screen 
              name="WritePost" 
              component={WritePostScreen} 
              options={{ presentation: 'fullScreenModal', headerShown: false }}
            />
            <Stack.Screen 
              name="AdminApproval" 
              component={AdminApprovalScreen} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="PostDetail" 
              component={PostDetailScreen} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="JobDetail" 
              component={JobDetailScreen} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="TeacherCertification" 
              component={TeacherCertificationScreen} 
              options={{ headerShown: false }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SearchProvider>
    </AuthProvider>
  );
}
