export interface SocketInfo {
    socketId: string;
    oracleId: string;
}

export interface SubscriptionData {
    data: string;
    address: string
}

export enum Status {
    Uninitialized,
    InProgress,
    Ending,
}