import { io } from "socket.io-client";
import { MerkleJson } from "merkle-json";
import _ from "lodash";
import { default as axios } from 'axios';



export class OracleNode {
    id: string;
    data: string[];
    responses: string[][] = [];
    isLeader: boolean = false;
    
    constructor(id: string) { this.id = id; }

    async serve() {
        const socket = io("ws://localhost:3000");

        socket.on("connect", () => {
            socket.emit("register", { socketId: socket.id, oracleId: this.id });
        });

        socket.on("new-round", async () => {
            console.log(`New round registered by socket ${this.id}`);
            
            this.data = [];
            this.responses = [];
            const subscriptions: Subscription[] = [ { api: "https://jsonplaceholder.ir/users" }, { api: "https://jsonplaceholder.ir/users" } ]; //TODO

            for(let i = 0; i < subscriptions.length; i++) {
                const sub = subscriptions[i];
                const res = await axios.get(sub.api, { params: sub.params ? JSON.parse(sub.params) : {} });
                if(res.data) this.data.push(JSON.stringify(res.data));
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
            _.isEqual(JSON.stringify(this.data), JSON.stringify(report)) ? socket.emit("accept") : socket.emit("reject");
        });

        socket.on("retry", () => socket.emit("retry"));
    }

    private aggregate(): string[] {
        const map = new Map();
        const mj = new MerkleJson();
        let highestCount = 0;
        let highestIndex = 0;
        
        for(let i = 0; i < this.responses.length; i++) {
            const hash = mj.hash(this.responses[i]);

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

        return this.responses[highestIndex];
    }

}

interface SubscriptionData {
    subscriptionId: number;
    data: string;
}

interface Subscription {
    api: string;
    params?: string;
}
