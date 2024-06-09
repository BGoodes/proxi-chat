namespace ProxiChatCSharp;

public class ProxiChatClient
{
    private readonly SocketIOClient.SocketIO _socket;

    public ProxiChatClient(String gameName, String url)
    {
        _socket = new SocketIOClient.SocketIO(url);
        ConnectionHandler.HandleConnection(_socket, gameName);
    }

    public async Task ConnectAsync()
    {
        await _socket.ConnectAsync();
    }

    public async Task DisconnectAsync()
    {
        await _socket.DisconnectAsync();
    }

    public async Task SendCoordinatesAsync(String userId, int x, int y, int z)
    {
        var data = new
        {
            userId,
            coordinates = new { x = x, y = y, z = z}
        };

        await _socket.EmitAsync("coordinates", data);
        Console.WriteLine($"Coordinates sent: {data.userId}, {string.Join(", ", data.coordinates)}");
    }
}