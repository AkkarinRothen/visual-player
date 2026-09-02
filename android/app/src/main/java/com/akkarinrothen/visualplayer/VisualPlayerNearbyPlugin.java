package com.akkarinrothen.visualplayer;

import android.content.Context;
import androidx.annotation.NonNull;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.nearby.Nearby;
import com.google.android.gms.nearby.connection.AdvertisingOptions;
import com.google.android.gms.nearby.connection.ConnectionInfo;
import com.google.android.gms.nearby.connection.ConnectionLifecycleCallback;
import com.google.android.gms.nearby.connection.ConnectionResolution;
import com.google.android.gms.nearby.connection.ConnectionsClient;
import com.google.android.gms.nearby.connection.ConnectionsStatusCodes;
import com.google.android.gms.nearby.connection.DiscoveredEndpointInfo;
import com.google.android.gms.nearby.connection.DiscoveryOptions;
import com.google.android.gms.nearby.connection.EndpointDiscoveryCallback;
import com.google.android.gms.nearby.connection.Payload;
import com.google.android.gms.nearby.connection.PayloadCallback;
import com.google.android.gms.nearby.connection.PayloadTransferUpdate;
import com.google.android.gms.nearby.connection.Strategy;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "VisualPlayerNearby")
public class VisualPlayerNearbyPlugin extends Plugin {

    private static final String SERVICE_ID = "com.akkarinrothen.visualplayer.nearby";
    private static final Strategy STRATEGY = Strategy.P2P_POINT_TO_POINT;

    private ConnectionsClient connectionsClient;
    private String connectedEndpointId = null;
    private boolean isAdvertising = false;
    private boolean isDiscovering = false;

    @Override
    public void load() {
        Context context = getContext();
        connectionsClient = Nearby.getConnectionsClient(context);
    }

    private final ConnectionLifecycleCallback connectionLifecycleCallback = new ConnectionLifecycleCallback() {
        @Override
        public void onConnectionInitiated(@NonNull String endpointId, @NonNull ConnectionInfo info) {
            JSObject ret = new JSObject();
            ret.put("endpointId", endpointId);
            ret.put("endpointName", info.getEndpointName());
            ret.put("authenticationDigits", info.getAuthenticationDigits());
            ret.put("isIncomingConnection", info.isIncomingConnection());
            notifyListeners("onConnectionInitiated", ret);
        }

        @Override
        public void onConnectionResult(@NonNull String endpointId, @NonNull ConnectionResolution result) {
            JSObject ret = new JSObject();
            ret.put("endpointId", endpointId);
            if (result.getStatus().getStatusCode() == ConnectionsStatusCodes.STATUS_OK) {
                connectedEndpointId = endpointId;
                ret.put("status", "connected");
                stopAdvertisingInternal();
                stopDiscoveryInternal();
            } else {
                ret.put("status", "disconnected");
                ret.put("statusCode", result.getStatus().getStatusCode());
            }
            notifyListeners("onNearbyStatusChange", ret);
        }

        @Override
        public void onDisconnected(@NonNull String endpointId) {
            connectedEndpointId = null;
            JSObject ret = new JSObject();
            ret.put("endpointId", endpointId);
            ret.put("status", "disconnected");
            notifyListeners("onNearbyStatusChange", ret);
        }
    };

    private final PayloadCallback payloadCallback = new PayloadCallback() {
        @Override
        public void onPayloadReceived(@NonNull String endpointId, @NonNull Payload payload) {
            if (payload.getType() == Payload.Type.BYTES && payload.asBytes() != null) {
                String message = new String(payload.asBytes(), StandardCharsets.UTF_8);
                JSObject ret = new JSObject();
                ret.put("endpointId", endpointId);
                ret.put("message", message);
                notifyListeners("onNearbyMessage", ret);
            }
        }

        @Override
        public void onPayloadTransferUpdate(@NonNull String endpointId, @NonNull PayloadTransferUpdate update) {
            // Can be used for chunked transfer progress in future
        }
    };

    private final EndpointDiscoveryCallback endpointDiscoveryCallback = new EndpointDiscoveryCallback() {
        @Override
        public void onEndpointFound(@NonNull String endpointId, @NonNull DiscoveredEndpointInfo info) {
            JSObject ret = new JSObject();
            ret.put("endpointId", endpointId);
            ret.put("endpointName", info.getEndpointName());
            ret.put("serviceId", info.getServiceId());
            notifyListeners("onEndpointFound", ret);
        }

        @Override
        public void onEndpointLost(@NonNull String endpointId) {
            JSObject ret = new JSObject();
            ret.put("endpointId", endpointId);
            notifyListeners("onEndpointLost", ret);
        }
    };

