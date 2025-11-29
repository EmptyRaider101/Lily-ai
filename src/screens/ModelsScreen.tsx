import { useCactusLM } from 'cactus-react-native';
import type { CactusModel } from 'cactus-react-native';
import React, { useEffect, useState } from 'react';
import { FlatList, StatusBar, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { DrawerParamList, RootStackParamList } from '../navigation/types';

type ModelsScreenNavigationProp = CompositeNavigationProp<
    DrawerNavigationProp<DrawerParamList, 'Models'>,
    NativeStackNavigationProp<RootStackParamList>
>;

type ProgressRingProps = {
    progress: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
};

const ProgressRing = ({ progress, size = 24, strokeWidth = 3, color = '#FF69B4' }: ProgressRingProps) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - progress * circumference;

    return (
        <View style={{ width: size, height: size, transform: [{ rotate: '-90deg' }] }}>
            <Svg width={size} height={size}>
                <Circle
                    stroke="#E0E0E0"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                <Circle
                    stroke={color}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                />
            </Svg>
        </View>
    );
};

const ModelCard = ({ item, navigation }: { item: CactusModel; navigation: ModelsScreenNavigationProp }) => {
    const cactusLM = useCactusLM({ model: item.slug });

    const handleDownload = () => {
        if (!cactusLM.isDownloaded && !cactusLM.isDownloading) {
            cactusLM.download();
        }
    };

    const handleChat = () => {
        navigation.navigate('Chat', { modelId: item.slug });
    };

    return (
        <View style={styles.card}>
            <View style={styles.cardContent}>
                <Text style={styles.modelName}>{item.name}</Text>
                <Text style={styles.modelSize}>{item.sizeMb} MB</Text>

                <View style={styles.badgesContainer}>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>Q{item.quantization}</Text>
                    </View>
                    {item.supportsToolCalling && (
                        <View style={[styles.badge, styles.toolBadge]}>
                            <Icon name="tools" size={10} color="#fff" style={{ marginRight: 4 }} />
                            <Text style={[styles.badgeText, styles.badgeTextWhite]}>Tools</Text>
                        </View>
                    )}
                    {item.supportsVision && (
                        <View style={[styles.badge, styles.visionBadge]}>
                            <Icon name="eye" size={10} color="#fff" style={{ marginRight: 4 }} />
                            <Text style={[styles.badgeText, styles.badgeTextWhite]}>Vision</Text>
                        </View>
                    )}
                </View>
            </View>

            <View style={styles.actionContainer}>
                {!cactusLM.isDownloaded && !cactusLM.isDownloading && (
                    <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
                        <Icon name="download" size={20} color="#fff" />
                    </TouchableOpacity>
                )}

                {cactusLM.isDownloading && (
                    <View style={styles.progressContainer}>
                        <Text style={styles.progressText}>{Math.round(cactusLM.downloadProgress * 100)}%</Text>
                        <ProgressRing progress={cactusLM.downloadProgress} />
                    </View>
                )}

                {cactusLM.isDownloaded && (
                    <TouchableOpacity style={styles.chatButton} onPress={handleChat}>
                        <Icon name="arrow-right" size={24} color="#fff" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

export default function ModelsScreen({ navigation }: { navigation: ModelsScreenNavigationProp }) {
    const cactusLM = useCactusLM();
    const [models, setModels] = useState<CactusModel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const insets = useSafeAreaInsets();

    useEffect(() => {
        const fetchModels = async () => {
            try {
                const fetchedModels = await cactusLM.getModels();
                setModels(fetchedModels);
            } catch (error) {
                console.error('Failed to fetch models:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchModels();
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={{ marginRight: 16 }}>
                    <Icon name="menu" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Available Models</Text>
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FF69B4" />
                </View>
            ) : (
                <FlatList
                    data={models}
                    keyExtractor={(item) => item.slug}
                    renderItem={({ item }) => <ModelCard item={item} navigation={navigation} />}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No models available.</Text>
                    }
                />
            )}
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
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
    },
    listContent: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        fontSize: 16,
        marginTop: 20,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    cardContent: {
        flex: 1,
    },
    modelName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    modelSize: {
        fontSize: 14,
        color: '#999',
        marginBottom: 8,
    },
    badgesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    badge: {
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    toolBadge: {
        backgroundColor: '#4CAF50',
    },
    visionBadge: {
        backgroundColor: '#2196F3',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#666',
    },
    badgeTextWhite: {
        color: '#fff',
    },
    actionContainer: {
        marginLeft: 16,
        width: 80,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    downloadButton: {
        backgroundColor: '#FFB6C1',
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    progressText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FF69B4',
        width: 35,
        textAlign: 'right',
    },
    downloadedContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
    },
    chatButton: {
        backgroundColor: '#FF69B4',
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
