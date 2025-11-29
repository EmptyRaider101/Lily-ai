import { Tool } from 'cactus-react-native';

export const pythonTool: Tool = {
    type: 'function',
    name: 'python_interpreter',
    description: 'A Python environment. Use this to execute Python code to calculate results, process data, or run algorithms. The code is executed in a sandboxed environment. The output of the code (stdout) will be returned.',
    parameters: {
        type: 'object',
        properties: {
            code: {
                type: 'string',
                description: 'The Python code to execute.',
            },
        },
        required: ['code'],
    },
};

export const ToolService = {
    getTools: () => [pythonTool],

    executeTool: async (name: string, args: any): Promise<{ success: boolean; output: string }> => {
        if (name === 'python_interpreter') {
            return ToolService.executePython(args.code);
        }
        return { success: false, output: `Error: Tool ${name} not found.` };
    },

    executePython: async (code: string): Promise<{ success: boolean; output: string }> => {
        // Mock execution for now since we don't have a real Python runtime in React Native yet
        // In a real app, this would call a backend or a native module
        console.log('Executing Python:', code);

        // Simple mock for basic math
        try {
            if (code.includes('print')) {
                const match = code.match(/print\((.*)\)/);
                if (match) {
                    const content = match[1].replace(/['"]/g, '');
                    return { success: true, output: content };
                }
            }
            // Very basic eval for math (unsafe for production, but okay for a mock prototype)
            // We'll just return a success message to prove the loop works
            return {
                success: true,
                output: `[System]: Python code executed successfully.\n(Note: Actual Python execution requires a native runtime. This is a simulation.)\n\nCode:\n${code}`
            };
        } catch (e) {
            return { success: false, output: `Error executing code: ${e}` };
        }
    }
};