    @PluginMethod
    public void startAdvertising(PluginCall call) {
        String roomId = call.getString("roomId", "VP-HOST");
        AdvertisingOptions options = new AdvertisingOptions.Builder().setStrategy(STRATEGY).build();

        connectionsClient.startAdvertising(roomId, SERVICE_ID, connectionLifecycleCallback, options)
                .addOnSuccessListener(unused -> {
                    isAdvertising = true;
                    JSObject ret = new JSObject();
                    ret.put("status", "advertising");
                    ret.put("roomId", roomId);
                    call.resolve(ret);
                })
                .addOnFailureListener(e -> call.reject("Failed to start advertising: " + e.getMessage(), e));
    }

    @PluginMethod
    public void startDiscovery(PluginCall call) {
        DiscoveryOptions options = new DiscoveryOptions.Builder().setStrategy(STRATEGY).build();

        connectionsClient.startDiscovery(SERVICE_ID, endpointDiscoveryCallback, options)
                .addOnSuccessListener(unused -> {
                    isDiscovering = true;
                    JSObject ret = new JSObject();
                    ret.put("status", "discovering");
                    call.resolve(ret);
                })
                .addOnFailureListener(e -> call.reject("Failed to start discovery: " + e.getMessage(), e));
    }

    @PluginMethod
    public void requestConnection(PluginCall call) {
        String clientName = call.getString("clientName", "Master-Remote");
        String endpointId = call.getString("endpointId");
        if (endpointId == null) {
            call.reject("endpointId is required");
            return;
        }

        connectionsClient.requestConnection(clientName, endpointId, connectionLifecycleCallback)
                .addOnSuccessListener(unused -> call.resolve())
                .addOnFailureListener(e -> call.reject("Failed to request connection: " + e.getMessage(), e));
    }

    @PluginMethod
    public void acceptConnection(PluginCall call) {
        String endpointId = call.getString("endpointId", connectedEndpointId);
        if (endpointId == null) {
            call.reject("endpointId is required");
            return;
        }

        connectionsClient.acceptConnection(endpointId, payloadCallback)
                .addOnSuccessListener(unused -> call.resolve())
                .addOnFailureListener(e -> call.reject("Failed to accept connection: " + e.getMessage(), e));
    }

    @PluginMethod
    public void rejectConnection(PluginCall call) {
        String endpointId = call.getString("endpointId");
        if (endpointId == null) {
            call.reject("endpointId is required");
            return;
        }

        connectionsClient.rejectConnection(endpointId)
                .addOnSuccessListener(unused -> call.resolve())
                .addOnFailureListener(e -> call.reject("Failed to reject connection: " + e.getMessage(), e));
    }

    @PluginMethod
    public void sendBytes(PluginCall call) {
        String message = call.getString("message");
        String endpointId = call.getString("endpointId", connectedEndpointId);

        if (message == null || endpointId == null) {
            call.reject("message and active connection required");
            return;
        }

        byte[] bytes = message.getBytes(StandardCharsets.UTF_8);
        connectionsClient.sendPayload(endpointId, Payload.fromBytes(bytes))
                .addOnSuccessListener(unused -> call.resolve())
                .addOnFailureListener(e -> call.reject("Failed to send payload: " + e.getMessage(), e));
    }

    @PluginMethod
    public void stopAdvertising(PluginCall call) {
        stopAdvertisingInternal();
        call.resolve();
    }

    @PluginMethod
    public void stopDiscovery(PluginCall call) {
        stopDiscoveryInternal();
        call.resolve();
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        connectionsClient.stopAllEndpoints();
        connectedEndpointId = null;
        isAdvertising = false;
        isDiscovering = false;
        call.resolve();
    }

    private void stopAdvertisingInternal() {
        if (isAdvertising) {
            connectionsClient.stopAdvertising();
            isAdvertising = false;
        }
    }

    private void stopDiscoveryInternal() {
        if (isDiscovering) {
            connectionsClient.stopDiscovery();
            isDiscovering = false;
        }
    }
}
