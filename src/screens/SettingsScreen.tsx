import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { ChatService } from '../services/ChatService';
import { MemoryService } from '../services/MemoryService';
import { useAlert } from '../context/AlertContext';

export default function SettingsScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const [name, setName] = useState('');
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState('');

    const { showAlert } = useAlert();

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const savedName = await AsyncStorage.getItem('userName');
        if (savedName) {
            setName(savedName);
            setNewName(savedName);
        }
    };

    const handleSaveName = async () => {
        if (!newName.trim()) {
            showAlert('Error', 'Name cannot be empty');
            return;
        }
        await AsyncStorage.setItem('userName', newName.trim());
        setName(newName.trim());
        setIsEditingName(false);
        showAlert('Success', 'Name updated successfully');
    };

    const handleDeleteAllChats = () => {
        showAlert(
            'Delete All Chats',
            'Are you sure you want to delete all chat history? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete All',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const chats = await ChatService.getChats();
                            for (const chat of chats) {
                                await ChatService.deleteChat(chat.id);
                            }
                            showAlert('Success', 'All chats deleted');
                        } catch (e) {
                            console.error(e);
                            showAlert('Error', 'Failed to delete chats');
                        }
                    }
                }
            ]
        );
    };

    const handleDeleteAllMemories = () => {
        showAlert(
            'Delete All Memories',
            'Are you sure you want to delete all memories? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete All',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await MemoryService.clearMemories();
                            showAlert('Success', 'All memories deleted');
                        } catch (e) {
                            console.error(e);
                            showAlert('Error', 'Failed to delete memories');
                        }
                    }
                }
            ]
        );
    };

    const handleResetApp = () => {
        showAlert(
            'Reset App',
            'Are you sure you want to reset the app? This will delete all chats, memories, and your saved name. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset Everything',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Clear Chats
                            const chats = await ChatService.getChats();
                            for (const chat of chats) {
                                await ChatService.deleteChat(chat.id);
                            }

                            // Clear Memories
                            await MemoryService.clearMemories();

                            // Clear User Name
                            await AsyncStorage.removeItem('userName');
                            await AsyncStorage.removeItem('cloud_models');
                            await AsyncStorage.removeItem('openrouter_api_key');

                            // Navigate to Onboarding
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'Onboarding' }],
                            } as any);
                        } catch (error) {
                            console.error('Failed to reset app:', error);
                            showAlert('Error', 'Failed to reset app data.');
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={{ marginRight: 16 }}>
                    <Icon name="menu" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Profile</Text>
                    <View style={styles.card}>
                        <View style={styles.settingRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.settingLabel}>Display Name</Text>
                                {isEditingName ? (
                                    <TextInput
                                        style={styles.input}
                                        value={newName}
                                        onChangeText={setNewName}
                                        autoFocus
                                        placeholder="Enter your name"
                                    />
                                ) : (
                                    <Text style={styles.settingValue}>{name || 'Not set'}</Text>
                                )}
                            </View>
                            <TouchableOpacity
                                style={styles.editButton}
                                onPress={() => isEditingName ? handleSaveName() : setIsEditingName(true)}
                            >
                                <Icon name={isEditingName ? "check" : "pencil"} size={20} color="#FF69B4" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Data Management</Text>

                    <TouchableOpacity style={styles.actionButton} onPress={handleDeleteAllChats}>
                        <View style={[styles.iconContainer, { backgroundColor: '#FFEBEE' }]}>
                            <Icon name="delete-sweep" size={24} color="#f44336" />
                        </View>
                        <View style={styles.actionTextContainer}>
                            <Text style={styles.actionTitle}>Delete All Chats</Text>
                            <Text style={styles.actionDescription}>Clear all conversation history</Text>
                        </View>
                        <Icon name="chevron-right" size={20} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton} onPress={handleDeleteAllMemories}>
                        <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
                            <Icon name="brain-off" size={24} color="#2196F3" />
                        </View>
                        <View style={styles.actionTextContainer}>
                            <Text style={styles.actionTitle}>Delete All Memories</Text>
                            <Text style={styles.actionDescription}>Clear all stored memories</Text>
                        </View>
                        <Icon name="chevron-right" size={20} color="#ccc" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton} onPress={handleResetApp}>
                        <View style={[styles.iconContainer, { backgroundColor: '#FFEBEE' }]}>
                            <Icon name="nuke" size={24} color="#D32F2F" />
                        </View>
                        <View style={styles.actionTextContainer}>
                            <Text style={[styles.actionTitle, { color: '#D32F2F' }]}>Reset Application</Text>
                            <Text style={styles.actionDescription}>Delete everything and start over</Text>
                        </View>
                        <Icon name="chevron-right" size={20} color="#ccc" />
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Created by Rayhaan & Amaan</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fafafa',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
    },
    content: {
        padding: 24,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#999',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    settingLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    settingValue: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    input: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        padding: 0,
        borderBottomWidth: 1,
        borderBottomColor: '#FF69B4',
    },
    editButton: {
        padding: 8,
        backgroundColor: '#FFF0F5',
        borderRadius: 8,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    actionTextContainer: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    actionDescription: {
        fontSize: 12,
        color: '#999',
    },
    footer: {
        marginTop: 'auto',
        paddingVertical: 20,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 14,
        color: '#ccc',
        fontWeight: '500',
    },
});
