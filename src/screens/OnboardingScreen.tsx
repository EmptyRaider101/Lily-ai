import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { RootStackParamList } from '../navigation/types';

type OnboardingScreenProps = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
};

export default function OnboardingScreen({ navigation }: OnboardingScreenProps) {
    const [name, setName] = useState('');

    const handlePress = async () => {
        if (!name.trim()) return;
        try {
            await AsyncStorage.setItem('userName', name.trim());
            navigation.replace('Main');
        } catch (e) {
            console.error('Failed to save name', e);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboard}
            >
                {/* Centered content */}
                <View style={styles.wrapper}>
                    <View style={styles.mainContainer}>
                        <Text style={styles.questionText}>What should Lily call you?</Text>
                        <Image
                            source={require('../media/lily_logo.png')}
                            style={styles.icon}
                        />
                    </View>

                    {/* Input with circular button */}
                    <View style={styles.inputContainer}>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                placeholder="Type your name..."
                                placeholderTextColor="#999"
                                value={name}
                                onChangeText={setName}
                                autoFocus
                            />
                            <TouchableOpacity style={styles.arrowButton} onPress={handlePress}>
                                <Icon name="arrow-right" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fafafaff',
    },
    keyboard: {
        flex: 1,
        paddingHorizontal: 32,
        paddingBottom: 20,
    },
    wrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mainContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    icon: {
        marginTop: 12,
        width: 120,
        height: 120,
        resizeMode: 'contain',
    },
    questionText: {
        fontSize: 24,
        fontWeight: '500',
        color: '#000000ff',
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    inputContainer: {
        width: '100%',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffffff',
        borderRadius: 30,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    input: {
        flex: 1,
        fontSize: 18,
        fontWeight: '400',
        color: '#000000',
    },
    arrowButton: {
        backgroundColor: '#FF69B4',
        borderRadius: 20,
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
});
