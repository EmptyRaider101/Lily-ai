# LilyAI

LilyAI is a privacy-focused, local-first AI assistant built with React Native. It combines the power of on-device language models with the flexibility of cloud-based inference, wrapped in a beautiful, user-friendly interface.

## How to Use

To get started with LilyAI on your Android device:

1.  Go to the **Releases** section of this repository.
2.  Download the latest `.apk` file.
3.  Install the APK on your Android device. You may need to enable installation from unknown sources in your device settings.
4.  Launch the app and complete the onboarding process.

## Features

### Dual Inference Engine
*   **Local Intelligence**: Run small language models directly on your device for complete privacy and offline capability. Powered by Cactus.
*   **Cloud Power**: Seamlessly switch to cloud-based models via OpenRouter. Bring Your Own Key (BYOK) support allows you to access top-tier models like GPT-4, Claude 3, and Llama 3.

### Smart Memory System
*   **Long-term Memory**: LilyAI remembers details from your conversations using a local RAG (Retrieval-Augmented Generation) system.
*   **Context Awareness**: Relevant memories are automatically retrieved to provide context-aware responses.
*   **Memory Management**: View and manage stored memories directly from the app.

### Rich Chat Experience
*   **Markdown Support**: Full rendering support for Markdown, including tables, lists, and code blocks.
*   **Code Highlighting**: Syntax highlighting for code snippets.
*   **Image Analysis**: Support for multimodal interactions (Vision) with compatible models.
*   **Streaming Responses**: Real-time text generation for both local and cloud models.

### Dashboard & Analytics
*   **Usage Tracking**: Monitor your interaction stats, including total chats, messages, and characters generated.
*   **Visual Analytics**: Interactive graphs showing usage trends over time.
*   **Storage Management**: Keep track of local storage usage for models and chat history.

### User Control
*   **Data Privacy**: All chat history and memories are stored locally on your device.
*   **Data Management**: Easy tools to export, clear, or reset your application data.
*   **Customization**: Personalize your profile and app settings.

## Technical Breakdown

### Architecture
*   **Framework**: React Native (Bare Workflow)
*   **Language**: TypeScript
*   **Navigation**: React Navigation (Stack & Drawer)
*   **State Management**: React Context & Hooks
*   **Local Storage**: AsyncStorage & File System

### Core Technologies
*   **Local Inference**: `cactus-react-native` for running GGUF models on-device.
*   **Cloud Inference**: Custom HTTP client implementation for OpenRouter API with streaming support.
*   **Vector Store**: Local embedding generation and similarity search for the memory system.
*   **UI Components**: Custom-built design system using vanilla React Native stylesheets for maximum performance and control.

### Key Components
*   **ChatService**: Manages conversation history, message persistence, and context windowing.
*   **MemoryService**: Handles text embedding, storage, and semantic retrieval.
*   **CloudService**: Interfaces with OpenRouter API for cloud model enumeration and inference.
*   **AlertContext**: A custom, unified modal system replacing native alerts for a consistent UI.

### Security
*   **API Keys**: Cloud API keys are stored securely in local storage and never transmitted to our servers.
*   **Local Data**: User data (chats, memories) never leaves the device unless explicitly sent to a cloud model for inference.

---

Created by Rayhaan & Amaan
