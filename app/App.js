import 'react-native-url-polyfill/auto';
import React from 'react';
import { TouchableOpacity, View, Image, Text, Platform, NativeModules } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Home, Map, List as ListIcon, MessageCircle, Briefcase, Menu, Bell, Star } from 'lucide-react-native';

import { SearchProvider } from './src/contexts/SearchContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { SettingsProvider } from './src/contexts/SettingsContext';
import { ChatProvider, useChat } from './src/contexts/ChatContext';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { registerForPushNotificationsAsync } from './src/services/notificationService';

const queryClient = new QueryClient();

import HomeScreen from './src/screens/HomeScreen';
import HomeMapScreen from './src/screens/HomeMapScreen';
import CenterListScreen from './src/screens/CenterListScreen';
import CenterDetailScreen from './src/screens/CenterDetailScreen';
import { CommunityScreen } from './src/screens/CommunityScreen';
import MyPageScreen from './src/screens/MyPageScreen';
import LoginScreen from './src/screens/LoginScreen';
import { WritePostScreen } from './src/screens/WritePostScreen';
import AdminApprovalScreen from './src/screens/AdminApprovalScreen';
import { PostDetailScreen } from './src/screens/PostDetailScreen';
import JobDetailScreen from './src/screens/JobDetailScreen';
import TeacherCertificationScreen from './src/screens/TeacherCertificationScreen';
import FavoriteJobsScreen from './src/screens/FavoriteJobsScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import JobOffersScreen from './src/screens/JobOffersScreen';
import RecommendedPlacesScreen from './src/screens/RecommendedPlacesScreen';
import PlaceDetailScreen from './src/screens/PlaceDetailScreen';
import NotificationScreen from './src/screens/NotificationScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import DiseaseDetailScreen from './src/screens/DiseaseDetailScreen';
import ChatListScreen from './src/screens/ChatListScreen';
import ChatRoomScreen from './src/screens/ChatRoomScreen';
import CustomDrawerContent from './src/components/CustomDrawerContent';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

// Keep the splash screen visible while fetching initial data
SplashScreen.preventAutoHideAsync().catch(() => {});

const HeaderChatButton = ({ navigation, colors }) => {
  const { unreadCount } = useChat();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
      <TouchableOpacity 
        onPress={() => navigation.navigate('ChatList')}
        style={{ padding: 8 }}
      >
        <View>
          <MessageCircle size={24} color={colors.text} />
          {unreadCount > 0 && (
            <View style={{
              position: 'absolute',
            right: -6,
            top: -3,
            backgroundColor: '#EF4444',
            borderRadius: 9,
            width: 18,
            height: 18,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1.5,
            borderColor: colors.card
          }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
    </View>
  );
};

function TabNavigator({ navigation }) {
  const { colors } = useTheme();
  const { profile } = useAuth();
  
  const isAdmin = profile?.user_type === '관리자';
  const isTeacher = profile?.user_type === '보육교사' || profile?.user_type === '선생님';

  return (
    <Tab.Navigator 
      screenOptions={({ route }) => {
        const getHeaderTitle = (routeName) => {
          switch (routeName) {
            case 'HomeTab': return '홈';
            case 'MapTab': return '내 주변';
            case 'ListTab': return '얼집목록';
            case 'CommunityTab': return '커뮤니티';
            case 'JobsTab': return '교직원모집';
            case 'RecommendedTab': return '장소추천';
            default: return '';
          }
        };

        return {
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
          headerShown: true,
          headerTitle: route.name === 'HomeTab' ? () => (
            <View style={{ justifyContent: 'center', alignItems: 'center' }}>
              <Image 
                source={require('./assets/custom_icon.png')} 
                style={{ width: 40, height: 40, resizeMode: 'contain' }} 
              />
            </View>
          ) : getHeaderTitle(route.name),
          headerTitleAlign: 'center',
          headerTitleStyle: { fontSize: 20, fontWeight: '800' },
          headerStyle: { backgroundColor: colors.card, shadowColor: 'transparent', elevation: 0 },
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.openDrawer()} style={{ marginLeft: 16 }}>
              <Menu size={28} color={colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <HeaderChatButton navigation={navigation} colors={colors} />
          )
        };
      }}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen} 
        options={{ tabBarLabel: '홈', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} 
      />
      <Tab.Screen 
        name="MapTab" 
        component={HomeMapScreen} 
        options={{ tabBarLabel: '내 주변', tabBarIcon: ({ color, size }) => <Map color={color} size={size} /> }} 
      />
      <Tab.Screen 
        name="ListTab" 
        component={CenterListScreen} 
        options={{ tabBarLabel: '얼집목록', tabBarIcon: ({ color, size }) => <ListIcon color={color} size={size} /> }} 
      />

      {/* Role-based Tab Configuration */}
      {isAdmin ? (
        <>
          <Tab.Screen 
            name="CommunityTab" 
            component={CommunityScreen} 
            options={{ tabBarLabel: '커뮤니티', tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} /> }} 
          />
          <Tab.Screen 
            name="JobsTab" 
            component={JobOffersScreen} 
            options={{ tabBarLabel: '교직원모집', tabBarIcon: ({ color, size }) => <Briefcase color={color} size={size} /> }} 
          />
          <Tab.Screen 
            name="RecommendedTab" 
            component={RecommendedPlacesScreen} 
            options={{ tabBarLabel: '장소추천', tabBarIcon: ({ color, size }) => <Star color={color} size={size} /> }} 
          />
        </>
      ) : isTeacher ? (
        <>
          <Tab.Screen 
            name="CommunityTab" 
            component={CommunityScreen} 
            options={{ tabBarLabel: '커뮤니티', tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} /> }} 
          />
          <Tab.Screen 
            name="JobsTab" 
            component={JobOffersScreen} 
            options={{ tabBarLabel: '교직원모집', tabBarIcon: ({ color, size }) => <Briefcase color={color} size={size} /> }} 
          />
        </>
      ) : (
        <>
          <Tab.Screen 
            name="CommunityTab" 
            component={CommunityScreen} 
            options={{ tabBarLabel: '커뮤니티', tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} /> }} 
          />
          <Tab.Screen 
            name="RecommendedTab" 
            component={RecommendedPlacesScreen} 
            options={{ tabBarLabel: '장소추천', tabBarIcon: ({ color, size }) => <Star color={color} size={size} /> }} 
          />
        </>
      )}
    </Tab.Navigator>
  );
}

