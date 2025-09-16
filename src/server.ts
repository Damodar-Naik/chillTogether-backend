import { time } from 'console';
import webSocket from 'ws';

const ws = new webSocket.Server({ port: 8080 });

type socketMessage = {
    type: 'play' | 'pause' | 'seek' | 'connected';
    message: string;
}
let lastSeek = {
    time: 0,
    currentTime: 0
}
ws.on('connection', (socket) => {
    console.log('a user connected');
    
    const data: socketMessage = {
        type: 'connected',
        message: JSON.stringify(lastSeek)
    }
    socket.send(JSON.stringify(data));

    socket.on('message', (message) => {
        console.log('received: %s', message);
        const parsedMessage = JSON.parse(message.toString()) as socketMessage;
        if (['seek', 'play'].includes(parsedMessage.type)) {
            lastSeek = {
                time: Number(parsedMessage.message),
                currentTime: Date.now()
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

