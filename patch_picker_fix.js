const fs = require('fs');
const path = 'node_modules/react-native-document-picker/android/src/main/java/com/reactnativedocumentpicker/RNDocumentPickerModule.java';
try {
    let content = fs.readFileSync(path, 'utf8');

    // Fix onPostExecuteGuarded -> onPostExecute
    if (content.includes('onPostExecuteGuarded')) {
        content = content.replace('protected void onPostExecuteGuarded', 'protected void onPostExecute');
        console.log('Replaced onPostExecuteGuarded');
    } else {
        console.log('onPostExecuteGuarded not found (already patched?)');
    }

    fs.writeFileSync(path, content);
    console.log('Patched RNDocumentPickerModule.java');
} catch (e) {
    console.error('Failed to patch', e);
}