function DrawerNavigator() {
  return (
    <Drawer.Navigator 
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{ headerShown: false, drawerStyle: { width: '80%' } }}
    >
      <Drawer.Screen name="MainTabs" component={TabNavigator} />
    </Drawer.Navigator>
  );
}

function ThemedNavigation() {
  const { colors, isDarkMode } = useTheme();
  const { profile } = useAuth();
  const notificationListener = React.useRef();
  const responseListener = React.useRef();
  
  React.useEffect(() => {
    if (profile?.id) {
      registerForPushNotificationsAsync(profile.id);
    }

    // Listener for when a notification is received (foreground)
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification Received:', notification);
    });

    // Listener for when a user interacts with a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const { data } = response.notification.request.content;
      if (data?.url) {
        // Handle navigation if needed
      }
    });

    return () => {
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, [profile?.id]);

  const baseTheme = isDarkMode ? DarkTheme : DefaultTheme;

  const navTheme = {
    ...baseTheme,
    dark: isDarkMode,
    colors: {
      ...baseTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.notification,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, headerBackTitleVisible: false }}>
        <Stack.Screen name="Main" component={DrawerNavigator} />
        <Stack.Screen 
          name="MyPage" 
          component={MyPageScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Notifications" 
          component={NotificationScreen} 
        />
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen} 
        />
        <Stack.Screen 
          name="Detail" 
          component={CenterDetailScreen} 
          options={{ headerShown: false }} 
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
        <Stack.Screen 
          name="FavoriteJobs" 
          component={FavoriteJobsScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="ForgotPassword" 
          component={ForgotPasswordScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="PlaceDetail" 
          component={PlaceDetailScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="DiseaseDetail" 
          component={DiseaseDetailScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="ChatList" 
          component={ChatListScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="ChatRoom" 
          component={ChatRoomScreen} 
          options={{ headerShown: false }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  React.useEffect(() => {
    const hasNativeAdMob = !!NativeModules.RNGoogleMobileAdsModule;
    if (hasNativeAdMob) {
      try {
        const mobileAds = require('react-native-google-mobile-ads').default;
        mobileAds().initialize();
      } catch (e) {}
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <ThemeProvider>
          <SettingsProvider>
            <AuthProvider>
              <ChatProvider>
                <SearchProvider>
                  <ThemedNavigation />
                </SearchProvider>
              </ChatProvider>
            </AuthProvider>
          </SettingsProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
