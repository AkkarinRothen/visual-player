package com.akkarinrothen.visualplayer;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyInfo;
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
import java.security.ProviderException;
import java.security.UnrecoverableKeyException;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "VisualPlayerKeystore")
public class VisualPlayerKeystorePlugin extends Plugin {

    private static final String ANDROID_KEYSTORE = "AndroidKeyStore";
    private static final String MASTER_KEY_ALIAS = "vp_keystore_v1_aes";
    private static final String PREF_FILE_NAME = "vp_secure_keystore_v1";
    private static final int GCM_IV_LENGTH_BYTES = 12;
    private static final int GCM_TAG_LENGTH_BITS = 128;
    private static final int MAX_KEY_LENGTH = 128;
    private static final int MAX_VALUE_LENGTH_BYTES = 65536; // 64 KB limit

    private SharedPreferences storagePrefs;

    @Override
    public void load() {
        super.load();
        storagePrefs = getContext().getSharedPreferences(PREF_FILE_NAME, Context.MODE_PRIVATE);
        try {
            ensureMasterKey();
        } catch (Exception ignored) {
        }
    }

    private synchronized SecretKey ensureMasterKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
        keyStore.load(null);

        if (keyStore.containsAlias(MASTER_KEY_ALIAS)) {
            return (SecretKey) keyStore.getKey(MASTER_KEY_ALIAS, null);
        }

