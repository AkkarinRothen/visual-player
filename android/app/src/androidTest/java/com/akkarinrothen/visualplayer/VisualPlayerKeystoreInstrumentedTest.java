package com.akkarinrothen.visualplayer;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyInfo;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.JSONObject;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import javax.crypto.AEADBadTagException;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;

import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class VisualPlayerKeystoreInstrumentedTest {

    private static final String ANDROID_KEYSTORE = "AndroidKeyStore";
    private static final String TEST_ALIAS = "vp_test_key_aes";
    private static final String PREF_TEST = "vp_test_storage";

    private Context context;
    private SharedPreferences prefs;

    @Before
    public void setUp() throws Exception {
        context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        prefs = context.getSharedPreferences(PREF_TEST, Context.MODE_PRIVATE);
        prefs.edit().clear().commit();
        cleanupKey();
        generateTestKey();
    }

    @After
    public void tearDown() throws Exception {
        if (prefs != null) {
            prefs.edit().clear().commit();
        }
        cleanupKey();
    }

    private void cleanupKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
        keyStore.load(null);
        if (keyStore.containsAlias(TEST_ALIAS)) {
            keyStore.deleteEntry(TEST_ALIAS);
        }
    }

    private SecretKey generateTestKey() throws Exception {
        KeyGenerator keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE);
        KeyGenParameterSpec spec = new KeyGenParameterSpec.Builder(
            TEST_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .setRandomizedEncryptionRequired(true)
            .build();

        keyGenerator.init(spec);
        return keyGenerator.generateKey();
    }

    private SecretKey getTestKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
        keyStore.load(null);
        return (SecretKey) keyStore.getKey(TEST_ALIAS, null);
    }

    @Test
    public void testEndToEndEncryptDecrypt() throws Exception {
        SecretKey key = getTestKey();
        String originalSecret = "vp_jwt_session_token_example_12345";
        String recordKey = "session_token";

        // 1. Encrypt with Cipher-generated IV and AAD
        Cipher encryptCipher = Cipher.getInstance("AES/GCM/NoPadding");
        encryptCipher.init(Cipher.ENCRYPT_MODE, key);
        encryptCipher.updateAAD((context.getPackageName() + ":" + recordKey).getBytes(StandardCharsets.UTF_8));

        byte[] iv = encryptCipher.getIV();
        assertNotNull(iv);
        assertEquals(12, iv.length);

        byte[] ciphertext = encryptCipher.doFinal(originalSecret.getBytes(StandardCharsets.UTF_8));
        assertTrue(ciphertext.length > originalSecret.length());

        // 2. Decrypt and verify AAD
        Cipher decryptCipher = Cipher.getInstance("AES/GCM/NoPadding");
        decryptCipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, iv));
        decryptCipher.updateAAD((context.getPackageName() + ":" + recordKey).getBytes(StandardCharsets.UTF_8));

        byte[] decryptedBytes = decryptCipher.doFinal(ciphertext);
        String decrypted = new String(decryptedBytes, StandardCharsets.UTF_8);

        assertEquals(originalSecret, decrypted);
    }

    @Test
    public void testRandomizedEncryptionProducesUniqueIVs() throws Exception {
        SecretKey key = getTestKey();
        String secret = "constant_value_to_encrypt";

        Cipher c1 = Cipher.getInstance("AES/GCM/NoPadding");
        c1.init(Cipher.ENCRYPT_MODE, key);
        byte[] iv1 = c1.getIV();
        byte[] ct1 = c1.doFinal(secret.getBytes(StandardCharsets.UTF_8));

        Cipher c2 = Cipher.getInstance("AES/GCM/NoPadding");
        c2.init(Cipher.ENCRYPT_MODE, key);
        byte[] iv2 = c2.getIV();
        byte[] ct2 = c2.doFinal(secret.getBytes(StandardCharsets.UTF_8));

        assertFalse(Base64.encodeToString(iv1, Base64.NO_WRAP).equals(Base64.encodeToString(iv2, Base64.NO_WRAP)));
        assertFalse(Base64.encodeToString(ct1, Base64.NO_WRAP).equals(Base64.encodeToString(ct2, Base64.NO_WRAP)));
    }

    @Test
    public void testTamperedCiphertextThrowsAEADBadTagException() throws Exception {
        SecretKey key = getTestKey();
        String secret = "sensitive_token";
        String recordKey = "tamper_test";

        Cipher encryptCipher = Cipher.getInstance("AES/GCM/NoPadding");
        encryptCipher.init(Cipher.ENCRYPT_MODE, key);
        encryptCipher.updateAAD((context.getPackageName() + ":" + recordKey).getBytes(StandardCharsets.UTF_8));

        byte[] iv = encryptCipher.getIV();
        byte[] ciphertext = encryptCipher.doFinal(secret.getBytes(StandardCharsets.UTF_8));

        // Tamper with one byte in the ciphertext payload
        ciphertext[ciphertext.length - 1] ^= 0xFF;

        Cipher decryptCipher = Cipher.getInstance("AES/GCM/NoPadding");
        decryptCipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, iv));
        decryptCipher.updateAAD((context.getPackageName() + ":" + recordKey).getBytes(StandardCharsets.UTF_8));

        try {
            decryptCipher.doFinal(ciphertext);
            fail("Decryption of tampered ciphertext should have thrown AEADBadTagException");
        } catch (AEADBadTagException e) {
            // Expected
            assertTrue(true);
        }
    }

    @Test
    public void testAADMismatchRejectsDecryption() throws Exception {
        SecretKey key = getTestKey();
        String secret = "bound_secret";

        Cipher encryptCipher = Cipher.getInstance("AES/GCM/NoPadding");
        encryptCipher.init(Cipher.ENCRYPT_MODE, key);
        encryptCipher.updateAAD((context.getPackageName() + ":key_A").getBytes(StandardCharsets.UTF_8));

        byte[] iv = encryptCipher.getIV();
        byte[] ciphertext = encryptCipher.doFinal(secret.getBytes(StandardCharsets.UTF_8));

        // Decrypt attempting to use key_B in AAD
        Cipher decryptCipher = Cipher.getInstance("AES/GCM/NoPadding");
        decryptCipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, iv));
        decryptCipher.updateAAD((context.getPackageName() + ":key_B").getBytes(StandardCharsets.UTF_8));

        try {
            decryptCipher.doFinal(ciphertext);
            fail("Decryption with mismatched AAD should fail");
        } catch (AEADBadTagException e) {
            // Expected
            assertTrue(true);
        }
    }

    @Test
    public void testKeyInfoHardwareDiagnostics() throws Exception {
        SecretKey key = getTestKey();
        SecretKeyFactory factory = SecretKeyFactory.getInstance(key.getAlgorithm(), ANDROID_KEYSTORE);
        KeyInfo keyInfo = (KeyInfo) factory.getKeySpec(key, KeyInfo.class);

        assertNotNull(keyInfo);
        assertEquals(256, keyInfo.getKeySize());
    }

    @Test
    public void testConcurrentMultithreadedOperations() throws Exception {
        int threadCount = 8;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch latch = new CountDownLatch(threadCount);
        AtomicInteger successCount = new AtomicInteger(0);

        SecretKey key = getTestKey();

        for (int i = 0; i < threadCount; i++) {
            final int index = i;
            executor.submit(() -> {
                try {
                    String recordKey = "thread_key_" + index;
                    String secretVal = "token_value_for_thread_" + index;

                    Cipher enc = Cipher.getInstance("AES/GCM/NoPadding");
                    enc.init(Cipher.ENCRYPT_MODE, key);
                    enc.updateAAD((context.getPackageName() + ":" + recordKey).getBytes(StandardCharsets.UTF_8));
                    byte[] iv = enc.getIV();
                    byte[] ct = enc.doFinal(secretVal.getBytes(StandardCharsets.UTF_8));

                    Cipher dec = Cipher.getInstance("AES/GCM/NoPadding");
                    dec.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, iv));
                    dec.updateAAD((context.getPackageName() + ":" + recordKey).getBytes(StandardCharsets.UTF_8));
                    byte[] res = dec.doFinal(ct);

                    if (secretVal.equals(new String(res, StandardCharsets.UTF_8))) {
                        successCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                } finally {
                    latch.countDown();
                }
            });
        }

        assertTrue(latch.await(5, TimeUnit.SECONDS));
        assertEquals(threadCount, successCount.get());
        executor.shutdown();
    }
}
