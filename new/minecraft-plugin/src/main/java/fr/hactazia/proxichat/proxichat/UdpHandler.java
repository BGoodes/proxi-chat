package fr.hactazia.proxichat.proxichat;

import com.google.gson.JsonObject;

import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.util.Date;

public class UdpHandler {
    public InetAddress serverIp;
    public int serverPort;
    public DatagramSocket socket;
    public ProxiChatPlugin main;
    short ping_interval;

    public UdpHandler(ProxiChatPlugin main) {
        this.main = main;
        this.ping_interval = (short) main.getConfig().getInt("server_ping");
        this.serverPort = main.getConfig().getInt("server_port");
        try {
            this.serverIp = InetAddress.getByName(main.getConfig().getString("server_ip"));
            this.socket = new DatagramSocket();
        } catch (Exception e) {
            main.getLogger().severe("Socket exception: " + e.getMessage());
        }
    }

    public void send(byte[] message) {
        try {
            socket.send(new DatagramPacket(message, message.length, serverIp, serverPort));
        } catch (Exception e) {
            main.getLogger().severe("Sending exception: " + e.getMessage());
        }
    }

    public void send(JsonObject message) {
        send(message.toString());
    }

    public void send(String message) {
        send(message.getBytes());
    }

    public void close() {
        socket.close();
    }

    private Date lastOutPing = new Date();

    public void onTick() {
        var now = new Date();
        if (now.getTime() - lastOutPing.getTime() > ping_interval * 1000) {
            lastOutPing = now;
            main.udpHandler.send("{\"type\":\"ping\"}".getBytes());
        }
    }
}
