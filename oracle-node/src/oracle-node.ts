import { io } from "socket.io-client";
import _ from "lodash";
import { default as axios } from 'axios';



export class OracleNode {
    id: string;
    data: string[];
    
    constructor(id: string) {
        this.id = id;
    }

    async serve() {
        const socket = io("ws://localhost:3000");

        socket.on("connect", () => {
            socket.emit("register", { socketId: socket.id, oracleId: this.id });
        });

        socket.on("newRound", async () => {
            console.log(`New round registered by socket ${this.id}`);
            /*
            this.data = [];
            const subscriptions: Subscription[] = []; //TODO

            subscriptions.forEach(async sub => {
                const res = await axios.get(sub.api, { params: sub.params ? JSON.parse(sub.params) : {} });
                if(res.data) this.data.push(JSON.stringify(res.data));
            });

            socket.emit("report", this.id);
            */
        });

        socket.on("verify", (report) => {
            const identical = _.isEqual(JSON.stringify(this.data), JSON.stringify(report));

            if(identical) socket.emit("reject");
            else socket.emit("accept")
        });

        socket.on("test", (data) => {
            console.log(data);
            console.log(this.id);
        });

        socket.on("retry", () => socket.emit("retry"));
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