export interface CloudModel {
    id: string;
    name: string;
    description?: string;
    context_length: number;
    pricing: {
        prompt: string;
        completion: string;
    };
    isSelected?: boolean;
}

export const CloudService = {
    async fetchModels(apiKey: string): Promise<CloudModel[]> {
        try {
            const response = await fetch('https://openrouter.ai/api/v1/models', {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch models');
            }

            const json = await response.json();
            return json.data.map((item: any) => ({
                id: item.id,
                name: item.name,
                description: item.description,
                context_length: item.context_length,
                pricing: item.pricing,
                isSelected: false
            }));
        } catch (error) {
            console.error('CloudService fetchModels error:', error);
            throw error;
        }
    }
};
