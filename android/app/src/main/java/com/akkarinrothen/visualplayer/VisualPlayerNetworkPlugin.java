package com.akkarinrothen.visualplayer;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.os.Build;
import android.os.SystemClock;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "VisualPlayerNetwork")
public class VisualPlayerNetworkPlugin extends Plugin {

    private ConnectivityManager connectivityManager;
    private ConnectivityManager.NetworkCallback networkCallback;
    private String currentNetworkEpoch = "net-epoch-init";
    private boolean isRegistered = false;

    @Override
    public void load() {
        super.load();
        Context context = getContext();
        if (context != null) {
            connectivityManager = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
            registerNetworkObserver();
        }
    }

    private void registerNetworkObserver() {
        if (connectivityManager == null || isRegistered) return;

        networkCallback = new ConnectivityManager.NetworkCallback() {
            @Override
            public void onAvailable(Network network) {
                super.onAvailable(network);
                updateEpochAndNotify("onAvailable", network);
            }

            @Override
            public void onLost(Network network) {
                super.onLost(network);
                currentNetworkEpoch = "net-epoch-" + SystemClock.elapsedRealtime();
                JSObject status = new JSObject();
                status.put("connected", false);
                status.put("networkEpoch", currentNetworkEpoch);
                status.put("transport", "none");
                status.put("validated", false);
                status.put("isMetered", false);
                status.put("isCaptivePortal", false);
                status.put("hasInternet", false);
                notifyListeners("onNetworkChanged", status);
            }

            @Override
            public void onCapabilitiesChanged(Network network, NetworkCapabilities capabilities) {
                super.onCapabilitiesChanged(network, capabilities);
                updateEpochAndNotify("onCapabilitiesChanged", network);
            }
        };

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                connectivityManager.registerDefaultNetworkCallback(networkCallback);
            } else {
                NetworkRequest request = new NetworkRequest.Builder()
                        .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                        .build();
                connectivityManager.registerNetworkCallback(request, networkCallback);
            }
            isRegistered = true;
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void updateEpochAndNotify(String triggerReason, Network network) {
        currentNetworkEpoch = "net-epoch-" + SystemClock.elapsedRealtime();
        JSObject status = buildNetworkStatusObject(network);
        notifyListeners("onNetworkChanged", status);
    }

    private JSObject buildNetworkStatusObject(Network network) {
        JSObject status = new JSObject();
        status.put("networkEpoch", currentNetworkEpoch);

        if (connectivityManager == null) {
            status.put("connected", false);
            status.put("transport", "unknown");
            status.put("validated", false);
            status.put("isMetered", false);
            status.put("isCaptivePortal", false);
            status.put("hasInternet", false);
            return status;
        }

        Network activeNetwork = (network != null) ? network : connectivityManager.getActiveNetwork();
        if (activeNetwork == null) {
            status.put("connected", false);
            status.put("transport", "none");
            status.put("validated", false);
            status.put("isMetered", false);
            status.put("isCaptivePortal", false);
            status.put("hasInternet", false);
            return status;
        }

        NetworkCapabilities capabilities = connectivityManager.getNetworkCapabilities(activeNetwork);
        if (capabilities == null) {
            status.put("connected", false);
            status.put("transport", "unknown");
            status.put("validated", false);
            status.put("isMetered", false);
            status.put("isCaptivePortal", false);
            status.put("hasInternet", false);
            return status;
        }

        boolean hasInternet = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
        boolean validated = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
        boolean notMetered = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED);
        boolean isCaptive = capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_CAPTIVE_PORTAL);

        String transport = "other";
        if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) {
            transport = "wifi";
        } else if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) {
            transport = "cellular";
        } else if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) {
            transport = "ethernet";
        } else if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_VPN)) {
            transport = "vpn";
        }

        status.put("connected", hasInternet);
        status.put("transport", transport);
        status.put("validated", validated);
        status.put("isMetered", !notMetered);
        status.put("isCaptivePortal", isCaptive);
        status.put("hasInternet", hasInternet);

        return status;
    }

    @PluginMethod
    public void getNetworkStatus(PluginCall call) {
        JSObject status = buildNetworkStatusObject(null);
        call.resolve(status);
    }

    @Override
    protected void handleOnDestroy() {
        if (connectivityManager != null && networkCallback != null && isRegistered) {
            try {
                connectivityManager.unregisterNetworkCallback(networkCallback);
            } catch (Exception ignored) {}
            isRegistered = false;
        }
        super.handleOnDestroy();
    }
}
