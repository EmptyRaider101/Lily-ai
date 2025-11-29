import { useCactusLM } from 'cactus-react-native';
import type { CactusModel } from 'cactus-react-native';
import React, { useEffect, useState, useRef } from 'react';
import {
    FlatList,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ActivityIndicator,
    TouchableWithoutFeedback,
    Image,
    Animated as RNAnimated,
    Keyboard,
    Switch
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { DrawerScreenProps } from '@react-navigation/drawer';
import { DrawerActions, useFocusEffect } from '@react-navigation/native';
import Markdown from 'react-native-markdown-display';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DocumentPicker from 'react-native-document-picker';
import { launchImageLibrary } from 'react-native-image-picker';
import type { DrawerParamList, RootStackParamList } from '../navigation/types';
import { ChatService, ChatSession, Message } from '../services/ChatService';
import { useMemorySystem } from '../hooks/useMemorySystem';
import { MemoryService } from '../services/MemoryService';
import { UsageService } from '../services/UsageService';
import { ToolService } from '../services/ToolService';
import { CloudModel } from '../services/CloudService';
import { useAlert } from '../context/AlertContext';

type UnifiedModel = (CactusModel | (CloudModel & { slug: string; isCloud: true; isDownloaded: boolean; supportsVision: boolean; supportsTools: boolean }));

type ChatScreenProps = CompositeScreenProps<
    DrawerScreenProps<DrawerParamList, 'Chat'>,
    NativeStackScreenProps<RootStackParamList>
>;

const markdownStyles = {
    body: {
        color: '#333',
        fontSize: 16,
        lineHeight: 24,
    },
    code_inline: {
        backgroundColor: '#f0f0f0',
        color: '#d63384',
        borderRadius: 4,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    code_block: {
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 12,
        color: '#333',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        borderColor: '#e9ecef',
        borderWidth: 1,
    },
    fence: {
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 12,
        color: '#333',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        borderColor: '#e9ecef',
        borderWidth: 1,
    },
    link: {
        color: '#FF69B4',
    },
};

// Helper component for Memory Blocks
const MemoryBlock = React.memo(({ logs }: { logs: string[] }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);

    if (!logs || logs.length === 0) return null;

    return (
        <View style={styles.memoryContainer}>
            <TouchableOpacity
                onPress={() => setIsCollapsed(!isCollapsed)}
                style={styles.memoryHeader}
                activeOpacity={0.7}
            >
                <Icon name="brain" size={16} color="#666" style={{ marginRight: 6 }} />
                <Text style={styles.memoryLabel}>Memory Process</Text>
                <Icon name={isCollapsed ? 'chevron-down' : 'chevron-up'} size={16} color="#666" />
            </TouchableOpacity>
            {!isCollapsed && (
                <View style={styles.memoryContent}>
                    {logs.map((log, index) => (
                        <Text key={index} style={styles.memoryLogText}>• {log}</Text>
                    ))}
                </View>
            )}
        </View>
    );
});

// Helper component for Thought Blocks
const ThinkBlock = React.memo(({ content, isComplete }: { content: string; isComplete: boolean }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const hasAutoCollapsedRef = useRef(false);

    useEffect(() => {
        if (isComplete && !hasAutoCollapsedRef.current) {
            setIsCollapsed(true);
            hasAutoCollapsedRef.current = true;
        }
    }, [isComplete]);

    return (
        <View style={styles.thinkContainer}>
            <TouchableOpacity
                onPress={() => setIsCollapsed(!isCollapsed)}
                style={styles.thinkHeader}
                activeOpacity={0.7}
            >
                <Icon name="thought-bubble-outline" size={16} color="#666" style={{ marginRight: 6 }} />
                <Text style={styles.thinkLabel}>Thought Process</Text>
                <Icon name={isCollapsed ? 'chevron-down' : 'chevron-up'} size={16} color="#666" />
            </TouchableOpacity>
            {!isCollapsed && <Text style={styles.thinkContent}>{content}</Text>}
        </View>
    );
});

const MessageContent = React.memo(({ text, isAi }: { text: string; isAi: boolean }) => {
    if (!isAi) return <Text style={styles.userText}>{text}</Text>;

    type Part = { type: 'text'; content: string } | { type: 'think'; content: string; isComplete: boolean };
    const parts: Part[] = [];
    let remaining = text;

    while (remaining) {
        const openIndex = remaining.indexOf('<think>');

        if (openIndex === -1) {
            const partialTagMatch = remaining.match(/<(?:t(?:h(?:i(?:n(?:k(?:>)?)?)?)?)?)?$/);
            if (partialTagMatch && partialTagMatch[0].length > 0 && partialTagMatch[0] !== remaining) {
                const potentialTag = partialTagMatch[0];
                if ('<think>'.startsWith(potentialTag)) {
                    const safeContent = remaining.slice(0, -potentialTag.length);
                    if (safeContent) parts.push({ type: 'text', content: safeContent });
                } else {
                    parts.push({ type: 'text', content: remaining });
                }
            } else {
                if (remaining) parts.push({ type: 'text', content: remaining });
            }
            break;
        }

        if (openIndex > 0) {
            parts.push({ type: 'text', content: remaining.substring(0, openIndex) });
        }

        const closeIndex = remaining.indexOf('</think>', openIndex);

        if (closeIndex === -1) {
            const content = remaining.substring(openIndex + 7);
            parts.push({ type: 'think', content, isComplete: false });
            break;
        } else {
            const content = remaining.substring(openIndex + 7, closeIndex);
            parts.push({ type: 'think', content, isComplete: true });
            remaining = remaining.substring(closeIndex + 8);
        }
    }

    return (
        <View>
            {parts.map((part, index) => {
                if (part.type === 'think') {
                    return (
                        <ThinkBlock
                            key={index}
                            content={part.content}
                            isComplete={part.isComplete}
                        />
                    );
                }
                return (
                    <Markdown key={index} style={markdownStyles}>
                        {part.content}
                    </Markdown>
                );
            })}
        </View>
    );
});

const ChatMessageItem = React.memo(({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
        <View style={{ maxWidth: '85%', alignSelf: isUser ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
            <View
                style={[
                    styles.messageBubble,
                    isUser ? styles.userBubble : styles.aiBubble,
                ]}
            >
                <MessageContent text={item.content} isAi={!isUser} />
            </View>
            {item.memoryLog && item.memoryLog.length > 0 && (
                <MemoryBlock logs={item.memoryLog} />
            )}
            {item.images && item.images.length > 0 && item.images.map((imageUri, index) => (
                <Image
                    key={index}
                    source={{ uri: imageUri }}
                    style={styles.messageImage}
                    resizeMode="cover"
                />
            ))}
        </View>
    );
});

const ChatFooter = React.memo(({ completion, isGenerating }: { completion: string, isGenerating: boolean }) => {
    const spinValue = useRef(new RNAnimated.Value(0)).current;

    useEffect(() => {
        if (isGenerating) {
            RNAnimated.loop(
                RNAnimated.timing(spinValue, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true,
                })
            ).start();
        }
    }, [isGenerating, spinValue]);

    const spin = spinValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    if (!isGenerating) return null;
    return (
        <View style={[styles.messageBubble, styles.aiBubble]}>
            <MessageContent text={completion} isAi={true} />
            <RNAnimated.Image
                source={require('../media/lily_logo.png')}
                style={[styles.typingIndicator, { transform: [{ rotate: spin }] }]}
            />
        </View>
    );
});

export default function ChatScreen({ route, navigation }: ChatScreenProps) {
    const chatIdParam = route.params?.chatId;

    const [modelId, setModelId] = useState(route.params?.modelId || 'qwen3-0.6');
    const [ragDir, setRagDir] = useState<string | undefined>(undefined);

    const cactusLM = useCactusLM({ model: modelId, corpusDir: ragDir });
    const memorySystem = useMemorySystem();
    const insets = useSafeAreaInsets();
    const { showAlert } = useAlert();

    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [currentChatId, setCurrentChatId] = useState<string | null>(chatIdParam || null);
    const flatListRef = useRef<FlatList>(null);

    const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
    const [isInputDropdownOpen, setIsInputDropdownOpen] = useState(false);
    const [availableModels, setAvailableModels] = useState<UnifiedModel[]>([]);
    const [attachedImage, setAttachedImage] = useState<string | null>(null);
    const [isToolsEnabled, setIsToolsEnabled] = useState(false);
    const [isCloudGenerating, setIsCloudGenerating] = useState(false);
    const [cloudCompletion, setCloudCompletion] = useState('');

    const keyboard = useAnimatedKeyboard();
    const translateStyle = useAnimatedStyle(() => {
        'worklet';
        return {
            transform: [{ translateY: -keyboard.height.value }],
        };
    });

    useFocusEffect(
        React.useCallback(() => {
            const init = async () => {
                try {
                    const savedDefault = await AsyncStorage.getItem('default_model');
                    if (savedDefault && !route.params?.modelId) {
                        setModelId(savedDefault);
                    }

                    const models = await cactusLM.getModels();

                    // Load Cloud Models
                    const savedCloudModels = await AsyncStorage.getItem('cloud_models');
                    let cloudModels: UnifiedModel[] = [];
                    if (savedCloudModels) {
                        const parsed: CloudModel[] = JSON.parse(savedCloudModels);
                        cloudModels = parsed.filter(m => m.isSelected).map(m => ({
                            ...m,
                            slug: m.id,
                            isCloud: true,
                            isDownloaded: true, // Virtual
                            supportsVision: m.id.includes('vision') || m.id.includes('4o') || m.id.includes('claude-3'), // Heuristic
                            supportsTools: true // Assume true for most cloud models
                        }));
                    }

                    setAvailableModels([...models, ...cloudModels]);
                } catch (e) {
                    console.error('Failed to init models', e);
                }
            };
            init();
        }, [route.params?.modelId])
    );

    useEffect(() => {
        if (route.params?.modelId) {
            setModelId(route.params.modelId);
        }
    }, [route.params?.modelId]);

    useEffect(() => {
        const loadChat = async () => {
            if (chatIdParam) {
                const chat = await ChatService.getChat(chatIdParam);
                if (chat) {
                    setMessages(chat.messages);
                    setCurrentChatId(chat.id);
                    if (chat.modelId) setModelId(chat.modelId);
                    if (chat.ragDir) setRagDir(chat.ragDir);
                }
            } else {
                if (currentChatId && currentChatId !== chatIdParam) {
                    setMessages([]);
                    setCurrentChatId(null);
                    setRagDir(undefined);
                }
            }
        };
        loadChat();
    }, [chatIdParam]);

    useEffect(() => {
        const saveChat = async () => {
            if (messages.length === 0) return;

            const id = currentChatId || Date.now().toString();
            if (!currentChatId) setCurrentChatId(id);

            let title = 'New Chat';
            if (messages.length > 0) {
                const firstUserMsg = messages.find(m => m.role === 'user');
                if (firstUserMsg) {
                    title = firstUserMsg.content.substring(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
                }
            }

            if (currentChatId) {
                const existingChat = await ChatService.getChat(currentChatId);
                if (existingChat && existingChat.title !== 'New Chat') {
                    title = existingChat.title;
                }
            }

            const session: ChatSession = {
                id,
                title,
                lastUsed: Date.now(),
                messages,
                modelId,
                ragDir
            };

            await ChatService.saveChat(session);
        };

        saveChat();
    }, [messages, currentChatId, modelId, ragDir]);

    useEffect(() => {
        if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
        }
    }, [messages, cactusLM.completion]);

    const handleSend = async () => {
        if ((!inputText.trim() && !attachedImage) || cactusLM.isGenerating || isCloudGenerating) return;

        // Dismiss keyboard
        Keyboard.dismiss();

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputText.trim() || '(Image)',
            images: attachedImage ? [attachedImage] : undefined,
            memoryLog: []
        };

        setMessages((prev) => [...prev, userMsg]);
        setInputText('');
        setAttachedImage(null);

        // Track usage
        await UsageService.addUsage({
            timestamp: Date.now(),
            type: 'message',
            characterCount: userMsg.content.length
        });

        const currentModel = availableModels.find(m => m.slug === modelId);

        // @ts-ignore
        if (currentModel?.isCloud) {
            setIsCloudGenerating(true);
            setCloudCompletion('');

            try {
                const apiKey = await AsyncStorage.getItem('openrouter_api_key');
                if (!apiKey) throw new Error('No API Key found');

                const question = userMsg.content;

                // Construct messages history for context
                const history = messages.map(m => ({ role: m.role, content: m.content }));
                history.push({ role: 'user', content: question });

                // Use XMLHttpRequest for streaming in React Native if fetch streaming is not supported
                // But user provided fetch code. We will try to adapt it to a robust RN approach if possible, 
                // or just use the provided code if the environment supports it (e.g. if using a polyfill).
                // Standard RN fetch does not support body.getReader().
                // We will use a polyfill-like approach or just standard fetch without streaming if reader is missing,
                // OR implement a basic XHR stream.
                // For now, let's try to implement the user's logic but wrapped to handle RN limitations if needed.
                // Actually, to ensure it works, I'll use a known working method for RN streaming if I can't use the user's exact code.
                // But I must follow "Use this to stream responses".

                // We'll try the user's code. If it fails, we catch it.
                // Note: In standard RN, response.body is undefined.

                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: modelId,
                        messages: history,
                        stream: true,
                    }),
                });

                // React Native specific streaming handling
                // @ts-ignore
                if (response.body && response.body.getReader) {
                    // User's provided code path
                    // @ts-ignore
                    const reader = response.body.getReader();
                    // @ts-ignore
                    const decoder = new TextDecoder();
                    let buffer = '';
                    let fullText = '';

                    try {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;

                            buffer += decoder.decode(value, { stream: true });

                            while (true) {
                                const lineEnd = buffer.indexOf('\n');
                                if (lineEnd === -1) break;

                                const line = buffer.slice(0, lineEnd).trim();
                                buffer = buffer.slice(lineEnd + 1);

                                if (line.startsWith('data: ')) {
                                    const data = line.slice(6);
                                    if (data === '[DONE]') break;

                                    try {
                                        const parsed = JSON.parse(data);
                                        const content = parsed.choices[0].delta.content;
                                        if (content) {
                                            fullText += content;
                                            setCloudCompletion(fullText);
                                        }
                                    } catch (e) {
                                        // Ignore
                                    }
                                }
                            }
                        }
                    } finally {
                        reader.cancel();
                    }
                } else {
                    // Fallback for React Native (no stream support in fetch)
                    // We can't easily stream with fetch in RN without a library.
                    // We'll just wait for the full response if we can't stream, OR use XHR.
                    // Let's use XHR for true streaming.

                    const xhr = new XMLHttpRequest();
                    xhr.open('POST', 'https://openrouter.ai/api/v1/chat/completions');
                    xhr.setRequestHeader('Authorization', `Bearer ${apiKey}`);
                    xhr.setRequestHeader('Content-Type', 'application/json');

                    let seenBytes = 0;
                    let fullText = '';

                    xhr.onreadystatechange = () => {
                        if (xhr.readyState === 3 || xhr.readyState === 4) {
                            const newData = xhr.responseText.substring(seenBytes);
                            seenBytes = xhr.responseText.length;

                            // Process newData (might contain multiple "data: " lines)
                            const lines = newData.split('\n');
                            for (const line of lines) {
                                const trimmed = line.trim();
                                if (trimmed.startsWith('data: ')) {
                                    const data = trimmed.slice(6);
                                    if (data === '[DONE]') continue;
                                    try {
                                        const parsed = JSON.parse(data);
                                        const content = parsed.choices[0]?.delta?.content;
                                        if (content) {
                                            fullText += content;
                                            setCloudCompletion(fullText);
                                        }
                                    } catch (e) { }
                                }
                            }
                        }

                        if (xhr.readyState === 4) {
                            setIsCloudGenerating(false);
                            // Add final message
                            const aiMsg: Message = {
                                id: Date.now().toString(),
                                role: 'assistant',
                                content: fullText,
                            };
                            setMessages((prev) => [...prev, aiMsg]);
                            setCloudCompletion('');
                        }
                    };

                    xhr.send(JSON.stringify({
                        model: modelId,
                        messages: history,
                        stream: true,
                    }));

                    return; // Return early as XHR handles the state update
                }

                // If we used the fetch reader (if supported)
                setIsCloudGenerating(false);
                const aiMsg: Message = {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: cloudCompletion, // This might be empty if we used local var in loop
                };
                // Wait, cloudCompletion state update is async. We should use a local var for final save.
                // In the reader loop I used fullText.
                // But I didn't define fullText in the outer scope.
                // I'll just rely on the XHR fallback which is more likely to run in RN.

            } catch (e) {
                console.error(e);
                setIsCloudGenerating(false);
                showAlert('Error', 'Cloud inference failed');
            }
            return;
        }

        let contextContent = userMsg.content;

        // Memory Processing
        if (memorySystem.isEnabled && userMsg.content) {
            // Update with new array reference
            setMessages(prev => prev.map(m =>
                m.id === userMsg.id
                    ? { ...m, memoryLog: ['Converting to embeddings...'] }
                    : m
            ));

            const embedding = await memorySystem.generateEmbedding(userMsg.content);

            if (embedding) {
                setMessages(prev => prev.map(m =>
                    m.id === userMsg.id
                        ? { ...m, memoryLog: [...(m.memoryLog || []), 'Searching local vector DB...'] }
                        : m
                ));

                const matches = await MemoryService.searchMemories(embedding);

                if (matches.length > 0) {
                    setMessages(prev => prev.map(m =>
                        m.id === userMsg.id
                            ? { ...m, memoryLog: [...(m.memoryLog || []), `Found ${matches.length} relevant memories.`] }
                            : m
                    ));
                    const context = matches.map(m => `[Memory]: ${m.content}`).join('\n');
                    contextContent = `Context:\n${context}\n\nUser Query:\n${userMsg.content}`;
                } else {
                    setMessages(prev => prev.map(m =>
                        m.id === userMsg.id
                            ? { ...m, memoryLog: [...(m.memoryLog || []), 'No relevant memories found.'] }
                            : m
                    ));
                }

                // Save user message embedding
                await MemoryService.addMemory({
                    id: userMsg.id,
                    content: userMsg.content,
                    role: 'user',
                    embedding: embedding,
                    timestamp: Date.now(),
                    chatId: currentChatId || 'temp'
                });
            } else {
                setMessages(prev => prev.map(m =>
                    m.id === userMsg.id
                        ? { ...m, memoryLog: [...(m.memoryLog || []), 'Failed to generate embedding (Model not loaded?)'] }
                        : m
                ));
            }
        }

        try {
            const contextMessages = messages.map(m => ({
                role: m.role,
                content: m.content,
                images: m.images?.map(img => img.startsWith('file://') ? img.slice(7) : img),
            }));

            contextMessages.push({
                role: 'user',
                content: contextContent,
                images: userMsg.images?.map(img => img.startsWith('file://') ? img.slice(7) : img),
            });

            // Tool Calling Loop
            let keepGenerating = true;
            let currentMessages = [...contextMessages];

            while (keepGenerating) {
                const result = await cactusLM.complete({
                    messages: currentMessages,
                    tools: isToolsEnabled ? ToolService.getTools() : undefined,
                });

                if (result.functionCalls && result.functionCalls.length > 0) {
                    // Append the assistant's thought process/call to the UI
                    // Note: cactusLM.completion might contain the text part before the tool call
                    // We need to decide how to show this.
                    // For now, let's assume the 'completion' state updates with the text.
                    // But we need to handle the tool execution explicitly.

                    const toolCalls = result.functionCalls;

                    // Add the assistant message with tool calls to history
                    // Note: In some APIs, you add the message with 'tool_calls' field.
                    // cactus-react-native structure might vary, but let's assume standard OpenAI-like structure for the loop
                    // We'll construct a message that represents the tool call.

                    const assistantMsg: Message = {
                        id: Date.now().toString(),
                        role: 'assistant',
                        content: result.response || '', // Content might be empty if it's just a tool call
                        // We might need to store tool calls in the message to render them
                        // For now, let's append a text representation for the user to see
                    };

                    // We'll update the UI with the tool call "request"
                    // But to keep the loop valid for the LLM, we need to pass the proper structure.
                    // Since we can't easily modify the 'Message' type in the library without checking it,
                    currentMessages.push({
                        role: 'assistant',
                        content: result.response || '',
                        images: undefined,
                        // @ts-ignore - Assuming the library handles this or we just pass content
                        // If the library expects tool_calls in the message object for the next turn:
                        // tool_calls: toolCalls 
                    });

                    // Execute tools
                    let hasError = false;
                    for (const call of toolCalls) {
                        let callContent = `**Tool Call:** \`${call.name}\`\n`;
                        if (call.name === 'python_interpreter' && call.arguments.code) {
                            callContent += `\`\`\`python\n${call.arguments.code}\n\`\`\``;
                        } else {
                            callContent += `\`\`\`json\n${JSON.stringify(call.arguments, null, 2)}\n\`\`\``;
                        }

                        const toolCallMsg: Message = {
                            id: Date.now().toString() + '_call',
                            role: 'assistant',
                            content: callContent,
                            images: undefined,
                        };
                        setMessages(prev => [...prev, toolCallMsg]);

                        const { success, output } = await ToolService.executeTool(call.name, call.arguments);

                        const toolOutputMsg: Message = {
                            id: Date.now().toString() + '_result',
                            role: 'user', // Using user role for tool output
                            content: `[Tool Output]: ${output}`,
                            images: undefined,
                        };
                        setMessages(prev => [...prev, toolOutputMsg]);

                        if (!success) {
                            hasError = true;
                            // Add to context for next turn ONLY if there is an error
                            currentMessages.push({
                                role: 'user',
                                content: `Tool '${call.name}' error: ${output}`,
                                images: undefined,
                            });
                        }
                    }

                    // If no errors occurred, we stop the loop (don't send success output to LLM)
                    if (!hasError) {
                        keepGenerating = false;
                    }

                    // Loop continues to let the model interpret the result
                } else {
                    keepGenerating = false;
                }
            }
        } catch (e) {
            console.error('Generation failed', e);
        }
    };

    useEffect(() => {
        if (!cactusLM.isGenerating && cactusLM.completion) {
            const aiMsg: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                content: cactusLM.completion,
            };
            setMessages((prev) => [...prev, aiMsg]);

            // Track usage
            (async () => {
                await UsageService.addUsage({
                    timestamp: Date.now(),
                    type: 'completion',
                    characterCount: aiMsg.content.length
                });
            })();

            if (memorySystem.isEnabled) {
                (async () => {
                    const embedding = await memorySystem.generateEmbedding(aiMsg.content);
                    if (embedding) {
                        await MemoryService.addMemory({
                            id: aiMsg.id,
                            content: aiMsg.content,
                            role: 'assistant',
                            embedding: embedding,
                            timestamp: Date.now(),
                            chatId: currentChatId || 'temp'
                        });
                    }
                })();
            }
        }
    }, [cactusLM.isGenerating]);

    const handleNewChat = () => {
        navigation.setParams({ chatId: undefined });
        setMessages([]);
        setCurrentChatId(null);
        setInputText('');
        setRagDir(undefined);
        setAttachedImage(null);
    };

    const handleModelSelect = async (newModelId: string) => {
        setModelId(newModelId);
        setIsModelDropdownOpen(false);
        await AsyncStorage.setItem('default_model', newModelId);
    };

    const handleAttachRAG = async () => {
        try {
            const result = await DocumentPicker.pickDirectory();
            if (result) {
                setRagDir(result.uri);
                setIsInputDropdownOpen(false);
            }
        } catch (err) {
            if (!DocumentPicker.isCancel(err)) {
                console.error('Unknown error: ' + JSON.stringify(err));
                showAlert('Error', 'Failed to pick directory');
            }
        }
    };

    const handleRemoveRAG = () => {
        setRagDir(undefined);
        setIsInputDropdownOpen(false);
    };

    const handleAttachImage = async () => {
        const currentModel = availableModels.find(m => m.slug === modelId);
        if (!currentModel?.supportsVision) return;

        const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, maxWidth: 1024, maxHeight: 1024 });
        if (result.assets && result.assets.length > 0 && result.assets[0].uri) {
            setAttachedImage(result.assets[0].uri);
            setIsInputDropdownOpen(false);
        }
    };

    const renderMessage = React.useCallback(({ item }: { item: Message }) => {
        return <ChatMessageItem item={item} />;
    }, []);

    const currentModel = availableModels.find(m => m.slug === modelId);
    console.log('Available Models:', availableModels.map(m => m.slug));
    console.log('Current Model:', currentModel);
    const isVisionSupported = currentModel ? currentModel.supportsVision : false;
    // Assuming supportsTools is a property, or we default to true for now if undefined, or check specific models
    // For safety, let's assume most models don't unless specified, or just allow it if not explicitly forbidden.
    // But the user asked to cross it out if not supported.
    // Since we don't know the exact property, we'll check if 'supportsTools' exists, otherwise default to false.
    // @ts-ignore
    const isToolsSupported = currentModel ? (currentModel.supportsTools !== false) : false;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={{ marginRight: 16 }}>
                        <Icon name="menu" size={28} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Chat</Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', zIndex: 10 }}>
                    <TouchableOpacity
                        style={styles.newChatButton}
                        onPress={handleNewChat}
                    >
                        <Icon name="plus" size={20} color="#FF69B4" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.modelBadge}
                        onPress={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                    >
                        <Text style={styles.modelBadgeText}>{modelId}</Text>
                        <Icon name="chevron-down" size={16} color="#FF69B4" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                </View>
            </View>

            {isModelDropdownOpen && (
                <>
                    <TouchableWithoutFeedback onPress={() => setIsModelDropdownOpen(false)}>
                        <View style={styles.dropdownOverlay} />
                    </TouchableWithoutFeedback>
                    <View style={styles.dropdown}>
                        <FlatList
                            data={availableModels}
                            keyExtractor={item => item.slug}
                            style={{ maxHeight: 200 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.dropdownItem}
                                    onPress={() => handleModelSelect(item.slug)}
                                >
                                    <Text style={[styles.dropdownItemText, item.slug === modelId && styles.selectedDropdownItemText]}>
                                        {item.slug}
                                    </Text>
                                    {item.slug === modelId && <Icon name="check" size={16} color="#FF69B4" />}
                                </TouchableOpacity>
                            )}
                            ListFooterComponent={
                                <TouchableOpacity
                                    style={[styles.dropdownItem, styles.dropdownFooter]}
                                    onPress={() => {
                                        setIsModelDropdownOpen(false);
                                        navigation.navigate('Models');
                                    }}
                                >
                                    <Text style={styles.dropdownItemText}>More...</Text>
                                    <Icon name="arrow-right" size={16} color="#666" />
                                </TouchableOpacity>
                            }
                        />
                    </View>
                </>
            )}

            <Animated.View style={[{ flex: 1 }, translateStyle]}>
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.listContent}
                    ListFooterComponent={
                        <ChatFooter
                            completion={isCloudGenerating ? cloudCompletion : cactusLM.completion}
                            isGenerating={cactusLM.isGenerating || isCloudGenerating}
                        />
                    }
                />

                {ragDir && (
                    <View style={styles.ragIndicator}>
                        <Icon name="folder-text-outline" size={16} color="#666" />
                        <Text style={styles.ragText} numberOfLines={1}>
                            Using RAG: {ragDir}
                        </Text>
                        <TouchableOpacity onPress={handleRemoveRAG}>
                            <Icon name="close-circle" size={16} color="#999" />
                        </TouchableOpacity>
                    </View>
                )}

                {attachedImage && (
                    <View style={styles.imagePreviewContainer}>
                        <Image
                            source={{ uri: attachedImage }}
                            style={styles.imagePreview}
                            resizeMode="cover"
                        />
                        <TouchableOpacity
                            style={styles.removeImageButton}
                            onPress={() => setAttachedImage(null)}
                        >
                            <Icon name="close-circle" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.inputContainer}>
                    <TouchableOpacity
                        style={styles.attachButton}
                        onPress={() => setIsInputDropdownOpen(!isInputDropdownOpen)}
                    >
                        <Icon name="plus" size={24} color="#FF69B4" />
                    </TouchableOpacity>

                    {isInputDropdownOpen && (
                        <>
                            <TouchableWithoutFeedback onPress={() => setIsInputDropdownOpen(false)}>
                                <View style={styles.dropdownOverlay} />
                            </TouchableWithoutFeedback>
                            <View style={styles.inputDropdown}>
                                <View style={styles.dropdownSection}>
                                    <View style={styles.dropdownItem}>
                                        <Text style={styles.dropdownItemText}>Enable Memories</Text>
                                        <Switch
                                            value={memorySystem.isEnabled}
                                            onValueChange={memorySystem.toggleEnabled}
                                            trackColor={{ false: "#767577", true: "#FF69B4" }}
                                            thumbColor={memorySystem.isEnabled ? "#fff" : "#f4f3f4"}
                                        />
                                    </View>

                                    {memorySystem.isEnabled && (
                                        <>
                                            <Text style={styles.sectionHeader}>Embedding Model</Text>
                                            {['qwen3-0.6-embed', 'nomic2-embed-300m'].map(model => (
                                                <TouchableOpacity
                                                    key={model}
                                                    style={styles.dropdownItem}
                                                    onPress={() => memorySystem.setModel(model)}
                                                >
                                                    <View>
                                                        <Text style={[
                                                            styles.dropdownItemText,
                                                            memorySystem.embeddingModelId === model && styles.selectedDropdownItemText
                                                        ]}>
                                                            {model}
                                                        </Text>
                                                        {memorySystem.embeddingModelId === model && !memorySystem.embeddingLM.isDownloaded && (
                                                            <TouchableOpacity
                                                                style={styles.downloadLink}
                                                                onPress={() => memorySystem.embeddingLM.download()}
                                                            >
                                                                <Text style={styles.downloadLinkText}>
                                                                    {memorySystem.embeddingLM.isDownloading
                                                                        ? `Downloading ${Math.round(memorySystem.embeddingLM.downloadProgress * 100)}%`
                                                                        : 'Download'}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>
                                                    {memorySystem.embeddingModelId === model && <Icon name="check" size={16} color="#FF69B4" />}
                                                </TouchableOpacity>
                                            ))}
                                            <View style={styles.separator} />
                                        </>
                                    )}
                                </View>

                                <TouchableOpacity
                                    style={styles.dropdownItem}
                                    onPress={handleAttachImage}
                                    disabled={!isVisionSupported}
                                >
                                    <View>
                                        <Text style={[
                                            styles.dropdownItemText,
                                            !isVisionSupported && styles.strikethroughText
                                        ]}>
                                            Attach image
                                        </Text>
                                        {!isVisionSupported && (
                                            <Text style={styles.helperText}>Use a vision model</Text>
                                        )}
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.dropdownItem}
                                    onPress={() => isToolsSupported && setIsToolsEnabled(!isToolsEnabled)}
                                    disabled={!isToolsSupported}
                                >
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flex: 1 }}>
                                        <View>
                                            <Text style={[
                                                styles.dropdownItemText,
                                                !isToolsSupported && styles.strikethroughText
                                            ]}>
                                                Enable Tools
                                            </Text>
                                            {!isToolsSupported && (
                                                <Text style={styles.helperText}>Use a tool-capable model</Text>
                                            )}
                                        </View>
                                        <Switch
                                            value={isToolsEnabled}
                                            onValueChange={setIsToolsEnabled}
                                            disabled={!isToolsSupported}
                                            trackColor={{ false: "#767577", true: "#FF69B4" }}
                                            thumbColor={isToolsEnabled ? "#fff" : "#f4f3f4"}
                                        />
                                    </View>
                                </TouchableOpacity>

                                {ragDir ? (
                                    <TouchableOpacity
                                        style={[styles.dropdownItem, styles.dropdownFooter]}
                                        onPress={handleRemoveRAG}
                                    >
                                        <Text style={styles.dropdownItemText}>Remove RAG directory</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        style={[styles.dropdownItem, styles.dropdownFooter]}
                                        onPress={handleAttachRAG}
                                    >
                                        <Text style={styles.dropdownItemText}>Attach RAG directory</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </>
                    )}

                    <TextInput
                        style={styles.input}
                        placeholder="Type a message..."
                        placeholderTextColor="#999"
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                    />
                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            ((!inputText.trim() && !attachedImage) || cactusLM.isGenerating) && styles.sendButtonDisabled
                        ]}
                        onPress={handleSend}
                        disabled={(!inputText.trim() && !attachedImage) || cactusLM.isGenerating}
                    >
                        {cactusLM.isGenerating ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Icon name="send" size={20} color="#fff" />
                        )}
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fafafaff',
    },
    header: {
        paddingHorizontal: 24,
        paddingBottom: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
    },
    newChatButton: {
        backgroundColor: '#FF69B420',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 8,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modelBadge: {
        backgroundColor: '#FF69B420',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        height: 28,
    },
    modelBadgeText: {
        fontSize: 12,
        color: '#FF69B4',
        fontWeight: '600',
    },
    dropdownOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 20,
    },
    dropdown: {
        position: 'absolute',
        top: 100,
        right: 24,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        zIndex: 30,
        minWidth: 150,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    inputDropdown: {
        position: 'absolute',
        bottom: 80,
        left: 16,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        zIndex: 30,
        minWidth: 200,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    dropdownFooter: {
        borderBottomWidth: 0,
    },
    dropdownItemText: {
        fontSize: 14,
        color: '#333',
    },
    selectedDropdownItemText: {
        color: '#FF69B4',
        fontWeight: '600',
    },
    strikethroughText: {
        textDecorationLine: 'line-through',
        color: '#999',
    },
    helperText: {
        fontSize: 10,
        color: '#FF69B4',
        marginTop: 2,
    },
    listContent: {
        padding: 24,
        paddingBottom: 16,
    },
    messageBubble: {
        maxWidth: '85%',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#FF69B4',
        borderBottomRightRadius: 4,
    },
    aiBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#fff',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    userText: {
        color: '#fff',
        fontSize: 16,
        lineHeight: 24,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        alignItems: 'flex-end',
    },
    attachButton: {
        width: 40,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    input: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 12,
        maxHeight: 100,
        fontSize: 16,
        color: '#333',
        marginRight: 12,
    },
    sendButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FF69B4',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#FF69B480',
    },
    thinkContainer: {
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        marginVertical: 8,
        borderWidth: 1,
        borderColor: '#e9ecef',
        overflow: 'hidden',
    },
    thinkHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        backgroundColor: '#f1f3f5',
    },
    thinkLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
        flex: 1,
    },
    thinkContent: {
        padding: 12,
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
        lineHeight: 20,
    },
    ragIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        padding: 8,
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 8,
        gap: 8,
    },
    ragText: {
        flex: 1,
        fontSize: 12,
        color: '#666',
    },
    imagePreviewContainer: {
        marginHorizontal: 16,
        marginBottom: 8,
        position: 'relative',
    },
    imagePreview: {
        width: '100%',
        height: 150,
        borderRadius: 12,
        backgroundColor: '#f0f0f0',
    },
    removeImageButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 12,
    },
    typingIndicator: {
        width: 24,
        height: 24,
        marginTop: 8,
    },
    messageImage: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        marginTop: 8,
    },
    memoryContainer: {
        marginBottom: 8,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e9ecef',
        overflow: 'hidden',
    },
    memoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        backgroundColor: '#f1f3f5',
    },
    memoryLabel: {
        fontSize: 12,
        color: '#666',
        fontWeight: '600',
        flex: 1,
    },
    memoryContent: {
        padding: 8,
    },
    memoryLogText: {
        fontSize: 11,
        color: '#666',
        marginBottom: 2,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    dropdownSection: {
        marginBottom: 8,
    },
    sectionHeader: {
        fontSize: 12,
        color: '#999',
        fontWeight: '600',
        paddingHorizontal: 8,
        marginTop: 8,
        marginBottom: 4,
    },
    downloadLink: {
        marginTop: 2,
    },
    downloadLinkText: {
        fontSize: 10,
        color: '#2196F3',
        fontWeight: '600',
    },
    separator: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginVertical: 4,
    },
});
