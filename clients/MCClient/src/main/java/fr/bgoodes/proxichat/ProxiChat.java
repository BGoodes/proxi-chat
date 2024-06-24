package fr.bgoodes.proxichat;

import fr.bgoodes.proxichat.socket.ProxiClient;
import org.bukkit.plugin.java.JavaPlugin;

import java.net.URISyntaxException;

public class ProxiChat extends JavaPlugin {

    private ProxiClient proxiClient;
    private static ProxiChat instance;

    @Override
    public void onEnable() {
        instance = this;

        try {
            this.proxiClient = new ProxiClient("http://localhost:3000");
            this.proxiClient.connect();
        } catch (URISyntaxException e) {
            getLogger().severe("Invalid URL, please check the configuration.");
        }

        getServer().getPluginManager().registerEvents(new PlayerListener(this.proxiClient), this);
    }

    @Override
    public void onDisable() {
        this.proxiClient.disconnect();
    }

    public static ProxiChat get() {
        return instance;
    }
}
