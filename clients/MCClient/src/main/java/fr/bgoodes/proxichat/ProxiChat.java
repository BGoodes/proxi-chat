package fr.bgoodes.proxichat;

import org.bukkit.Bukkit;
import org.bukkit.plugin.java.JavaPlugin;

public class ProxiChat extends JavaPlugin {

    @Override
    public void onEnable() {
        Bukkit.getLogger().info("Hello World!");
    }

    @Override
    public void onDisable() {

    }
}
