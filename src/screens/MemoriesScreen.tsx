import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { DrawerActions, useFocusEffect } from '@react-navigation/native';
import type { DrawerScreenProps } from '@react-navigation/drawer';
import type { DrawerParamList } from '../navigation/types';
import { MemoryService, MemoryEntry } from '../services/MemoryService';
import { useAlert } from '../context/AlertContext';

type Props = DrawerScreenProps<DrawerParamList, 'Memories'>;

export default function MemoriesScreen({ navigation }: Props) {
    const [memories, setMemories] = useState<MemoryEntry[]>([]);
    const [storageSize, setStorageSize] = useState<string>('0 KB');
    const insets = useSafeAreaInsets();
    const { showAlert } = useAlert();

    const calculateStorageSize = (data: MemoryEntry[]) => {
        const jsonString = JSON.stringify(data);
        const bytes = new Blob([jsonString]).size;

        if (bytes < 1024) {
            return `${bytes} B`;
        } else if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(2)} KB`;
        } else {
            return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        }
    };

    const loadMemories = async () => {
        const data = await MemoryService.getMemories();
        // Sort by timestamp desc
        data.sort((a, b) => b.timestamp - a.timestamp);
        setMemories(data);
        setStorageSize(calculateStorageSize(data));
    };

    useFocusEffect(
        React.useCallback(() => {
            loadMemories();
        }, [])
    );

    const handleDelete = async (id: string) => {
        showAlert(
            'Delete Memory',
            'Are you sure you want to delete this memory?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await MemoryService.deleteMemory(id);
                        loadMemories();
                    }
                }
            ]
        );
    };

    const handleClearAll = async () => {
        showAlert(
            'Clear All Memories',
            'Are you sure you want to delete ALL memories? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: async () => {
                        await MemoryService.clearMemories();
                        loadMemories();
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: MemoryEntry }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={[styles.roleBadge, item.role === 'user' ? styles.userBadge : styles.aiBadge]}>
                    <Icon name={item.role === 'user' ? 'account' : 'robot'} size={12} color="#fff" />
                    <Text style={styles.roleText}>{item.role === 'user' ? 'User' : 'AI'}</Text>
                </View>
                <Text style={styles.dateText}>{new Date(item.timestamp).toLocaleString()}</Text>
            </View>

            <Text style={styles.content}>{item.content}</Text>

            <View style={styles.cardFooter}>
                <Text style={styles.chatIdText}>Chat ID: {item.chatId}</Text>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
                    <Icon name="trash-can-outline" size={20} color="#FF69B4" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={{ marginRight: 16 }}>
                        <Icon name="menu" size={28} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Memories</Text>
                </View>

                {memories.length > 0 && (
                    <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
                        <Icon name="delete-sweep" size={24} color="#FF69B4" />
                    </TouchableOpacity>
                )}
            </View>

            {memories.length > 0 && (
                <View style={styles.storageMetric}>
                    <Icon name="database" size={16} color="#666" />
                    <Text style={styles.storageText}>Storage used: {storageSize}</Text>
                    <Text style={styles.memoryCount}>{memories.length} {memories.length === 1 ? 'memory' : 'memories'}</Text>
                </View>
            )}

            <FlatList
                data={memories}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Icon name="brain" size={64} color="#ddd" />
                        <Text style={styles.emptyText}>No memories stored yet.</Text>
                        <Text style={styles.emptySubText}>Enable memories in chat to start building your knowledge base.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fafafaff',
    },
    header: {
        paddingHorizontal: 24,
        paddingBottom: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
    },
    clearButton: {
        padding: 8,
    },
    listContent: {
        padding: 16,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    userBadge: {
        backgroundColor: '#FF69B4',
    },
    aiBadge: {
        backgroundColor: '#2196F3',
    },
    roleText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    dateText: {
        fontSize: 12,
        color: '#999',
    },
    content: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
        marginBottom: 12,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#f8f9fa',
        paddingTop: 8,
    },
    chatIdText: {
        fontSize: 10,
        color: '#ccc',
        fontFamily: 'monospace',
    },
    deleteButton: {
        padding: 4,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
        paddingHorizontal: 40,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#999',
        marginTop: 16,
    },
    emptySubText: {
        fontSize: 14,
        color: '#ccc',
        textAlign: 'center',
        marginTop: 8,
    },
    storageMetric: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 8,
        gap: 8,
    },
    storageText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
        flex: 1,
    },
    memoryCount: {
        fontSize: 12,
        color: '#999',
    },
});
