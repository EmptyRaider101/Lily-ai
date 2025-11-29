import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type AlertButton = {
    text: string;
    style?: 'default' | 'cancel' | 'destructive';
    onPress?: () => void | Promise<void>;
};

type AlertOptions = {
    cancelable?: boolean;
};

type AlertContextType = {
    showAlert: (title: string, message?: string, buttons?: AlertButton[], options?: AlertOptions) => void;
    hideAlert: () => void;
};

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
};

export const AlertProvider = ({ children }: { children: ReactNode }) => {
    const [visible, setVisible] = useState(false);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState<string | undefined>('');
    const [buttons, setButtons] = useState<AlertButton[]>([]);
    const [fadeAnim] = useState(new Animated.Value(0));
    const [scaleAnim] = useState(new Animated.Value(0.9));

    const showAlert = useCallback((t: string, m?: string, b: AlertButton[] = [], opts?: AlertOptions) => {
        setTitle(t);
        setMessage(m);
        setButtons(b.length > 0 ? b : [{ text: 'OK', style: 'default', onPress: () => { } }]);
        setVisible(true);

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 7,
                tension: 40,
                useNativeDriver: true,
            })
        ]).start();
    }, []);

    const hideAlert = useCallback(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 0.9,
                duration: 150,
                useNativeDriver: true,
            })
        ]).start(() => {
            setVisible(false);
        });
    }, []);

    const handleButtonPress = async (btn: AlertButton) => {
        if (btn.onPress) {
            await btn.onPress();
        }
        hideAlert();
    };

    return (
        <AlertContext.Provider value={{ showAlert, hideAlert }}>
            {children}
            {visible && (
                <View style={styles.overlay} pointerEvents="box-none">
                    <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
                    <Animated.View
                        style={[
                            styles.alertContainer,
                            {
                                opacity: fadeAnim,
                                transform: [{ scale: scaleAnim }]
                            }
                        ]}
                    >
                        <View style={styles.contentContainer}>
                            <Text style={styles.title}>{title}</Text>
                            {message ? <Text style={styles.message}>{message}</Text> : null}
                        </View>

                        <View style={[
                            styles.buttonContainer,
                            buttons.length > 2 ? styles.verticalButtons : styles.horizontalButtons
                        ]}>
                            {buttons.map((btn, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.button,
                                        buttons.length > 2 ? styles.buttonFull : styles.buttonFlex,
                                        btn.style === 'destructive' && styles.destructiveButton,
                                        btn.style === 'cancel' && styles.cancelButton,
                                        // Add separator border if horizontal and not last
                                        buttons.length <= 2 && index < buttons.length - 1 && styles.buttonBorderRight
                                    ]}
                                    onPress={() => handleButtonPress(btn)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[
                                        styles.buttonText,
                                        btn.style === 'destructive' && styles.destructiveText,
                                        btn.style === 'cancel' && styles.cancelText,
                                    ]}>
                                        {btn.text}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Animated.View>
                </View>
            )}
        </AlertContext.Provider>
    );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1000,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 1000,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    alertContainer: {
        width: width * 0.85,
        maxWidth: 340,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    contentContainer: {
        padding: 24,
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        fontSize: 14,
        color: '#333',
        textAlign: 'center',
        lineHeight: 20,
    },
    buttonContainer: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.1)',
        backgroundColor: 'rgba(255,255,255,0.5)',
    },
    horizontalButtons: {
        flexDirection: 'row',
    },
    verticalButtons: {
        flexDirection: 'column',
    },
    button: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonFlex: {
        flex: 1,
    },
    buttonFull: {
        width: '100%',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    buttonBorderRight: {
        borderRightWidth: 1,
        borderRightColor: 'rgba(0,0,0,0.1)',
    },
    buttonText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#007AFF', // iOS blue
    },
    destructiveButton: {
        // backgroundColor: '#FFEBEE',
    },
    destructiveText: {
        color: '#FF3B30', // iOS red
    },
    cancelButton: {
        // backgroundColor: '#f9f9f9',
    },
    cancelText: {
        fontWeight: '400',
        color: '#666',
    },
});
