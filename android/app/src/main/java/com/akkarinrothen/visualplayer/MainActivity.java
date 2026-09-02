package com.akkarinrothen.visualplayer;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(VisualPlayerScreenPlugin.class);
        registerPlugin(VisualPlayerKeystorePlugin.class);
        registerPlugin(VisualPlayerNetworkPlugin.class);
        registerPlugin(VisualPlayerNearbyPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
