export type TransportType = 'internet' | 'lan' | 'wifi-direct' | 'bluetooth' | 'hotspot' | 'offline-queue';
export interface TransportStatus {
    type: TransportType;
    available: boolean;
    quality: 'excellent' | 'good' | 'poor' | 'unavailable';
    latencyMs?: number;
}
export interface TransportConfig {
    preferred: TransportType;
    fallbackOrder: TransportType[];
    autoFallback: boolean;
}
export type UserStatus = 'online' | 'away' | 'busy' | 'offline';
export interface User {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    publicKey: string;
    status: UserStatus;
    createdAt: string;
    lastSeenAt: string;
}
export type MessageStatus = 'queued' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
export type MessageType = 'text' | 'image' | 'file' | 'system' | 'typing';
export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    type: MessageType;
    content: string;
    status: MessageStatus;
    transport: TransportType;
    retryCount: number;
    createdAt: string;
    deliveredAt?: string;
    readAt?: string;
}
export interface OutboundMessage {
    id: string;
    conversationId: string;
    recipientId: string;
    type: MessageType;
    content: string;
    transport: TransportType;
    queuedAt: string;
    attempts: number;
}
export interface Participant {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    status: UserStatus;
}
export interface Conversation {
    id: string;
    participants: Participant[];
    lastMessage?: {
        id: string;
        content: string;
        senderId: string;
        createdAt: string;
        type: string;
    } | null;
    unreadCount: number;
    createdAt: string;
    updatedAt: string;
}
export interface ServerToClientEvents {
    'message:new': (message: Message) => void;
    'message:status': (data: {
        messageId: string;
        status: MessageStatus;
    }) => void;
    'user:status': (data: {
        userId: string;
        status: UserStatus;
    }) => void;
    'transport:status': (status: TransportStatus) => void;
    'conversation:updated': (conversation: Conversation) => void;
    'typing:start': (data: {
        conversationId: string;
        userId: string;
    }) => void;
    'typing:stop': (data: {
        conversationId: string;
        userId: string;
    }) => void;
    error: (data: {
        code: string;
        message: string;
    }) => void;
}
export interface ClientToServerEvents {
    'message:send': (message: OutboundMessage) => void;
    'message:read': (data: {
        messageId: string;
        conversationId: string;
    }) => void;
    'typing:start': (data: {
        conversationId: string;
    }) => void;
    'typing:stop': (data: {
        conversationId: string;
    }) => void;
    'transport:select': (transport: TransportType) => void;
    'user:status': (status: UserStatus) => void;
}
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
    };
    meta?: {
        timestamp: string;
        transport: TransportType;
    };
}
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    user: User;
}
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}
//# sourceMappingURL=index.d.ts.map