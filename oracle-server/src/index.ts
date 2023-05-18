import { Server, Socket } from "socket.io";
import { SocketInfo, Status } from "./util.js";


const io: Server = new Server({});
const sockets: SocketInfo[] = [];
const socketList: Socket[] = [];
const roundDuration = 60000;

let leader: SocketInfo;
let status: Status = Status.Uninitialized;
//let interval: NodeJS.Timer | null = null;

const updateState = async () => {
    //status = true ? Status.InProgress : Status.Uninitialized;
    const response = true;

    status = response ? Status.InProgress : Status.Uninitialized; 
}

io.on("connection", async (socket) => {
    console.log(`New connection from socket ${socket.id}`);

    socket.on("register", async (data: SocketInfo) => {
        //if(state.sockets.includes...)
        if(!sockets.some(element => element.oracleId === data.oracleId)){
            sockets.push(data);
            socketList.push(socket);
        };

        if(status === Status.Uninitialized && socket.id === sockets[0].socketId) await updateState();
        if(status === Status.InProgress) socket.emit("new-round");
        else socket.emit("retry");
    });

    socket.on("done", () => io.emit("done"));
    
    socket.on("report", (data) => {
        leader = sockets[0]; // TODO remove
        io.to(leader.socketId).emit("toLeader", data);
    });

    socket.on("retry", () => {
        setTimeout(async () => {
            if(socket.id === sockets[0].socketId) await updateState();
            if(status === Status.InProgress) socket.emit("new-round");
            else socket.emit("retry");
        }, roundDuration);
    });
});

io.listen(3000);