        // 1. Attempt generation with StrongBox on API 28+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            try {
                return generateKeySpec(true);
            } catch (Exception e) {
                // Fallback to standard TEE if StrongBox is unavailable on device
            }
        }

        // 2. Standard Hardware-backed TEE / Software fallback
        return generateKeySpec(false);
    }

    private SecretKey generateKeySpec(boolean useStrongBox) throws Exception {
        KeyGenerator keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE);

        KeyGenParameterSpec.Builder builder = new KeyGenParameterSpec.Builder(
            MASTER_KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .setRandomizedEncryptionRequired(true); // Cipher manages fresh IVs

        if (useStrongBox && Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            builder.setIsStrongBoxBacked(true);
        }

        keyGenerator.init(builder.build());
        return keyGenerator.generateKey();
    }

    private synchronized void purgeAndRegenerateKey() {
        try {
            KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
            keyStore.load(null);
            if (keyStore.containsAlias(MASTER_KEY_ALIAS)) {
                keyStore.deleteEntry(MASTER_KEY_ALIAS);
            }
            if (storagePrefs != null) {
                storagePrefs.edit().clear().commit();
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
    public void getSecurityInfo(PluginCall call) {
        getBridge().execute(() -> {
            try {
                SecretKey key = ensureMasterKey();
                SecretKeyFactory factory = SecretKeyFactory.getInstance(key.getAlgorithm(), ANDROID_KEYSTORE);
                KeyInfo keyInfo = (KeyInfo) factory.getKeySpec(key, KeyInfo.class);

                boolean isInsideSecureHardware;
                String securityLevel = "SOFTWARE";

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    int level = keyInfo.getSecurityLevel();
                    isInsideSecureHardware = level == KeyProperties.SECURITY_LEVEL_STRONGBOX
                        || level == KeyProperties.SECURITY_LEVEL_TRUSTED_ENVIRONMENT;
                    if (level == KeyProperties.SECURITY_LEVEL_STRONGBOX) {
                        securityLevel = "STRONGBOX";
                    } else if (level == KeyProperties.SECURITY_LEVEL_TRUSTED_ENVIRONMENT) {
                        securityLevel = "TEE";
                    }
                } else {
                    // isInsideSecureHardware() is deprecated on newer SDKs, so invoke
                    // the legacy API reflectively only on Android versions that need it.
                    try {
                        Object result = KeyInfo.class
                            .getMethod("isInsideSecureHardware")
                            .invoke(keyInfo);
                        isInsideSecureHardware = Boolean.TRUE.equals(result);
                    } catch (Exception ignored) {
                        isInsideSecureHardware = false;
                    }
                    if (isInsideSecureHardware) {
                        securityLevel = "TEE";
                    }
                }

                JSObject ret = new JSObject();
                ret.put("isHardwareBacked", isInsideSecureHardware);
                ret.put("securityLevel", securityLevel);
                ret.put("keyAlias", MASTER_KEY_ALIAS);
                call.resolve(ret);

            } catch (Exception e) {
                JSObject ret = new JSObject();
                ret.put("isHardwareBacked", false);
                ret.put("securityLevel", "SOFTWARE");
                ret.put("keyAlias", MASTER_KEY_ALIAS);
                call.resolve(ret);
            }
        });
    }

    @PluginMethod
    public void get(PluginCall call) {
        String key = call.getString("key");
        if (key == null || key.isEmpty() || key.length() > MAX_KEY_LENGTH) {
            call.reject("INVALID_ARGUMENT", "Key is invalid or exceeds maximum length");
            return;
        }

        getBridge().execute(() -> {
            String rawEnvelope = storagePrefs.getString(key, null);
            if (rawEnvelope == null) {
                JSObject ret = new JSObject();
                ret.put("value", null);
                call.resolve(ret);
                return;
            }

            try {
                JSONObject envelope = new JSONObject(rawEnvelope);
                int version = envelope.optInt("v", 0);
                String alg = envelope.optString("alg", "");
                String ivB64 = envelope.optString("iv", "");
                String ctB64 = envelope.optString("ct", "");

                // Strict Envelope Validation
                if (version != 1 || !"AES_GCM_256".equals(alg) || ivB64.isEmpty() || ctB64.isEmpty()) {
                    storagePrefs.edit().remove(key).commit();
                    call.reject("MALFORMED_ENVELOPE", "Corrupted or unsupported envelope format");
                    return;
                }

                byte[] iv = Base64.decode(ivB64, Base64.NO_WRAP);
                byte[] ciphertext = Base64.decode(ctB64, Base64.NO_WRAP);

                if (iv.length != GCM_IV_LENGTH_BYTES || ciphertext.length < 16) {
                    storagePrefs.edit().remove(key).commit();
                    call.reject("MALFORMED_ENVELOPE", "Invalid IV or ciphertext length");
                    return;
                }

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
                storagePrefs.edit().remove(key).commit();
                call.reject("DECRYPTION_FAILED", "Decryption failed or data altered");
            }
        });
    }

    @PluginMethod
    public void set(PluginCall call) {
        String key = call.getString("key");
        String value = call.getString("value");

        if (key == null || key.isEmpty() || key.length() > MAX_KEY_LENGTH) {
            call.reject("INVALID_ARGUMENT", "Key is invalid or exceeds maximum length");
            return;
        }

        if (value == null || value.getBytes(StandardCharsets.UTF_8).length > MAX_VALUE_LENGTH_BYTES) {
            call.reject("INVALID_ARGUMENT", "Value exceeds maximum allowed length of 64KB");
            return;
        }

        getBridge().execute(() -> {
            try {
                SecretKey secretKey = ensureMasterKey();
                Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
                cipher.init(Cipher.ENCRYPT_MODE, secretKey);
                cipher.updateAAD(getAAD(key));

                byte[] iv = cipher.getIV();
                if (iv == null || iv.length != GCM_IV_LENGTH_BYTES) {
                    call.reject("ENCRYPTION_FAILED", "Cipher failed to generate a valid IV");
                    return;
                }

                byte[] plaintextBytes = value.getBytes(StandardCharsets.UTF_8);
                byte[] ciphertext = cipher.doFinal(plaintextBytes);

                JSONObject envelope = new JSONObject();
                envelope.put("v", 1);
                envelope.put("alg", "AES_GCM_256");
                envelope.put("iv", Base64.encodeToString(iv, Base64.NO_WRAP));
                envelope.put("ct", Base64.encodeToString(ciphertext, Base64.NO_WRAP));

                // Durable confirmed write on background thread
                boolean committed = storagePrefs.edit().putString(key, envelope.toString()).commit();
                if (!committed) {
                    call.reject("STORAGE_ERROR", "Failed to commit record to durable storage");
                    return;
                }

                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);

            } catch (KeyPermanentlyInvalidatedException | UnrecoverableKeyException e) {
                purgeAndRegenerateKey();
                call.reject("KEY_INVALIDATED", "Keystore credentials invalidated. Please retry.");
            } catch (Exception e) {
                call.reject("ENCRYPTION_FAILED", "Failed to encrypt entry");
            }
        });
    }

    @PluginMethod
    public void remove(PluginCall call) {
        String key = call.getString("key");
        if (key == null || key.isEmpty()) {
            call.reject("INVALID_ARGUMENT", "Key is required");
            return;
        }

        getBridge().execute(() -> {
            boolean committed = storagePrefs.edit().remove(key).commit();
            JSObject ret = new JSObject();
            ret.put("success", committed);
            call.resolve(ret);
        });
    }
}
