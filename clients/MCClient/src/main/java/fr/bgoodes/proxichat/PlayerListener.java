package fr.bgoodes.proxichat;

import fr.bgoodes.proxichat.socket.ProxiClient;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerMoveEvent;

public class PlayerListener implements Listener {

    private final ProxiClient proxiClient;

    public PlayerListener(ProxiClient proxiClient) {
        this.proxiClient = proxiClient;
    }

    @EventHandler
    private void playerMove(PlayerMoveEvent event) {
        proxiClient.updateCoordinates(event.getPlayer(), event.getPlayer().getLocation());
    }
}
