import { Server } from "socket.io";

const io: Server = new Server({});
const sockets: SocketInfo[] = [];

let leader: SocketInfo;

io.on("connection", (socket) => {
    console.log(socket.id);

    setTimeout(() => {
        socket.emit("newRound");
    }, 5000);

    socket.on("register", (data: SocketInfo) => {
        sockets.push(data);
    });
    
    socket.on("report", (data) => {
        leader = sockets[0];
        io.to(leader.socketId).emit("test", data);
    });
});

io.listen(3000);

interface SocketInfo {
    socketId: string;
    oracleId: string;
}