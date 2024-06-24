package fr.bgoodes.proxichat.socket;

import fr.bgoodes.proxichat.ProxiChat;
import io.socket.client.Socket;
import org.json.JSONException;
import org.json.JSONObject;

public class ConnectionHandler {

    public static void handleConnection(Socket socket) {

        socket.on(Socket.EVENT_CONNECT, args -> {
            try {
                JSONObject data = new JSONObject();

                data.put("userId", "minecraft");
                data.put("type", "game");

                socket.emit("join", data);
            } catch (JSONException e) {
                throw new RuntimeException(e);
            }

            ProxiChat.get().getLogger().info("Connected to the ProxiChat.");
        });

        socket.on(Socket.EVENT_DISCONNECT, args -> {
            ProxiChat.get().getLogger().info("Disconnected from the ProxiChat.");
        });

        socket.on(Socket.EVENT_CONNECT_ERROR , args -> {
            ProxiChat.get().getLogger().warning("Connection error.");
        });
    }
}
