namespace ProxiChatCSharp;

public static class ConnectionHandler
{
    public static void HandleConnection(SocketIOClient.SocketIO socket, String gameName)
    {
        socket.OnConnected += async (sender, e) =>
        {
            Console.WriteLine("Connected to server");
            await socket.EmitAsync("join", new { userId = gameName, type = "game" });
        };

        socket.OnDisconnected += (sender, e) =>
        {
            Console.WriteLine("Disconnected from server");
        };

        socket.OnReconnectAttempt += (sender, e) =>
        {
            Console.WriteLine($"Reconnecting: attempt {e}");
        };

        socket.OnError += (sender, e) =>
        {
            Console.WriteLine($"Error: {e}");
        };
    }
}