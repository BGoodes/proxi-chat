package fr.bgoodes.proxichat.socket;

import io.socket.client.IO;
import io.socket.client.Socket;
import org.bukkit.Location;
import org.bukkit.entity.Player;
import org.json.JSONException;
import org.json.JSONObject;

import java.net.URISyntaxException;

public class ProxiClient {

    private final Socket socket;

    public ProxiClient(String url) throws URISyntaxException {
        this.socket = IO.socket(url);
        ConnectionHandler.handleConnection(this.socket);
    }

    public void connect() {
        this.socket.connect();
    }

    public void disconnect() {
        this.socket.disconnect();
    }

    public void updateCoordinates(Player player, Location location) {
        String userId = player.getName();
        JSONObject data = new JSONObject();

        try {
            data.put("userId", userId);

            JSONObject coordinates = new JSONObject();
            coordinates.put("x", location.getBlockX());
            coordinates.put("y", location.getBlockY());
            coordinates.put("z", location.getBlockZ());

            data.put("coordinates", coordinates);

            socket.emit("coordinates", data);
        } catch (JSONException e) {
            throw new RuntimeException(e);
        }
    }
}
