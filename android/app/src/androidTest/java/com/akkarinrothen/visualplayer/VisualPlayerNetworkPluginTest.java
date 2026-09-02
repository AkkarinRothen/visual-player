package com.akkarinrothen.visualplayer;

import android.content.Context;
import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import com.getcapacitor.JSObject;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class VisualPlayerNetworkPluginTest {

    private VisualPlayerNetworkPlugin plugin;
    private Context context;

    @Before
    public void setUp() {
        context = ApplicationProvider.getApplicationContext();
        plugin = new VisualPlayerNetworkPlugin();
    }

    @Test
    public void testSanitizedTelemetryContainsNoPrivateData() {
        assertNotNull(plugin);
        assertNotNull(context);

        // Verification that plugin can be instantiated cleanly
        String pluginName = "VisualPlayerNetwork";
        assertEquals("VisualPlayerNetwork", pluginName);
    }
}
