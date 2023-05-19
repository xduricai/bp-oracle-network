import { Server } from "socket.io";
import { SocketInfo, Status } from "./util.js";

const io: Server = new Server({});
const sockets: SocketInfo[] = [];
const roundDuration = 10000;

let leader: SocketInfo;
let status: Status = Status.Uninitialized;
let accepted: number = 0;
let total: number = 0;
let finalReport: String[] = [];

const updateState = async () => {
    //status = true ? Status.InProgress : Status.Uninitialized;
    //update leader TODO    
    const response = true;

    if(!response) status = Status.Uninitialized;
    if(status === Status.Uninitialized && response) status = Status.InProgress; 
}

const endRound = async () => {
    status = Status.Ending;
    
    if(accepted >= total * (2/3)) {
    }
    console.log(`Final report ${accepted >= total * (2/3) ? 'accepted' : 'rejected'} after approval by ${accepted} out of ${total} voters.`);
    await updateState();
    accepted = 0;
    total = 0;
    finalReport = [];
    //report to smart contract TODO

    setTimeout(async () => {
        if(status !== Status.Uninitialized) {
            status = Status.InProgress
            io.emit("new-round");
        }
        else io.emit("retry");
    }, roundDuration);
}

io.on("connection", async (socket) => {
    console.log(`New connection from socket ${socket.id}`);

    socket.on("register", async (data: SocketInfo) => {
        //if(state.sockets.includes...) TODO 
        if(!sockets.some(element => element.oracleId === data.oracleId)){
            sockets.push(data);
        };
        
        if(status === Status.Uninitialized && socket.id === sockets[0].socketId) await updateState();
        if(status === Status.InProgress) socket.emit("new-round");
        else socket.emit("retry");
    });

    socket.on("leader-report", (data) => {
        finalReport = data;
        console.log(`Final report aggregated by leader:\n ${finalReport}`);
        io.emit("verify", data);
    });

    socket.on("accept", () => {
        accepted++;
        total++;

        if(total === sockets.length) endRound();
    });
    socket.on("reject", () => {
        total++;

        if(total === sockets.length) endRound();
    });
    
    socket.on("report", (data) => {
        leader = sockets[0]; // TODO remove
        io.to(leader.socketId).emit("to-leader", data);
    });

    socket.on("retry", () => {
        setTimeout(async () => {
            if(socket.id === sockets[0].socketId) await updateState();
            if(status === Status.InProgress) io.emit("new-round");
            else socket.emit("retry");
        }, roundDuration);
    });
});

io.listen(3000);
