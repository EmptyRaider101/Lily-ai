import type { Tool } from 'cactus-react-native';

// Define the haptic vibration tool
export const tools: Tool[] = [
    {
        type: 'function',
        name: 'vibrate_device',
        description: 'Trigger haptic vibration on the device with customizable parameters',
        parameters: {
            type: 'object',
            properties: {
                duration: {
                    type: 'number',
                    description: 'Duration of vibration in milliseconds (default: 400)',
                },
                pattern: {
                    type: 'string',
                    description: 'Vibration pattern type: "single", "double", "triple", or "custom"',
                },
                intensity: {
                    type: 'string',
                    description: 'Vibration intensity: "light", "medium", or "strong"',
                },
            },
            required: [],
        },
    },
];
