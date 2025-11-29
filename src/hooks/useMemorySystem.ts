import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCactusLM } from 'cactus-react-native';

const MEMORY_ENABLED_KEY = 'lily_memory_enabled';
const EMBEDDING_MODEL_KEY = 'lily_embedding_model';

export const useMemorySystem = () => {
    const [isEnabled, setIsEnabled] = useState(false);
    const [embeddingModelId, setEmbeddingModelId] = useState('qwen3-0.6-embed');
    const [isInitialized, setIsInitialized] = useState(false);

    // We use a separate cactusLM instance for embeddings
    const embeddingLM = useCactusLM({ model: embeddingModelId });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const enabled = await AsyncStorage.getItem(MEMORY_ENABLED_KEY);
            const model = await AsyncStorage.getItem(EMBEDDING_MODEL_KEY);
            if (enabled !== null) setIsEnabled(enabled === 'true');
            if (model) setEmbeddingModelId(model);
            setIsInitialized(true);
        } catch (e) {
            console.error('Failed to load memory settings', e);
        }
    };

    const toggleEnabled = async (value: boolean) => {
        setIsEnabled(value);
        await AsyncStorage.setItem(MEMORY_ENABLED_KEY, String(value));
    };

    const setModel = async (modelId: string) => {
        setEmbeddingModelId(modelId);
        await AsyncStorage.setItem(EMBEDDING_MODEL_KEY, modelId);
    };

    const generateEmbedding = async (text: string): Promise<number[] | null> => {
        // If not downloaded, we can't generate
        if (!embeddingLM.isDownloaded) {
            return null;
        }

        try {
            // @ts-ignore
            const result = await embeddingLM.embed({ text });
            if (result && result.embedding && Array.isArray(result.embedding)) return result.embedding;

            console.log('Unknown embedding result format:', result);
            return null;
        } catch (e) {
            console.error('Embedding generation failed', e);
            return null;
        }
    };

    return {
        isEnabled,
        toggleEnabled,
        embeddingModelId,
        setModel,
        embeddingLM,
        generateEmbedding,
        isInitialized
    };
};
