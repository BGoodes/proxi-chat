using System.Net;

namespace CSharpLegacyClient
{
    public class ProxiChatRest
    {
        readonly string _url;

        public ProxiChatRest(string url)
        {
            _url = string.Concat(url, "/api/v1/update-coordinates");
        }

        public void UpdateCoordinates(string userId, int x, int y, int z)
        {
            HttpWebRequest request = (HttpWebRequest)WebRequest.Create(_url);
            request.Method = "POST";
            request.ContentType = "application/json";

            string body = $"{{\"userId\": \"{userId}\", \"coordinates\": {{\"x\": {x}, \"y\": {y}, \"z\": {z}}}}}";
            byte[] bodyBytes = System.Text.Encoding.UTF8.GetBytes(body);
            request.ContentLength = bodyBytes.Length;

            using (var requestStream = request.GetRequestStream())
            {
                requestStream.Write(bodyBytes, 0, bodyBytes.Length);
            }

            using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
            {
                // Do nothing
            }
        }
    }
}