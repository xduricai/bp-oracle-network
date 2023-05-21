export interface SocketInfo {
    socketId: string;
    oracleId: number;
}

export interface SubscriptionData {
    data: string;
    address: string
}

export interface State {
    initialized: boolean;
    oracles: number[];
    leaderId: number;
}

export enum Status {
    Uninitialized,
    InProgress,
    Ending,
}