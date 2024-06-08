const express = require('express');
const http = require('http');

const app = express();
const server = http.createServer(app);
const PORT = 4040;

app.use(express.static('public'));

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});