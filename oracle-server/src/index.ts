import { Server } from "socket.io";

const io = new Server({});

io.on('connection', (socket) => {
    
    socket.on('event', (event) => {
        
    });
});

io.listen(3000);