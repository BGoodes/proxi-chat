package fr.hactazia.proxichat.proxichat;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import org.bukkit.GameMode;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabCompleter;
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
import java.util.List;
import java.util.UUID;

public final class ProxiChatPlugin extends JavaPlugin implements TabCompleter {

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

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (!command.getName().equalsIgnoreCase("pc") && !command.getName().equalsIgnoreCase("proxichat"))
            return false;

        if (args.length == 0) {
            sender.sendMessage("Usage: /pchat help");
            return true;
        }

        if (args[0].equalsIgnoreCase("help")) {
            sender.sendMessage("ProxiChat commands:");
            sender.sendMessage("/pchat help - Show this help message");
            sender.sendMessage("/pchat mute <player> - Mute the ProxiChat");
            sender.sendMessage("/pchat unmute <player> - Unmute the ProxiChat");
            sender.sendMessage("/pchat mutetoggle <player> - Toggle the ProxiChat mute");
            sender.sendMessage("/pchat link - Link your account to ProxiChat");
            return true;
        }

        if (args[0].equalsIgnoreCase("mute")) {
            Player target;
            if (args.length < 2) {
                if (!(sender instanceof Player)) {
                    sender.sendMessage("Usage: /pchat mute <player>");
                    return true;
                } else target = (Player) sender;
            } else {
                if (!sender.isOp()) {
                    sender.sendMessage("You must be an operator to mute other players.");
                    return true;
                }
                target = getServer().getPlayer(args[1]);
            }
            if (target == null) {
                sender.sendMessage("Player not found.");
                return true;
            }

            eventSender.SetMute(target, true).thenAccept(success -> {
                if (success) {
                    if (sender != target)
                        sender.sendMessage("Player " + target.getName() + " is now muted");
                    target.sendMessage("You are now muted");
                } else {
                    sender.sendMessage("Failed to mute player " + target.getName());
                }
            });
            return true;
        } else if (args[0].equalsIgnoreCase("unmute")) {
            Player target;
            if (args.length < 2) {
                if (!(sender instanceof Player)) {
                    sender.sendMessage("Usage: /pchat unmute <player>");
                    return true;
                } else target = (Player) sender;
            } else {
                if (!sender.isOp()) {
                    sender.sendMessage("You must be an operator to unmute other players.");
                    return true;
                }
                target = getServer().getPlayer(args[1]);
            }
            if (target == null) {
                sender.sendMessage("Player not found.");
                return true;
            }

            eventSender.SetMute(target, false).thenAccept(success -> {
                if (success) {
                    if (sender != target)
                        sender.sendMessage("Player " + target.getName() + " is no longer muted");
                    target.sendMessage("You are no longer muted!");
                } else {
                    sender.sendMessage("Failed to unmute player " + target.getName());
                }
            });
            return true;
        } else if (args[0].equalsIgnoreCase("mutetoggle")) {
            Player target;
            if (args.length < 2) {
                if (!(sender instanceof Player)) {
                    sender.sendMessage("Usage: /pchat mutetoggle <player>");
                    return true;
                } else target = (Player) sender;
            } else {
                if (!sender.isOp()) {
                    sender.sendMessage("You must be an operator to toggle mute other players.");
                    return true;
                }
                target = getServer().getPlayer(args[1]);
            }
            if (target == null) {
                sender.sendMessage("Player not found.");
                return true;
            }

            eventListener.isMuted(target).thenAccept(mute -> {
                eventSender.SetMute(target, !mute).thenAccept(success -> {
                    if (success) {
                        if (sender != target)
                            sender.sendMessage("Player " + target.getName() + " is now " + (mute ? "unmuted" : "muted"));
                        target.sendMessage(mute ? "You are no longer muted!" : "You are now muted!");
                    } else {
                        sender.sendMessage("Failed to toggle mute for player " + target.getName());
                    }
                });
            });

            return true;
        } else if (args[0].equalsIgnoreCase("link")) {
            if (!(sender instanceof Player)) {
                sender.sendMessage("You must be a player to link your account.");
                return true;
            }
            eventSender.SendMakeConnectorLink((Player) sender);
            return true;
        }
        return false;
    }

    @Override
    public List<String> onTabComplete(CommandSender sender, Command command, String alias, String[] args) {
        if (args.length == 1) {
            var list = new ArrayList<String>();
            list.add("help");
            list.add("mute");
            list.add("unmute");
            list.add("mutetoggle");
            list.add("link");
            return list;
        } else if (args.length == 2) {
            if (args[0].equalsIgnoreCase("mute") || args[0].equalsIgnoreCase("unmute") || args[0].equalsIgnoreCase("mutetoggle")) {
                var list = new ArrayList<String>();
                for (var player : getServer().getOnlinePlayers()) {
                    list.add(player.getName());
                }
                return list;
            }
        }
        return null;
    }


}
