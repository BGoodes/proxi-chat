# Proximity-Based Voice Chat for Any Game
[![NodeJS](https://img.shields.io/badge/NodeJS-339933?logo=nodedotjs&logoColor=white)](https://github.com/nodejs)
[![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white)](https://github.com/expressjs/express)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?logo=socketdotio&logoColor=white)](https://github.com/socketio/socket.io)
[![WebRTC](https://img.shields.io/badge/WebRTC-333333?logo=webrtc&logoColor=white)](https://webrtc.org)
[![Simple Peer](https://img.shields.io/badge/Simple%20Peer-FF4088?logo=webrtc&logoColor=white)](https://github.com/feross/simple-peer)
[![Web Audio API](https://img.shields.io/badge/Web%20Audio%20API-000000?logo=webaudio&logoColor=white)](https://github.com/WebAudio/web-audio-api)
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)](https://www.docker.com)

## Description

This project aims to add proximity-based voice chat to any game by bringing a web-based platform.

## How It Works

### 1. Express Application
The Express application  wich is the heart of the project, handle several tasks:
- **Serving Website Files**: The Express app serves the necessary HTML, CSS, and JavaScript files that make up the web interface. This interface allows users to access the service and communicate through WebRTC, with spatialization handled by the Web Audio API.
- **Signalling Server for WebRTC**: The app uses Socket.IO to facilitate the signalling process required for establishing WebRTC connections between clients.
- **Updating Player Coordinates**: Player coordinates can be updated in real-time via Socket.IO or through a REST API provided by the Express application.

### 2. Modded Game or Server
To integrate proximity-based voice chat into a video game, the game or its server must be modded to send player coordinates to the Express application.

TODO documentation...

## Technology used

### Frontend

| Technology       | Repository Link                                                       |
|------------------|-----------------------------------------------------------------------|
| Simple Peer           | [Simple Peer](https://github.com/feross/simple-peer)                  |
| Socket.IO Client | [Socket.IO Client](https://github.com/socketio/socket.io-client)      |
| Web Audio API    | [Web Audio API](https://github.com/WebAudio/web-audio-api)            |

### Backend

| Technology | Repository Link                                       |
|------------|-------------------------------------------------------|
| NodeJS     | [NodeJS](https://github.com/nodejs)                   |
| Express    | [Express](https://github.com/expressjs/express)       |
| Socket.IO  | [Socket.IO](https://github.com/socketio/socket.io)    |
| REST API   | -                                                     |

## Installation
### With nodeJS
1. Clone the repository.
2. Go to the src folder and create a .env file, you can copy .env.example.
3. Go to src/public/js folder and change the ip adress in config.js with the ip address of your server.
4. Then install and run the app: `npm install` & `npm run start`.

### With Docker Compose
1. Clone the repository.
2. Go to the docker folder and create a .env file, you can copy .env.example.
3. Go to src/public/js folder and change the ip adress in config.js with the ip address of your server.
4. Then start the service: `docker compose up`

## Contributing

Contributions are welcome! Please fork the repository and create a pull request with your changes.

## Todo
This is just the beginning of the project, and it's more of a proof of concept at the moment. There is still a lot to do, and here is what is planned next:
 * Manage authentication to access the REST API and Websockets.
 * Handle CORS more properly (perhaps adding a proxy?).
 * Improve the graphical interface.
 * Enable account management (adding a database).
 * Write documentation on modding.
 * ...

## License
This project is licensed under the MIT License. See the [LICENCE](LICENCE.txt) file for details.
