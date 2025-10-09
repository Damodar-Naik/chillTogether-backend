import express from 'express';
import http from 'http';
import { Request, Response } from 'express';
var randomstring = require("randomstring");
import cors from 'cors';

const app = express();
import webSocket from 'ws';
const server = http.createServer(app);
const ws = new webSocket.Server({ server });

app.use(cors({
    origin: process.env.CORS_ORIGINS?.split(',') || 'http://localhost:3000',
    credentials: true,
}));

type socketMessage = {
    type: 'loadUrl' | 'play' | 'pause' | 'seek' | 'connected';
    message: string;
    jsonData?: string; // json string
}

type VideoDataType = {
    time: number;
    currentTime: number;
    videoId: string;
    status: 'playing' | 'paused' | 'seek' | 'buffering' | 'ended';
}
// Initial  data
let videoData: VideoDataType = {
    time: 0,
    currentTime: 0,
    videoId: '',
    status: 'paused' // playing, paused, seek, buffering, ended
}

// HTTP types
interface CreateRoomResponse {
    success: boolean;
    roomId: string;
    message: string;
}

// Store rooms
const rooms = new Map<string, {
    videoData: VideoDataType;
    clients: Set<webSocket>;
}>();

app.use(express.json());

// 1. Create Room Endpoint
app.post('/room/create', (req: Request, res: Response<CreateRoomResponse>) => {
    try {
        let roomId = '';
        let attempts = 0;
        const maxAttempts = 10;

        do {
            roomId = randomstring.generate({
                readable: true,
                length: 7,
                charset: 'alphanumeric'
            });
            attempts++;

            if (attempts >= maxAttempts) {
                // 🎯 500 - Server failed to generate unique ID
                return res.status(500).json({
                    success: false,
                    roomId: '',
                    message: 'Unable to generate unique room ID. Please try again.'
                });
            }
        } while (rooms.has(roomId));

        const initialVideoData: VideoDataType = {
            time: 0,
            currentTime: Date.now(),
            videoId: '',
            status: 'paused'
        };

        rooms.set(roomId, {
            videoData: initialVideoData,
            clients: new Set()
        });

        console.log(`Room ${roomId} created`);

        res.status(201).json({
            success: true,
            roomId,
            message: 'Room created successfully. Use this roomId to connect via WebSocket.'
        });

    } catch (err) {
        console.error('Room creation failed:', err);
        // 🎯 500 - Any unexpected server error
        res.status(500).json({
            success: false,
            roomId: '',
            message: 'Internal server error while creating room'
        });
    }
});

app.get('/room/join/:roomId', (req: Request, res: Response<CreateRoomResponse>) => {
    try {
        const roomId = req.params.roomId
        if (rooms.has(roomId)) {
            res.status(200).json({
                success: true,
                roomId: roomId,
                message: 'valid room Id'
            });
        } else {
            res.status(500).json({
                success: false,
                roomId: '',
                message: 'Invalid Room Id'
            });
        }
    } catch {
        res.status(500).json({
            success: false,
            roomId: '',
            message: 'Error while joining room'
        });
    }

})

// 2. WebSocket Connection Handler
ws.on('connection', (socket, request) => {
    const url = new URL(request.url!, `http://${request.headers.host}`);
    const roomId = url.searchParams.get('roomId');

    if (!roomId || !rooms.has(roomId)) {
        socket.close();
        console.log('Invalid room ID:', roomId);
        return;
    }

    const room = rooms.get(roomId)!;
    room.clients.add(socket);

    console.log(`User connected to room ${roomId}. Total clients: ${room.clients.size}`);

    // Send current room state to the newly connected client
    const data: socketMessage = {
        type: 'connected',
        message: 'Welcome new client',
        jsonData: JSON.stringify(room.videoData)
    };
    socket.send(JSON.stringify(data));

    socket.on('message', (message) => {
        console.log(`Room ${roomId} received:`, message.toString());
        const parsedMessage = JSON.parse(message.toString()) as socketMessage;

        if (['seek', 'play', 'pause'].includes(parsedMessage.type)) {
            room.videoData = parsedMessage.jsonData ? JSON.parse(parsedMessage.jsonData) : room.videoData;
        }

        if (parsedMessage.type == 'loadUrl') {
            room.videoData = parsedMessage.jsonData ? JSON.parse(parsedMessage.jsonData) : room.videoData;
            room.videoData = {
                time: 0,
                currentTime: Date.now(),
                videoId: room.videoData.videoId,
                status: 'playing'
            }
        }

        // Broadcast to all other clients in the room
        room.clients.forEach((client) => {
            if (client !== socket && client.readyState === webSocket.OPEN) {
                client.send(message.toString());
            }
        });
    });

    socket.on('close', () => {
        if (room) {
            room.clients.delete(socket);
            console.log(`User disconnected from room ${roomId}. Remaining clients: ${room.clients.size}`);
        }
    });
});

server.listen(8080, () => {
    console.log('Server running on port 8080');
});