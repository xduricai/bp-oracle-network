import { io } from "socket.io-client";
import { MerkleJson } from "merkle-json";
import { default as axios } from 'axios';
import { Subscription, SubscriptionData } from "./util.js";

export class OracleNode {
    mj = new MerkleJson();
    id: string;
    data: SubscriptionData[] = [];
    responses: SubscriptionData[][] = [];
    isLeader: boolean = false;
    
    constructor(id: string) { this.id = id; }

    async serve() {
        const socket = io("ws://localhost:3000");

        socket.on("connect", () => {
            socket.emit("register", { socketId: socket.id, oracleId: this.id });
        });

        socket.on("new-round", async () => {
            console.log(`New round registered by Oracle ${this.id}`);
            
            this.data = [];
            this.responses = [];
            const subscriptions: Subscription[] = [ { api: "https://jsonplaceholder.ir/users", address: `address ${this.id}` }, { api: "https://jsonplaceholder.ir/users", address: `address ${this.id}` } ]; //TODO

            for(let i = 0; i < subscriptions.length; i++) {
                const sub = subscriptions[i];
                const res = await axios.get(sub.api, { params: sub.params ? JSON.parse(sub.params) : {} });
                if(res.data) this.data.push({ data: JSON.stringify(res.data), address: sub.address });
                if(i === subscriptions.length - 1) socket.emit("report", this.data);
            }            
        });

        socket.on("to-leader", (data) => {
            this.responses.push(data);
            if(this.responses.length >= 3) {
                const final = this.aggregate();
                socket.emit("leader-report", final);
            }; //TODO change max 
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

