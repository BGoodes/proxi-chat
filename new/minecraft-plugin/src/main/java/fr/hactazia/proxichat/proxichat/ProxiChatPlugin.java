package fr.hactazia.proxichat.proxichat;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import org.bukkit.GameMode;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.*;
import org.bukkit.plugin.java.JavaPlugin;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.ArrayList;
import java.util.Date;
import java.util.UUID;

public final class ProxiChatPlugin extends JavaPlugin implements Listener {

    UdpHandler udpHandler;
    UdpServer udpServer;
    EventSender eventSender;
    EventListener eventListener;
    String group;
    String display;
    int minDistance;
    int maxDistance;
    int[] tasks;

    @Override
    public void onEnable() {
        getLogger().info("ProxiChat is starting...");
        var config = getConfig();

        config.addDefault("group", "default");
        config.addDefault("display", "MC ProxiChat Server");
        config.addDefault("min_distance", 10); // 100% volume at less than 10 blocks
        config.addDefault("max_distance", 100); // 0% volume at more than 100 blocks
        config.addDefault("server_ip", "127.0.0.1");
        config.addDefault("server_port", 3000);
        config.addDefault("server_ping", 1); // 1 second
        config.addDefault("server_timeout", 5); // 5 seconds
        config.options().copyDefaults(true);
        saveConfig();

        display = config.getString("display");
        group = config.getString("group");
        minDistance = config.getInt("min_distance");
        maxDistance = config.getInt("max_distance");
        udpHandler = new UdpHandler(this);
        udpServer = new UdpServer(this);
        eventSender = new EventSender(this);
        eventListener = new EventListener(this);
        getServer().getPluginManager().registerEvents(eventListener, this);

        tasks = new int[2];
        tasks[0] = getServer().getScheduler().scheduleSyncRepeatingTask(this, this.udpHandler::onTick, 0L, 1L);
        tasks[1] = getServer().getScheduler().scheduleSyncRepeatingTask(this, this.udpServer::onTick, 0L, 1L);

        getLogger().info("ProxiChat configuration:");
        getLogger().info("Server Display: " + display);
        getLogger().info("Server Group: " + group);
        getLogger().info("Server Address: " + getConfig().getString("server_ip"));
        getLogger().info("Server Port: " + getConfig().getInt("server_port"));
        getLogger().info("Server Ping Interval: " + getConfig().getInt("server_ping") + "s");
        getLogger().info("Server Timeout: " + getConfig().getInt("server_timeout") + "s");
        getLogger().info("Server Min Distance: " + minDistance + " blocks");
        getLogger().info("Server Max Distance: " + maxDistance + " blocks");
    }

    @Override
    public void onDisable() {
        getLogger().info("ProxiChat is stopping...");
        for (var task : tasks) getServer().getScheduler().cancelTask(task);
        udpHandler.close();
        udpHandler = null;
        udpServer.close();
        udpServer = null;
        group = null;
    }
}
