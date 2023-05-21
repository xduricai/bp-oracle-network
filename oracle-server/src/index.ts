import { Server } from "socket.io";
import { SocketInfo, State, Status, SubscriptionData } from "./util.js";
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import idl from "../../../oracle-smart-contract/target/idl/oracle_smart_contract.json" assert { type: "json" };
import id from "../../id.json" assert { type: "json" };

const connection = new Connection('http://127.0.0.1:8899');
const programId = new PublicKey(idl.metadata.address);
const walletKey = new Uint8Array(id);
const keypair = Keypair.fromSecretKey(walletKey);
const wallet = new anchor.Wallet(keypair);
const provider = new anchor.AnchorProvider(connection, wallet, {});
const program = new Program(idl as anchor.Idl, programId, provider);
//TODO change on re-init
const stateAddress = 'DJ9YaBTYWLDuPQGKi3uUk9N2jQ3sobuWEuVLXKbMpApk';

const io: Server = new Server({});
const sockets: SocketInfo[] = [];
const roundDuration = 60000;

let state: State;
let status: Status = Status.Uninitialized;
let accepted: number = 0;
let total: number = 0;
let finalReport: SubscriptionData[] = [];

const updateState = async () => {
    const response = await program.account.state.fetch(stateAddress);
    state = { 
        initialized: response.initialized,
        leaderId: response.leaderId,
        oracles: response.oracles
        .filter(oracle => oracle.id != 0)
        .map(oracle => oracle.id) 
    }

    if(!state.initialized) status = Status.Uninitialized;
    if(status === Status.Uninitialized && state.initialized) status = Status.InProgress; 
}

const endRound = async () => {
    const reportAccepted = accepted >= total * (2/3);
    status = Status.Ending;
    console.log(`Final report ${accepted >= total * (2/3) ? 'accepted' : 'rejected'} after approval by ${accepted} out of ${total} voters.`);
    

    if(reportAccepted) {
        finalReport.forEach(res => {
            if (res.data.length >= 800) res.data = res.data.slice(0, 800);
            
            program.methods.reportData(res.data).accounts({
                subscription: res.address
            })
            .rpc();

            console.log(`Forwarding response to: ${res.address}\n`);
            console.log(`Response body: ${res.data}\n\n`);
        })
    }

    await program.methods.endRound(reportAccepted).accounts({
        state: stateAddress,
        recentSlothashes: new PublicKey('SysvarS1otHashes111111111111111111111111111')
    })
    .rpc();

    await updateState();
    accepted = 0;
    total = 0;
    finalReport = [];

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
        if(state.oracles.includes(data.oracleId) && (!sockets.some(element => element.oracleId === data.oracleId))) {
           sockets.push(data);
        }
        
        if(status === Status.Uninitialized && socket.id === sockets[0].socketId) await updateState();
        if(status === Status.InProgress) socket.emit("new-round");
        else socket.emit("retry");
    });

    socket.on("leader-report", (data) => {
        const leader = sockets.find(socket => socket.oracleId === state.leaderId);
        if(leader.socketId !== socket.id) return;

        finalReport = data;
        console.log(`Final report aggregated by leader.`);
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
        console.log(`Leader: ${state.leaderId}`);
        sockets.forEach(sock => console.log(sock));
        const leader = sockets.find(socket => socket.oracleId === state.leaderId);

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

await updateState();

io.listen(3000);
