import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { DrawerActions, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View, Image, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { DrawerParamList } from '../navigation/types';
import { useCactusLM } from 'cactus-react-native';
import { ChatService } from '../services/ChatService';
import { MemoryService } from '../services/MemoryService';
import { UsageService } from '../services/UsageService';

type DashboardScreenProps = {
    navigation: CompositeNavigationProp<
        DrawerNavigationProp<DrawerParamList, 'Dashboard'>,
        NativeStackNavigationProp<any>
    >;
};

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }: DashboardScreenProps) {
    const [userName, setUserName] = useState('');
    const [hasDownloadedModel, setHasDownloadedModel] = useState(false);
    const [totalChats, setTotalChats] = useState(0);
    const [totalMemories, setTotalMemories] = useState(0);
    const [memoryStorage, setMemoryStorage] = useState('0 KB');
    const [chatStorage, setChatStorage] = useState('0 KB');
    const [totalCharacters, setTotalCharacters] = useState(0);
    const [downloadedModelsCount, setDownloadedModelsCount] = useState(0);
    const [modelsStorage, setModelsStorage] = useState('0 MB');
    const [usageData, setUsageData] = useState<number[]>([]);
    const [selectedTimeRange, setSelectedTimeRange] = useState<'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all'>('daily');

    const cactusLM = useCactusLM();
    const insets = useSafeAreaInsets();

    const calculateStorageSize = (jsonString: string) => {
        const bytes = new Blob([jsonString]).size;
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const loadStats = async () => {
        // Load name
        const name = await AsyncStorage.getItem('userName');
        if (name) setUserName(name);

        // Check models
        const models = await cactusLM.getModels();
        const downloadedModels = models.filter(m => m.isDownloaded);
        const downloaded = downloadedModels.length > 0;
        setHasDownloadedModel(downloaded);
        setDownloadedModelsCount(downloadedModels.length);

        // Calculate total model storage
        const totalModelSizeMB = downloadedModels.reduce((sum, model) => sum + model.sizeMb, 0);
        if (totalModelSizeMB < 1024) {
            setModelsStorage(`${totalModelSizeMB.toFixed(2)} MB`);
        } else {
            setModelsStorage(`${(totalModelSizeMB / 1024).toFixed(2)} GB`);
        }

        // Load chats
        const chats = await ChatService.getChats();
        setTotalChats(chats.length);
        setChatStorage(calculateStorageSize(JSON.stringify(chats)));

        // Load memories
        const memories = await MemoryService.getMemories();
        setTotalMemories(memories.length);
        setMemoryStorage(calculateStorageSize(JSON.stringify(memories)));

        // Load usage
        const stats = await UsageService.getStats();
        setTotalCharacters(stats.totalCharacters);

        // Load usage graph data
        await loadUsageGraph(selectedTimeRange);
    };

    const loadUsageGraph = async (range: typeof selectedTimeRange) => {
        const now = Date.now();
        let startTime = 0;
        let bucketSize = 0;
        let bucketCount = 0;

        switch (range) {
            case 'hourly':
                startTime = now - 24 * 60 * 60 * 1000; // Last 24 hours
                bucketSize = 60 * 60 * 1000; // 1 hour
                bucketCount = 24;
                break;
            case 'daily':
                startTime = now - 7 * 24 * 60 * 60 * 1000; // Last 7 days
                bucketSize = 24 * 60 * 60 * 1000; // 1 day
                bucketCount = 7;
                break;
            case 'weekly':
                startTime = now - 12 * 7 * 24 * 60 * 60 * 1000; // Last 12 weeks
                bucketSize = 7 * 24 * 60 * 60 * 1000; // 1 week
                bucketCount = 12;
                break;
            case 'monthly':
                startTime = now - 12 * 30 * 24 * 60 * 60 * 1000; // Last 12 months
                bucketSize = 30 * 24 * 60 * 60 * 1000; // 1 month
                bucketCount = 12;
                break;
            case 'yearly':
                startTime = now - 5 * 365 * 24 * 60 * 60 * 1000; // Last 5 years
                bucketSize = 365 * 24 * 60 * 60 * 1000; // 1 year
                bucketCount = 5;
                break;
            case 'all':
                const usage = await UsageService.getUsage();
                if (usage.length === 0) {
                    setUsageData([]);
                    return;
                }
                startTime = Math.min(...usage.map(u => u.timestamp));
                bucketCount = 10;
                bucketSize = (now - startTime) / bucketCount;
                break;
        }

        const usage = await UsageService.getUsageInRange(startTime, now);
        const buckets = new Array(bucketCount).fill(0);

        usage.forEach(u => {
            const index = Math.floor((u.timestamp - startTime) / bucketSize);
            if (index >= 0 && index < bucketCount) {
                buckets[index]++;
            }
        });

        setUsageData(buckets);
    };

    useFocusEffect(
        React.useCallback(() => {
            loadStats();
        }, [selectedTimeRange])
    );



    const maxUsage = Math.max(...usageData, 1);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={{ marginRight: 12 }}>
                    <Icon name="menu" size={28} color="#333" />
                </TouchableOpacity>
                <Image source={require('../media/lily_logo.png')} style={styles.lilyLogo} />
                <Text style={styles.userName}>{userName ? `Hello, ${userName}` : 'Hello'}</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24 }}>
                {/* Pink Card - Only show if no models downloaded */}
                {!hasDownloadedModel && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Get started with your first model</Text>
                        <TouchableOpacity style={styles.cardButton} onPress={() => navigation.navigate('Models')}>
                            <Text style={styles.cardButtonText}>Go to models</Text>
                            <Icon name="arrow-right" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Icon name="message-text" size={32} color="#FF69B4" />
                        <Text style={styles.statValue}>{totalChats}</Text>
                        <Text style={styles.statLabel}>Chats</Text>
                    </View>

                    <View style={styles.statCard}>
                        <Icon name="brain" size={32} color="#2196F3" />
                        <Text style={styles.statValue}>{totalMemories}</Text>
                        <Text style={styles.statLabel}>Memories</Text>
                    </View>

                    <View style={styles.statCard}>
                        <Icon name="text" size={32} color="#4CAF50" />
                        <Text style={styles.statValue}>{totalCharacters.toLocaleString()}</Text>
                        <Text style={styles.statLabel}>Characters</Text>
                    </View>

                    <View style={styles.statCard}>
                        <Icon name="database" size={32} color="#FF9800" />
                        <Text style={styles.statValue}>{memoryStorage}</Text>
                        <Text style={styles.statLabel}>Memory Size</Text>
                    </View>

                    <View style={styles.statCard}>
                        <Icon name="folder" size={32} color="#9C27B0" />
                        <Text style={styles.statValue}>{chatStorage}</Text>
                        <Text style={styles.statLabel}>Chat Size</Text>
                    </View>

                    <View style={styles.statCard}>
                        <Icon name="download" size={32} color="#00BCD4" />
                        <Text style={styles.statValue}>{modelsStorage}</Text>
                        <Text style={styles.statLabel}>Models ({downloadedModelsCount})</Text>
                    </View>
                </View>

                {/* Usage Graph */}
                <View style={styles.graphCard}>
                    <Text style={styles.graphTitle}>Usage Activity</Text>

                    <View style={styles.timeRangeSelector}>
                        {(['hourly', 'daily', 'weekly', 'monthly', 'yearly', 'all'] as const).map(range => (
                            <TouchableOpacity
                                key={range}
                                style={[styles.timeRangeButton, selectedTimeRange === range && styles.timeRangeButtonActive]}
                                onPress={() => setSelectedTimeRange(range)}
                            >
                                <Text style={[styles.timeRangeText, selectedTimeRange === range && styles.timeRangeTextActive]}>
                                    {range === 'all' ? 'All' : range.charAt(0).toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.graphContainer}>
                        {usageData.length === 0 ? (
                            <Text style={styles.noDataText}>No usage data yet</Text>
                        ) : (
                            <View style={styles.barChart}>
                                {usageData.map((value, index) => (
                                    <View key={index} style={styles.barContainer}>
                                        <View
                                            style={[
                                                styles.bar,
                                                { height: `${(value / maxUsage) * 100}%` }
                                            ]}
                                        />
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.actionsSection}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>

                    <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Chat', { chatId: undefined })}>
                        <Icon name="plus-circle" size={24} color="#FF69B4" />
                        <Text style={styles.actionButtonText}>New Chat</Text>
                        <Icon name="chevron-right" size={20} color="#999" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Models')}>
                        <Icon name="cloud-download" size={24} color="#2196F3" />
                        <Text style={styles.actionButtonText}>Manage Models</Text>
                        <Icon name="chevron-right" size={20} color="#999" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Memories')}>
                        <Icon name="brain" size={24} color="#4CAF50" />
                        <Text style={styles.actionButtonText}>View Memories</Text>
                        <Icon name="chevron-right" size={20} color="#999" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Settings')}>
                        <Icon name="cog" size={24} color="#607D8B" />
                        <Text style={styles.actionButtonText}>Settings</Text>
                        <Icon name="chevron-right" size={20} color="#999" />
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fafafaff',
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
    lilyLogo: {
        width: 32,
        height: 32,
        marginRight: 8,
    },
    userName: {
        marginLeft: 12,
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
    },
    card: {
        backgroundColor: '#FF69B4',
        borderRadius: 24,
        padding: 30,
        marginBottom: 24,
    },
    cardTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 48,
        textAlign: 'left',
    },
    cardButton: {
        backgroundColor: '#ff83c1ff',
        borderRadius: 120,
        paddingVertical: 12,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        width: (width - 60) / 2,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#333',
        marginTop: 8,
    },
    statLabel: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
    },
    graphCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    graphTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        marginBottom: 16,
    },
    timeRangeSelector: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 20,
    },
    timeRangeButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#f5f5f5',
    },
    timeRangeButtonActive: {
        backgroundColor: '#FF69B4',
    },
    timeRangeText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '600',
    },
    timeRangeTextActive: {
        color: '#fff',
    },
    graphContainer: {
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noDataText: {
        fontSize: 14,
        color: '#999',
    },
    barChart: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: '100%',
        width: '100%',
        gap: 4,
    },
    barContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        height: '100%',
    },
    bar: {
        width: '100%',
        backgroundColor: '#FF69B4',
        borderRadius: 4,
        minHeight: 2,
    },
    actionsSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        marginBottom: 12,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    actionButtonText: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        marginLeft: 12,
        fontWeight: '500',
    },
    dangerButton: {
        // No special styling needed
    },
    disabledText: {
        color: '#ccc',
    },
});
