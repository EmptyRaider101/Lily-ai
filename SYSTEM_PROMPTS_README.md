# System Prompts Implementation

## Overview
Added comprehensive system prompts for different AI model types to provide context-aware instructions to the AI based on its capabilities.

## What Was Added

### 1. New File: `src/utils/systemPrompts.ts`
This file contains:
- **Four distinct system prompts** tailored for different model capabilities:
  - `TOOL_MODEL`: For models with tool calling capabilities
  - `VISION_MODEL`: For models with vision/image analysis capabilities
  - `NORMAL_MODEL`: For standard text-only models
  - `TOOL_VISION_MODEL`: For models with both tool calling AND vision capabilities

- **Helper function**: `getSystemPrompt(supportsTools, supportsVision)`
  - Automatically selects the appropriate prompt based on model capabilities
  - Returns the most suitable system prompt for the current model

### 2. Updated: `src/screens/ChatScreen.tsx`
- **Imported** the `getSystemPrompt` utility
- **Modified** the `handleSend` function to:
  - Detect model capabilities (tools and vision support)
  - Generate the appropriate system prompt
  - Inject the system prompt as the first message in the conversation context
  - Log model capabilities for debugging

## System Prompt Features

Each system prompt includes:
- **Identity**: Introduces the AI as "Lily"
- **Capabilities**: Lists what the model can do based on its features
- **Personality**: Defines a warm, friendly, and helpful tone
- **Guidelines**: Provides specific instructions for behavior
- **Best Practices**: Offers model-specific guidance

### Tool Model Prompt
- Explains tool usage capabilities
- Encourages proactive tool suggestions
- Emphasizes explaining actions before and after tool use
- Prioritizes user safety and privacy

### Vision Model Prompt
- Highlights image analysis capabilities
- Provides guidelines for describing visual content
- Emphasizes accuracy and thoroughness
- Respects privacy in image analysis

### Normal Model Prompt
- Focuses on conversational abilities
- Emphasizes helpfulness and clarity
- Encourages asking clarifying questions
- Promotes concise but thorough responses

### Tool + Vision Model Prompt
- Combines capabilities of both tool and vision models
- Encourages creative workflows combining both features
- Maintains all guidelines from both specialized prompts

## How It Works

1. When a user sends a message, the chat screen checks the current model's capabilities
2. Based on `supportsTools` and `supportsVision` flags, the appropriate system prompt is selected
3. The system prompt is injected as the first message (role: 'system') in the conversation context
4. The AI receives this context and behaves according to the instructions in the prompt

## Benefits

- **Context-Aware**: AI knows exactly what it can and cannot do
- **Consistent Personality**: Lily maintains a friendly, helpful persona across all model types
- **Better User Experience**: AI provides more relevant and appropriate responses
- **Easier Debugging**: Console logs show which capabilities are detected
- **Maintainable**: Prompts are centralized and easy to update

## Example Usage

```typescript
// Automatically used in ChatScreen when sending messages
const systemPrompt = getSystemPrompt(supportsTools, supportsVision);

// The prompt is then added to the message context
const contextMessages = [
    { role: 'system', content: systemPrompt },
    ...previousMessages,
    currentUserMessage
];
```

## Future Enhancements

Potential improvements:
- Add user-customizable personality settings
- Create specialized prompts for specific use cases
- Allow users to view/edit the system prompt
- Add prompt templates for different scenarios
- Implement prompt versioning for A/B testing
