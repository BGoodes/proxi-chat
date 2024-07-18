package fr.hactazia.proxichat.proxichat;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import org.bukkit.GameMode;
import org.bukkit.entity.Player;
import org.bukkit.event.player.PlayerJoinEvent;

import java.util.ArrayList;

public class EventSender {
    public ProxiChatPlugin main;

    public EventSender(ProxiChatPlugin main) {
        this.main = main;
    }

    public void SendPlayerJoin(Player player) {
        var json = new JsonObject();
        json.addProperty("type", "join");
        json.addProperty("id", player.getUniqueId().toString());
        json.addProperty("name", player.getDisplayName());
        json.addProperty("avatar", "https://cravatar.eu/helmavatar/" + player.getUniqueId() + "/64.png");
        main.udpHandler.send(json);
    }

    public void SendChannels(Player player, GameMode gameMode) {
        var json = new JsonObject();
        json.addProperty("type", "channels");
        json.addProperty("id", player.getUniqueId().toString());
        var fc = new JsonArray();
        fc.add(player.getWorld().getName());
        var sc = new JsonArray();
        for (var channel : GetBestChannels(gameMode))
            sc.add(channel);
        var channels = new JsonArray();
        channels.add(fc);
        channels.add(sc);
        json.add("channels", channels);
        main.udpHandler.send(json);
    }

    public void SendAuthentification(String token) {
        var json = new JsonObject();
        json.addProperty("type", "auth");
        json.addProperty("link", "minecraft");
        json.addProperty("group", main.group);
        json.addProperty("display", main.display);
        json.addProperty("min_distance", main.minDistance);
        json.addProperty("max_distance", main.maxDistance);
        json.addProperty("token", token);
        main.udpHandler.send(json);
    }

    public ArrayList<String> GetBestChannels(GameMode gameMode) {
        var channels = new ArrayList<String>();
        switch (gameMode) {
            case SURVIVAL, ADVENTURE:
                channels.add("survival");
                channels.add("adventure");
                channels.add("creative");
                break;
            case CREATIVE, SPECTATOR:
                channels.add("survival");
                channels.add("adventure");
                channels.add("creative");
                channels.add("spectator");
                break;
            default:
                break;
        }
        return channels;
    }


    public void SendPosition(Player player) {
        var x = player.getLocation().getX();
        var y = player.getLocation().getY();
        var z = player.getLocation().getZ();
        var json = new JsonObject();
        json.addProperty("type", "position");
        json.addProperty("id", player.getUniqueId().toString());
        json.addProperty("x", x);
        json.addProperty("y", y);
        json.addProperty("z", z);
        main.udpHandler.send(json);
    }

    public void SendPlayerQuit(Player player) {

        var json = new JsonObject();
        json.addProperty("type", "quit");
        json.addProperty("id", player.getUniqueId().toString());
        main.udpHandler.send(json);
    }

    public void SendMakeConnectorLink(Player player) {
        var json = new JsonObject();
        json.addProperty("type", "make_connector_link");
        json.addProperty("id", player.getUniqueId().toString());
        main.udpHandler.send(json);
    }
}
