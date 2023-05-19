export interface SocketInfo {
    socketId: string;
    oracleId: string;
}

export enum Status {
    Uninitialized,
    InProgress,
    Ending,
}