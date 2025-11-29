import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { CloudService, CloudModel } from '../services/CloudService';

import { useAlert } from '../context/AlertContext';

export default function CloudInferenceScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const { showAlert } = useAlert();
    const [apiKey, setApiKey] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [models, setModels] = useState<CloudModel[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadSavedData();
    }, []);

    const loadSavedData = async () => {
        try {
            const savedKey = await AsyncStorage.getItem('openrouter_api_key');
            if (savedKey) setApiKey(savedKey);

            const savedModels = await AsyncStorage.getItem('cloud_models');
            if (savedModels) {
                setModels(JSON.parse(savedModels));
            }
        } catch (e) {
            console.error('Failed to load cloud settings', e);
        }
    };

    const handleVerifyAndLoad = async () => {
        if (!apiKey.trim()) {
            showAlert('Error', 'Please enter an API Key');
            return;
        }

        setIsLoading(true);
        try {
            const fetchedModels = await CloudService.fetchModels(apiKey.trim());

            // Merge with existing selection state if any
            const mergedModels = fetchedModels.map(newModel => {
                const existing = models.find(m => m.id === newModel.id);
                return existing ? { ...newModel, isSelected: existing.isSelected } : newModel;
            });

            setModels(mergedModels);
            await AsyncStorage.setItem('openrouter_api_key', apiKey.trim());
            await AsyncStorage.setItem('cloud_models', JSON.stringify(mergedModels));

            showAlert('Success', `Loaded ${fetchedModels.length} models`);
        } catch (error) {
            showAlert('Error', 'Failed to fetch models. Check your API Key.');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleModelSelection = async (modelId: string) => {
        const updatedModels = models.map(m =>
            m.id === modelId ? { ...m, isSelected: !m.isSelected } : m
        );
        setModels(updatedModels);
        await AsyncStorage.setItem('cloud_models', JSON.stringify(updatedModels));
    };

    const filteredModels = models.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderModelItem = ({ item }: { item: CloudModel }) => (
        <TouchableOpacity
            style={[styles.modelCard, item.isSelected && styles.selectedModelCard]}
            onPress={() => toggleModelSelection(item.id)}
        >
            <View style={styles.modelHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.modelName}>{item.name}</Text>
                    <Text style={styles.modelId}>{item.id}</Text>
                </View>
                <View style={[styles.checkbox, item.isSelected && styles.checkedCheckbox]}>
                    {item.isSelected && <Icon name="check" size={16} color="#fff" />}
                </View>
            </View>

            <View style={styles.modelDetails}>
                <View style={styles.detailItem}>
                    <Icon name="text-box-outline" size={14} color="#666" />
                    <Text style={styles.detailText}>{item.context_length.toLocaleString()} ctx</Text>
                </View>
                <View style={styles.detailItem}>
                    <Icon name="currency-usd" size={14} color="#666" />
                    <Text style={styles.detailText}>
                        ${item.pricing.prompt}/1M in • ${item.pricing.completion}/1M out
                    </Text>
                </View>
            </View>

            {item.description && (
                <Text style={styles.modelDescription} numberOfLines={2}>
                    {item.description}
                </Text>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={{ marginRight: 16 }}>
                    <Icon name="menu" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Cloud Inference (BYOK)</Text>
            </View>

            <View style={styles.inputSection}>
                <Text style={styles.label}>OpenRouter API Key</Text>
                <View style={styles.apiKeyContainer}>
                    <TextInput
                        style={styles.input}
                        value={apiKey}
                        onChangeText={setApiKey}
                        placeholder="sk-or-..."
                        secureTextEntry
                        autoCapitalize="none"
                    />
                    <TouchableOpacity
                        style={styles.verifyButton}
                        onPress={handleVerifyAndLoad}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.verifyButtonText}>Load Models</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {models.length > 0 && (
                <View style={styles.searchContainer}>
                    <Icon name="magnify" size={20} color="#999" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search models..."
                    />
                </View>
            )}

            <FlatList
                data={filteredModels}
                keyExtractor={item => item.id}
                renderItem={renderModelItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    !isLoading ? (
                        <View style={styles.emptyState}>
                            <Icon name="cloud-off-outline" size={48} color="#ccc" />
                            <Text style={styles.emptyText}>
                                {models.length === 0
                                    ? "Enter your API key to load available models"
                                    : "No models found matching your search"}
                            </Text>
                        </View>
                    ) : null
                }
            />
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
    inputSection: {
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
    },
    apiKeyContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    input: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#333',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    verifyButton: {
        backgroundColor: '#FF69B4',
        borderRadius: 12,
        paddingHorizontal: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    verifyButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        margin: 16,
        marginBottom: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 10,
        fontSize: 16,
        color: '#333',
    },
    listContent: {
        padding: 16,
        paddingTop: 8,
    },
    modelCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    selectedModelCard: {
        borderColor: '#FF69B4',
        backgroundColor: '#FFF0F5',
    },
    modelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    modelName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
        marginBottom: 2,
    },
    modelId: {
        fontSize: 12,
        color: '#999',
        fontFamily: 'monospace',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    checkedCheckbox: {
        backgroundColor: '#FF69B4',
        borderColor: '#FF69B4',
    },
    modelDetails: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 8,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    detailText: {
        fontSize: 12,
        color: '#666',
    },
    modelDescription: {
        fontSize: 12,
        color: '#888',
        lineHeight: 18,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#999',
        textAlign: 'center',
    },
});
