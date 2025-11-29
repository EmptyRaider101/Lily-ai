import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    images?: string[]; // URIs or base64 of attached images
    memoryLog?: string[]; // Log of memory operations
}

export interface ChatSession {
    id: string;
    title: string;
    lastUsed: number;
    messages: Message[];
    modelId: string;
    ragDir?: string;
}

const CHATS_STORAGE_KEY = 'lily_chats';

export const ChatService = {
    async getChats(): Promise<ChatSession[]> {
        try {
            const json = await AsyncStorage.getItem(CHATS_STORAGE_KEY);
            return json ? JSON.parse(json) : [];
        } catch (e) {
            console.error('Failed to load chats', e);
            return [];
        }
    },

    async saveChat(chat: ChatSession): Promise<void> {
        try {
            const chats = await this.getChats();
            const index = chats.findIndex(c => c.id === chat.id);

            if (index >= 0) {
                chats[index] = chat;
            } else {
                chats.unshift(chat);
            }

            // Sort by lastUsed desc
            chats.sort((a, b) => b.lastUsed - a.lastUsed);

            await AsyncStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats));
        } catch (e) {
            console.error('Failed to save chat', e);
        }
    },

    async deleteChat(chatId: string): Promise<void> {
        try {
            const chats = await this.getChats();
            const newChats = chats.filter(c => c.id !== chatId);
            await AsyncStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(newChats));
        } catch (e) {
            console.error('Failed to delete chat', e);
        }
    },

    async getChat(chatId: string): Promise<ChatSession | null> {
        const chats = await this.getChats();
        return chats.find(c => c.id === chatId) || null;
    }
};
