import { time } from 'console';
import { url } from 'inspector';
import webSocket from 'ws';

const ws = new webSocket.Server({ port: 8080 });

type socketMessage = {
    type: 'loadUrl' | 'play' | 'pause' | 'seek' | 'connected';
    message: string;
    jsonData?: string; // json string
}
let videoData = {
    time: 0,
    currentTime: 0,
    videoId: ''
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
        if (['seek', 'play'].includes(parsedMessage.type)) {
            videoData = {
                time: Number(parsedMessage.message),
                currentTime: Date.now(),
                videoId: videoData.videoId
            }
        }

        if (parsedMessage.type == 'loadUrl') {
            videoData = parsedMessage.jsonData ? JSON.parse(parsedMessage.jsonData) : videoData;            
        }

        ws.clients.forEach((client) => {
            if (client !== socket && client.readyState === webSocket.OPEN) {
                console.log('sent to client:', typeof (message), String(message));
                client.send(message.toString());
            }
        });
    });
});

