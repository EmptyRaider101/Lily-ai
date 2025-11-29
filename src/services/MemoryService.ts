import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MemoryEntry {
    id: string;
    content: string;
    role: 'user' | 'assistant';
    embedding: number[];
    timestamp: number;
    chatId: string;
}

const MEMORY_STORAGE_KEY = 'lily_memories';

// Simple cosine similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export const MemoryService = {
    async getMemories(): Promise<MemoryEntry[]> {
        try {
            const json = await AsyncStorage.getItem(MEMORY_STORAGE_KEY);
            return json ? JSON.parse(json) : [];
        } catch (e) {
            console.error('Failed to load memories', e);
            return [];
        }
    },

    async addMemory(entry: MemoryEntry): Promise<void> {
        try {
            const memories = await this.getMemories();
            memories.push(entry);
            await AsyncStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(memories));
        } catch (e) {
            console.error('Failed to save memory', e);
        }
    },

    async searchMemories(queryEmbedding: number[], limit: number = 3, threshold: number = 0.7): Promise<MemoryEntry[]> {
        const memories = await this.getMemories();
        const scored = memories.map(m => ({
            ...m,
            score: cosineSimilarity(queryEmbedding, m.embedding)
        }));

        // Filter by threshold and sort by score desc
        return scored
            .filter(m => m.score >= threshold)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    },

    async clearMemories(): Promise<void> {
        await AsyncStorage.removeItem(MEMORY_STORAGE_KEY);
    },

    async deleteMemory(id: string): Promise<void> {
        try {
            const memories = await this.getMemories();
            const newMemories = memories.filter(m => m.id !== id);
            await AsyncStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(newMemories));
        } catch (e) {
            console.error('Failed to delete memory', e);
        }
    }
};
