import { Vibration, Platform } from 'react-native';

export interface VibrationParams {
    duration?: number;
    pattern?: 'single' | 'double' | 'triple' | 'custom';
    intensity?: 'light' | 'medium' | 'strong';
}

export const executeVibration = (params: VibrationParams) => {
    const {
        duration = 400,
        pattern = 'single',
        intensity = 'medium'
    } = params;

    // Intensity multiplier
    const intensityMultiplier = {
        light: 0.5,
        medium: 1.0,
        strong: 1.5
    }[intensity];

    const baseDuration = duration * intensityMultiplier;

    // Pattern definitions
    const patterns = {
        single: [baseDuration],
        double: [baseDuration, 100, baseDuration],
        triple: [baseDuration, 100, baseDuration, 100, baseDuration],
        custom: [baseDuration, 200, baseDuration * 0.5, 200, baseDuration]
    };

    const vibrationPattern = patterns[pattern];

    if (Platform.OS === 'android') {
        // Android supports patterns
        Vibration.vibrate(vibrationPattern);
    } else {
        // iOS doesn't support patterns, just vibrate for the total duration
        const totalDuration = vibrationPattern.reduce((sum, val) => sum + val, 0);
        Vibration.vibrate(totalDuration);
    }
};
