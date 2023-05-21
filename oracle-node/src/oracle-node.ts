import { io } from "socket.io-client";
import { MerkleJson } from "merkle-json";
import { default as axios } from 'axios';
import { Subscription, SubscriptionData } from "./util.js";
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import idl from "../../../oracle-smart-contract/target/idl/oracle_smart_contract.json" assert { type: "json" };
import id from "../../id.json" assert { type: "json" };

export class OracleNode {
    mj = new MerkleJson();
    id: number;
    data: SubscriptionData[] = [];
    responses: SubscriptionData[][] = [];
    isLeader: boolean = false;
    oracleCount: number = 0;
    
    constructor(id: number) { this.id = id; }

    async serve() {
        const connection = new Connection('http://127.0.0.1:8899');
        const programId = new PublicKey(idl.metadata.address);
        const walletKey = new Uint8Array(id);
        const keypair = Keypair.fromSecretKey(walletKey);
        const wallet = new anchor.Wallet(keypair);
        const provider = new anchor.AnchorProvider(connection, wallet, {});
        const program = new Program(idl as anchor.Idl, programId, provider);
        //TODO change on re-init
        const stateAddress = 'DJ9YaBTYWLDuPQGKi3uUk9N2jQ3sobuWEuVLXKbMpApk';
        const socket = io("ws://localhost:3000");

        socket.on("connect", () => {
            socket.emit("register", { socketId: socket.id, oracleId: this.id });
        });

        socket.on("new-round", async () => {
            console.log(`New round registered by Oracle ${this.id}`);
            
            const state = await program.account.state.fetch(stateAddress);
            this.oracleCount = state.oracleCount;
            const response = await program.account.subscription.all();

            const subscriptions: Subscription[] = response.filter(sub => sub.account.expiration.toNumber() > 0)
                .map(sub => ({
                    api: JSON.parse(sub.account.options).url,
                    params: JSON.parse(sub.account.options).params,
                    address: sub.publicKey.toString()
                }));


            this.data = [];
            this.responses = [];

            for(let i = 0; i < subscriptions.length; i++) {
                const sub = subscriptions[i];
                const res = await axios.get(sub.api, { params: sub.params || {} });
                if(res.data) this.data.push({ data: JSON.stringify(res.data), address: sub.address });
                if(i === subscriptions.length - 1) socket.emit("report", this.data);
            }            
        });

        socket.on("to-leader", (data) => {
            this.responses.push(data);
            if(this.responses.length >= this.oracleCount) {
                const final = this.aggregate();
                socket.emit("leader-report", final);
            };
        });

        socket.on("verify", (report) => {
            const dataHash = this.mj.hash(this.data.map(res => res.data));
            const reportHash = this.mj.hash(report.map((res: SubscriptionData) => res.data));

            console.log(`Report verified by Oracle ${this.id}`);
            dataHash === reportHash ? socket.emit("accept") : socket.emit("reject");
        });

        socket.on("retry", () => socket.emit("retry"));
    }

    private aggregate(): SubscriptionData[] {
        const map = new Map();
        let highestCount = 0;
        let highestIndex = 0;
        
        for(let i = 0; i < this.responses.length; i++) {
            const responseJson = this.responses[i].map(res => res.data);
            const hash = this.mj.hash(responseJson);

            if(map.has(hash)) {
                const old = map.get(hash);
                map.set(hash, { count: old.count + 1, index: old.index });
                
                if(old.count + 1 > highestCount) { 
                    highestIndex = old.index;
                    highestCount = old.count + 1; 
                }
            }
            else {
                map.set(hash, { count: 1, index: i });

                if(highestCount === 0) {
                    highestCount = 1;
                    highestIndex = i;
                }
            }
        }

        console.log(`Report aggregated by leader Oracle ${this.id}`);
        return this.responses[highestIndex];
    }

}

