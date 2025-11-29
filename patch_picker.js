const fs = require('fs');
const path = 'node_modules/react-native-document-picker/android/src/main/java/com/reactnativedocumentpicker/RNDocumentPickerModule.java';
try {
    let content = fs.readFileSync(path, 'utf8');

    content = content.replace('import com.facebook.react.bridge.GuardedResultAsyncTask;', 'import android.os.AsyncTask;');
    content = content.replace('extends GuardedResultAsyncTask<ReadableArray>', 'extends AsyncTask<Void, Void, ReadableArray>');
    content = content.replace('super(reactContext.getExceptionHandler());', '// super(reactContext.getExceptionHandler());');
    content = content.replace('protected ReadableArray doInBackgroundGuarded()', 'protected ReadableArray doInBackground(Void... params)');

    fs.writeFileSync(path, content);
    console.log('Patched RNDocumentPickerModule.java');
} catch (e) {
    console.error('Failed to patch', e);
}
