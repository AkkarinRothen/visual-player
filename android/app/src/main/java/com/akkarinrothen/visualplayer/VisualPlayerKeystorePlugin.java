package com.akkarinrothen.visualplayer;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyPermanentlyInvalidatedException;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONObject;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.SecureRandom;
import java.security.UnrecoverableKeyException;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "VisualPlayerKeystore")
public class VisualPlayerKeystorePlugin extends Plugin {

    private static final String ANDROID_KEYSTORE = "AndroidKeyStore";
    private static final String MASTER_KEY_ALIAS = "vp_keystore_v1_aes";
    private static final String PREF_FILE_NAME = "vp_secure_keystore_v1";
    private static final int GCM_IV_LENGTH_BYTES = 12;
    private static final int GCM_TAG_LENGTH_BITS = 128;

    private SharedPreferences storagePrefs;
    private final SecureRandom secureRandom = new SecureRandom();

    @Override
    public void load() {
        super.load();
        storagePrefs = getContext().getSharedPreferences(PREF_FILE_NAME, Context.MODE_PRIVATE);
        try {
            ensureMasterKey();
        } catch (Exception e) {
            // Key will be generated upon first write attempt
        }
    }

    private synchronized SecretKey ensureMasterKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
        keyStore.load(null);

        if (!keyStore.containsAlias(MASTER_KEY_ALIAS)) {
            KeyGenerator keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE);
            KeyGenParameterSpec spec = new KeyGenParameterSpec.Builder(
                MASTER_KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .setRandomizedEncryptionRequired(false) // We manage unique 12-byte IVs explicitly
                .build();

            keyGenerator.init(spec);
            return keyGenerator.generateKey();
        }

        return (SecretKey) keyStore.getKey(MASTER_KEY_ALIAS, null);
    }

    private synchronized void purgeAndRegenerateKey() {
        try {
            KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
            keyStore.load(null);
            if (keyStore.containsAlias(MASTER_KEY_ALIAS)) {
                keyStore.deleteEntry(MASTER_KEY_ALIAS);
            }
            if (storagePrefs != null) {
                storagePrefs.edit().clear().apply();
            }
            ensureMasterKey();
        } catch (Exception ignored) {
        }
    }

    private byte[] getAAD(String key) {
        String aad = getContext().getPackageName() + ":" + key;
        return aad.getBytes(StandardCharsets.UTF_8);
    }

    @PluginMethod
    public void get(PluginCall call) {
        String key = call.getString("key");
        if (key == null) {
            call.reject("Key is required");
            return;
        }

        String rawEnvelope = storagePrefs.getString(key, null);
        if (rawEnvelope == null) {
            JSObject ret = new JSObject();
            ret.put("value", null);
            call.resolve(ret);
            return;
        }

        try {
            JSONObject envelope = new JSONObject(rawEnvelope);
            String ivB64 = envelope.getString("iv");
            String ctB64 = envelope.getString("ct");

            byte[] iv = Base64.decode(ivB64, Base64.NO_WRAP);
            byte[] ciphertext = Base64.decode(ctB64, Base64.NO_WRAP);

            SecretKey secretKey = ensureMasterKey();
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));
            cipher.updateAAD(getAAD(key));

            byte[] plaintextBytes = cipher.doFinal(ciphertext);
            String value = new String(plaintextBytes, StandardCharsets.UTF_8);

            JSObject ret = new JSObject();
            ret.put("value", value);
            call.resolve(ret);

        } catch (KeyPermanentlyInvalidatedException | UnrecoverableKeyException e) {
            purgeAndRegenerateKey();
            call.reject("KEY_INVALIDATED", "Keystore credentials invalidated. Session cleared.");
        } catch (Exception e) {
            // Tampered data, wrong tag, or decryption failure: fail closed
            storagePrefs.edit().remove(key).apply();
            call.reject("DECRYPTION_FAILED", "Failed to decrypt secure entry: " + e.getMessage());
        }
    }

    @PluginMethod
    public void set(PluginCall call) {
        String key = call.getString("key");
        String value = call.getString("value");
        if (key == null || value == null) {
            call.reject("Key and value are required");
            return;
        }

        try {
            SecretKey secretKey = ensureMasterKey();
            byte[] iv = new byte[GCM_IV_LENGTH_BYTES];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));
            cipher.updateAAD(getAAD(key));

            byte[] plaintextBytes = value.getBytes(StandardCharsets.UTF_8);
            byte[] ciphertext = cipher.doFinal(plaintextBytes);

            JSONObject envelope = new JSONObject();
            envelope.put("v", 1);
            envelope.put("alg", "AES_GCM_256");
            envelope.put("iv", Base64.encodeToString(iv, Base64.NO_WRAP));
            envelope.put("ct", Base64.encodeToString(ciphertext, Base64.NO_WRAP));

            storagePrefs.edit().putString(key, envelope.toString()).apply();

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);

        } catch (KeyPermanentlyInvalidatedException | UnrecoverableKeyException e) {
            purgeAndRegenerateKey();
            call.reject("KEY_INVALIDATED", "Keystore credentials invalidated. Please retry.");
        } catch (Exception e) {
            call.reject("ENCRYPTION_FAILED", "Failed to encrypt entry: " + e.getMessage());
        }
    }

    @PluginMethod
    public void remove(PluginCall call) {
        String key = call.getString("key");
        if (key == null) {
            call.reject("Key is required");
            return;
        }

        storagePrefs.edit().remove(key).apply();
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }
}
