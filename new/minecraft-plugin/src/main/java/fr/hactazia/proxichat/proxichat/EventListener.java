package fr.hactazia.proxichat.proxichat;

import com.google.gson.JsonObject;
import net.md_5.bungee.api.chat.ClickEvent;
import net.md_5.bungee.api.chat.HoverEvent;
import net.md_5.bungee.api.chat.TextComponent;
import net.md_5.bungee.api.chat.hover.content.Text;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.*;

import java.util.UUID;

public class EventListener implements Listener {
    public ProxiChatPlugin main;

    public EventListener(ProxiChatPlugin main) {
        this.main = main;
    }

    @EventHandler(priority = EventPriority.LOWEST)
    public void onPlayerChangeWorld(PlayerChangedWorldEvent event) {
        main.eventSender.SendChannels(event.getPlayer(), event.getPlayer().getGameMode());
    }

    @EventHandler(priority = EventPriority.LOWEST)
    public void onPlayerChangeGameMode(PlayerGameModeChangeEvent event) {
        main.eventSender.SendChannels(event.getPlayer(), event.getNewGameMode());
    }

    @EventHandler(priority = EventPriority.LOWEST)
    public void onPlayerMove(PlayerMoveEvent event) {
        if (event.getFrom().getX() == event.getTo().getX() && event.getFrom().getY() == event.getTo().getY() && event.getFrom().getZ() == event.getTo().getZ())
            return;
        main.eventSender.SendPosition(event.getPlayer());
    }

    @EventHandler(priority = EventPriority.LOWEST)
    public void onPlayerQuit(PlayerQuitEvent event) {
        main.eventSender.SendPlayerQuit(event.getPlayer());
    }

    @EventHandler(priority = EventPriority.LOWEST)
    public void onPlayerJoin(PlayerJoinEvent event) {
        main.eventSender.SendPlayerJoin(event.getPlayer());
    }

    public void onPong() {

    }

    public void onPing() {

    }

    public void onConnect() {
        main.getLogger().info("Connected to ProxiChat server!");
    }

    public void onDisconnect() {
        main.getLogger().warning("Disconnected from ProxiChat server!");
    }

    public void onAuth(JsonObject auth) {
        var success = auth.get("success").getAsBoolean();
        if (!success) {
            var error_message = auth.get("error").getAsString();
            main.getLogger().warning("Authentication exception: " + error_message);
            return;
        }
        main.getLogger().info("Authentication success!");
        for (Player player : main.getServer().getOnlinePlayers()) {
            main.eventSender.SendPlayerJoin(player);
            main.eventSender.SendChannels(player, player.getGameMode());
            main.eventSender.SendPosition(player);
        }
    }

    public void onConnectorLink(JsonObject data) {
        var url = data.get("url").getAsString();
        var player = main.getServer().getPlayer(UUID.fromString(data.get("id").getAsString()));
        if (player == null || url == null) return;
        main.getLogger().info("Connector link: " + url + " for " + data.get("id").getAsString());
        TextComponent message = new TextComponent("Click me to link your account!");
        message.setClickEvent(new ClickEvent(ClickEvent.Action.OPEN_URL, url));
        message.setHoverEvent(new HoverEvent(HoverEvent.Action.SHOW_TEXT, new Text(url)));
        player.spigot().sendMessage(message);
    }

    public void onNoConnector(JsonObject message) {
        main.getLogger().warning("No connector found for " + message.get("id").getAsString());
        var player = main.getServer().getPlayer(UUID.fromString(message.get("id").getAsString()));
        if (player == null) return;
        player.sendMessage("No connector found for your account.");
        this.main.eventSender.SendMakeConnectorLink(player);
    }

    public void onPleaseAuth() {
        main.eventSender.SendAuthentification(main.getConfig().getString("server_token"));
    }

    public void onChatterConnect(JsonObject message) {
        var player = main.getServer().getPlayer(UUID.fromString(message.get("id").getAsString()));
        if (player == null) return;
        player.sendMessage("You are now connected with ProxiChat!");
    }

    public void onChatterDisconnect(JsonObject message) {
        var player = main.getServer().getPlayer(UUID.fromString(message.get("id").getAsString()));
        if (player == null) return;
        player.sendMessage("You are now disconnected from ProxiChat!");
    }
}
