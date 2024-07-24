package fr.hactazia.proxichat.proxichat;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.util.Date;

public class UdpServer {
    private ProxiChatPlugin main;
    private Thread currentThread;

    private DatagramSocket GetSocket() {
        return main.udpHandler.socket;
    }

    private boolean isListening = false;
    private final short timeout;

    public void onTick() {
        if (new Date().getTime() - lastPong.getTime() > timeout * 1000 && isConnected) {
            isConnected = false;
            main.eventListener.onDisconnect();
        } else if (new Date().getTime() - lastPong.getTime() < timeout * 1000 && !isConnected) {
            isConnected = true;
            main.eventListener.onConnect();
        }

        if (isListening || GetSocket() == null) return;
        currentThread = new Thread(() -> {
            isListening = true;
            byte[] buffer = new byte[1024];
            DatagramPacket packet = new DatagramPacket(buffer, buffer.length);
            try {
                GetSocket().receive(packet);
                var buff = new byte[packet.getLength()];
                System.arraycopy(packet.getData(), 0, buff, 0, packet.getLength());
                onMessage(buff);
            } catch (Exception e) {
                main.getLogger().severe("Receive exception: " + e.getMessage());
            }
            isListening = false;
        });
        currentThread.start();
    }

    public UdpServer(ProxiChatPlugin main) {
        this.timeout = (short) main.getConfig().getInt("server_timeout");
        this.main = main;
    }

    public void close() {
        if (currentThread != null)
            currentThread.interrupt();
        currentThread = null;
    }

    public void onMessage(byte[] message) {
        try {
            onJsonMessage(JsonParser.parseString(new String(message)).getAsJsonObject());
        } catch (Exception e) {
            main.getLogger().severe("Message conversion exception: " + e.getMessage() + "\n" + new String(message));
            for (StackTraceElement element : e.getStackTrace()) {
                main.getLogger().severe(element.toString());
            }
        }
    }

    public void onJsonMessage(JsonObject message) {
        var type = message.get("type").getAsString();
        main.eventListener.onEvent(message);
        switch (type) {
            case "ping":
                main.udpHandler.send("{\"type\":\"pong\"}".getBytes());
                main.eventListener.onPing();
                break;
            case "pong":
                lastPong = new Date();
                main.eventListener.onPong();
                break;
            case "auth":
                main.eventListener.onAuth(message);
                break;
            case "connector_link":
                main.eventListener.onConnectorLink(message);
                break;
            case "no_connector":
                main.eventListener.onNoConnector(message);
                break;
            case "please_auth":
                main.eventListener.onPleaseAuth();
                break;
            case "chatter_connect":
                main.eventListener.onChatterConnect(message);
                break;
            case "chatter_disconnect":
                main.eventListener.onChatterDisconnect(message);
                break;
            case "chatter_data":
                main.eventListener.onChatterData(message);
                break;
            default:
                main.getLogger().warning("Unknown message type: " + type);
        }
    }

    private boolean isConnected = false;

    private Date lastPong = new Date(0);
}
