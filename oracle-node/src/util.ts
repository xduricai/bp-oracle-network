export interface SubscriptionData {
    data: string;
    address: string
}

export interface Subscription {
    api: string;
    address: string;
    params?: string;
}