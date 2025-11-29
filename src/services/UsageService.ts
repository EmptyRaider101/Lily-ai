import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UsageEntry {
    timestamp: number;
    type: 'message' | 'completion';
    characterCount: number;
}

export interface UsageStats {
    totalMessages: number;
    totalCompletions: number;
    totalCharacters: number;
}

const USAGE_STORAGE_KEY = 'lily_usage';

export const UsageService = {
    async getUsage(): Promise<UsageEntry[]> {
        try {
            const json = await AsyncStorage.getItem(USAGE_STORAGE_KEY);
            return json ? JSON.parse(json) : [];
        } catch (e) {
            console.error('Failed to load usage', e);
            return [];
        }
    },

    async addUsage(entry: UsageEntry): Promise<void> {
        try {
            const usage = await this.getUsage();
            usage.push(entry);
            await AsyncStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(usage));
        } catch (e) {
            console.error('Failed to save usage', e);
        }
    },

    async getStats(): Promise<UsageStats> {
        const usage = await this.getUsage();
        return {
            totalMessages: usage.filter(u => u.type === 'message').length,
            totalCompletions: usage.filter(u => u.type === 'completion').length,
            totalCharacters: usage.reduce((sum, u) => sum + u.characterCount, 0),
        };
    },

    async getUsageInRange(startTime: number, endTime: number): Promise<UsageEntry[]> {
        const usage = await this.getUsage();
        return usage.filter(u => u.timestamp >= startTime && u.timestamp <= endTime);
    },

    async clearUsage(): Promise<void> {
        await AsyncStorage.removeItem(USAGE_STORAGE_KEY);
    }
};
