package com.akkarinrothen.visualplayer;

import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "VisualPlayerScreen")
public class VisualPlayerScreenPlugin extends Plugin {

    @PluginMethod
    public void keepAwake(PluginCall call) {
        boolean enable = call.getBoolean("enable", true);

        getActivity().runOnUiThread(() -> {
            if (enable) {
                getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            } else {
                getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            }
            JSObject ret = new JSObject();
            ret.put("isAwake", enable);
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void setImmersive(PluginCall call) {
        boolean enable = call.getBoolean("enable", true);

        getActivity().runOnUiThread(() -> {
            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(
                getActivity().getWindow(),
                getActivity().getWindow().getDecorView()
            );

            if (controller != null) {
                if (enable) {
                    controller.hide(WindowInsetsCompat.Type.systemBars());
                    controller.setSystemBarsBehavior(
                        WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                    );
                } else {
                    controller.show(WindowInsetsCompat.Type.systemBars());
                }
            }

            JSObject ret = new JSObject();
            ret.put("isImmersive", enable);
            call.resolve(ret);
        });
    }
}
