import { time } from 'console';
import { url } from 'inspector';
import webSocket from 'ws';

const ws = new webSocket.Server({ port: 8080 });

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
let videoData: VideoDataType = {
    time: 0,
    currentTime: 0,
    videoId: '',
    status: 'paused' // playing, paused, seek, buffering, ended
}
ws.on('connection', (socket) => {
    console.log('a user connected');
    if (!videoData.currentTime) {
        videoData.currentTime = Date.now();
    }

    const data: socketMessage = {
        type: 'connected',
        message: 'Welcome new client',
        jsonData: JSON.stringify(videoData)
    }
    socket.send(JSON.stringify(data));

    socket.on('message', (message) => {
        console.log('received: %s', message);
        const parsedMessage = JSON.parse(message.toString()) as socketMessage;
        if (['seek', 'play', 'pause'].includes(parsedMessage.type)) {
            videoData = parsedMessage.jsonData ? JSON.parse(parsedMessage.jsonData) : videoData;
        }

        if (parsedMessage.type == 'loadUrl') {
            videoData = parsedMessage.jsonData ? JSON.parse(parsedMessage.jsonData) : videoData;
            videoData = {
                time: 0,
                currentTime: Date.now(),
                videoId: videoData.videoId,
                status: 'playing'
            }
        }

        ws.clients.forEach((client) => {
            if (client !== socket && client.readyState === webSocket.OPEN) {
                console.log('sent to client:', typeof (message), String(message));
                client.send(message.toString());
            }
        });
    });
});

