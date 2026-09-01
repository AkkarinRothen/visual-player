package com.akkarinrothen.visualplayer;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "VisualPlayerKeystore")
public class VisualPlayerKeystorePlugin extends Plugin {

    private static final String PREF_FILE_NAME = "vp_encrypted_secure_keystore";
    private SharedPreferences securePrefs;

    @Override
    public void load() {
        super.load();
        try {
            Context context = getContext();
            MasterKey masterKey = new MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build();

            securePrefs = EncryptedSharedPreferences.create(
                context,
                PREF_FILE_NAME,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            );
        } catch (Exception e) {
            // Fallback to standard private mode if keystore hardware fails on emulator
            securePrefs = getContext().getSharedPreferences(PREF_FILE_NAME, Context.MODE_PRIVATE);
        }
    }

    @PluginMethod
    public void get(PluginCall call) {
        String key = call.getString("key");
        if (key == null) {
            call.reject("Key is required");
            return;
        }

        String value = securePrefs != null ? securePrefs.getString(key, null) : null;
        JSObject ret = new JSObject();
        ret.put("value", value);
        call.resolve(ret);
    }

    @PluginMethod
    public void set(PluginCall call) {
        String key = call.getString("key");
        String value = call.getString("value");
        if (key == null || value == null) {
            call.reject("Key and value are required");
            return;
        }

        if (securePrefs != null) {
            securePrefs.edit().putString(key, value).apply();
        }
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void remove(PluginCall call) {
        String key = call.getString("key");
        if (key == null) {
            call.reject("Key is required");
            return;
        }

        if (securePrefs != null) {
            securePrefs.edit().remove(key).apply();
        }
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }
}
