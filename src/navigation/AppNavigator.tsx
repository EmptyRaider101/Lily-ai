import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, useDrawerStatus } from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import DashboardScreen from '../screens/DashboardScreen';
import ModelsScreen from '../screens/ModelsScreen';
import ChatScreen from '../screens/ChatScreen';
import MemoriesScreen from '../screens/MemoriesScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CloudInferenceScreen from '../screens/CloudInferenceScreen';
import type { RootStackParamList, DrawerParamList } from './types';
import { ChatService, ChatSession } from '../services/ChatService';
import { useAlert } from '../context/AlertContext';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Drawer = createDrawerNavigator<DrawerParamList>();

function CustomDrawerContent(props: any) {
    const [chats, setChats] = useState<ChatSession[]>([]);
    const isDrawerOpen = useDrawerStatus() === 'open';
    const { showAlert } = useAlert();

    useEffect(() => {
        if (isDrawerOpen) {
            loadChats();
        }
    }, [isDrawerOpen]);

    const loadChats = async () => {
        const loadedChats = await ChatService.getChats();
        setChats(loadedChats);
    };

    const handleDelete = async (chatId: string) => {
        showAlert(
            "Delete Chat",
            "Are you sure you want to delete this chat?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        await ChatService.deleteChat(chatId);
                        loadChats();
                    }
                }
            ]
        );
    };

    return (
        <DrawerContentScrollView {...props}>
            <View style={styles.drawerHeader}>
                <Image source={require('../media/lily_logo.png')} style={styles.lilyLogo} />
                <Text style={styles.drawerTitle}>Lily</Text>
            </View>
            <DrawerItemList {...props} />

            <View style={styles.historySection}>
                <View style={styles.separator} />
                <Text style={styles.historyTitle}>Recent Chats</Text>
                {chats.map(chat => (
                    <View key={chat.id} style={styles.historyItem}>
                        <TouchableOpacity
                            style={styles.historyItemContent}
                            onPress={() => props.navigation.navigate('Chat', { chatId: chat.id })}
                        >
                            <Icon name="message-outline" size={18} color="#666" />
                            <View style={styles.historyTextContainer}>
                                <Text style={styles.historyItemTitle} numberOfLines={1}>
                                    {chat.title || 'New Chat'}
                                </Text>
                                <Text style={styles.historyItemDate}>
                                    {new Date(chat.lastUsed).toLocaleDateString()}
                                </Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => handleDelete(chat.id)}
                        >
                            <Icon name="trash-can-outline" size={18} color="#999" />
                        </TouchableOpacity>
                    </View>
                ))}
            </View>
        </DrawerContentScrollView>
    );
}

function MainDrawer() {
    return (
        <Drawer.Navigator
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={{
                headerShown: false,
                drawerActiveTintColor: '#FF69B4',
                drawerInactiveTintColor: '#333',
                drawerLabelStyle: {
                    fontWeight: '600',
                    fontSize: 16,
                },
                drawerItemStyle: {
                    paddingHorizontal: 10,
                    marginVertical: 4,
                },
                drawerActiveBackgroundColor: '#FF69B415',
            }}
        >
            <Drawer.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{
                    drawerIcon: ({ color, size }) => (
                        <Icon name="view-dashboard" size={size} color={color} />
                    ),
                }}
            />
            <Drawer.Screen
                name="Models"
                component={ModelsScreen}
                options={{
                    drawerIcon: ({ color, size }) => (
                        <Icon name="cloud-download" size={size} color={color} />
                    ),
                }}
            />
            <Drawer.Screen
                name="Chat"
                component={ChatScreen}
                listeners={({ navigation }) => ({
                    drawerItemPress: (e) => {
                        e.preventDefault();
                        navigation.navigate('Chat', { chatId: undefined });
                        navigation.closeDrawer();
                    },
                })}
                options={{
                    drawerIcon: ({ color, size }) => (
                        <Icon name="message-text" size={size} color={color} />
                    ),
                }}
            />
            <Drawer.Screen
                name="Memories"
                component={MemoriesScreen}
                options={{
                    drawerIcon: ({ color, size }) => (
                        <Icon name="brain" size={size} color={color} />
                    ),
                }}
            />
            <Drawer.Screen
                name="CloudInference"
                component={CloudInferenceScreen}
                options={{
                    title: 'Cloud Inference',
                    drawerIcon: ({ color, size }) => (
                        <Icon name="cloud-outline" size={size} color={color} />
                    ),
                }}
            />
            <Drawer.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                    drawerIcon: ({ color, size }) => (
                        <Icon name="cog" size={size} color={color} />
                    ),
                }}
            />
        </Drawer.Navigator>
    );
}

export default function AppNavigator() {
    const [isLoading, setIsLoading] = useState(true);
    const [hasOnboarded, setHasOnboarded] = useState(false);

    useEffect(() => {
        const checkOnboarding = async () => {
            try {
                const userName = await AsyncStorage.getItem('userName');
                setHasOnboarded(!!userName);
            } catch (e) {
                console.error('Failed to check onboarding status', e);
            } finally {
                setIsLoading(false);
            }
        };

        checkOnboarding();
    }, []);

    if (isLoading) {
        return null; // Or a loading screen component
    }

    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{ headerShown: false }}
                initialRouteName={hasOnboarded ? 'Main' : 'Onboarding'}
            >
                <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                <Stack.Screen name="Main" component={MainDrawer} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    drawerHeader: {
        padding: 24,
        paddingTop: 40,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    lilyLogo: {
        width: 40,
        height: 40,
        marginRight: 12,
    },
    drawerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        fontFamily: 'sans-serif-medium',
    },
    historySection: {
        marginTop: 10,
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    separator: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginBottom: 16,
    },
    historyTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#999',
        marginBottom: 12,
        marginLeft: 8,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 8,
        marginBottom: 4,
    },
    historyItemContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    historyTextContainer: {
        marginLeft: 12,
        flex: 1,
    },
    historyItemTitle: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    historyItemDate: {
        fontSize: 10,
        color: '#999',
        marginTop: 2,
    },
    deleteButton: {
        padding: 8,
    },
});
