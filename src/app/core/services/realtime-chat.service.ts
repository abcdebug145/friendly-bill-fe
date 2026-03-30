import { Injectable } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

import { AuthService } from '../auth/auth.service';

export interface ChatWsEnvelope {
  type: string;
  message?: ChatMessagePayload;
  deletedMessageId?: string;
}

export interface ChatMessagePayload {
  id: string;
  groupId: string;
  senderId?: string;
  senderEmail?: string;
  senderName?: string;
  content?: string;
  messageType?: string;
  attachmentUrl?: string;
  isDeleted?: boolean;
  editedAt?: string;
  createdAt?: string;
}

export interface TypingPayload {
  type?: string;
  groupId: string;
  userId: string;
  userEmail?: string;
  typing: boolean;
}

export interface ReadReceiptPayload {
  type?: string;
  groupId: string;
  userId: string;
  lastReadMessageId: string;
}

export interface PresencePayload {
  type?: string;
  groupId: string;
  onlineUserIds: string[];
}

export interface RealtimeChatHandlers {
  onMain: (env: ChatWsEnvelope) => void;
  onTyping: (ev: TypingPayload) => void;
  onRead: (ev: ReadReceiptPayload) => void;
  onPresence: (ev: PresencePayload) => void;
}

@Injectable({ providedIn: 'root' })
export class RealtimeChatService {
  private client: Client | null = null;
  private subs: StompSubscription[] = [];
  private heartbeatId: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly auth: AuthService) {}

  disconnect(): void {
    if (this.heartbeatId != null) {
      clearInterval(this.heartbeatId);
      this.heartbeatId = null;
    }
    for (const s of this.subs) {
      try {
        s.unsubscribe();
      } catch {
        /* ignore */
      }
    }
    this.subs = [];
    if (this.client) {
      try {
        void this.client.deactivate();
      } catch {
        /* ignore */
      }
      this.client = null;
    }
  }

  connect(groupId: string, handlers: RealtimeChatHandlers): void {
    this.disconnect();
    const token = this.auth.getAccessToken();
    if (!token) {
      return;
    }

    this.client = new Client({
      webSocketFactory: () => new SockJS('/api/ws') as never,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        if (!this.client) return;
        this.subs.push(
          this.client.subscribe(`/topic/group.${groupId}`, (msg: IMessage) => {
            try {
              handlers.onMain(JSON.parse(msg.body) as ChatWsEnvelope);
            } catch {
              /* ignore malformed */
            }
          })
        );
        this.subs.push(
          this.client.subscribe(`/topic/group.${groupId}.typing`, (msg: IMessage) => {
            try {
              handlers.onTyping(JSON.parse(msg.body) as TypingPayload);
            } catch {
              /* ignore */
            }
          })
        );
        this.subs.push(
          this.client.subscribe(`/topic/group.${groupId}.read`, (msg: IMessage) => {
            try {
              handlers.onRead(JSON.parse(msg.body) as ReadReceiptPayload);
            } catch {
              /* ignore */
            }
          })
        );
        this.subs.push(
          this.client.subscribe(`/topic/group.${groupId}.presence`, (msg: IMessage) => {
            try {
              handlers.onPresence(JSON.parse(msg.body) as PresencePayload);
            } catch {
              /* ignore */
            }
          })
        );

        this.heartbeatId = setInterval(() => {
          this.client?.publish({ destination: `/app/chat/heartbeat/${groupId}` });
        }, 25_000);
      },
    });

    void this.client.activate();
  }

  publishSend(groupId: string, body: { content?: string; messageType?: string; attachmentUrl?: string }): void {
    this.client?.publish({ destination: `/app/chat/send/${groupId}`, body: JSON.stringify(body) });
  }

  publishEdit(groupId: string, messageId: string, content: string): void {
    this.client?.publish({
      destination: `/app/chat/edit/${groupId}/${messageId}`,
      body: JSON.stringify({ content }),
    });
  }

  publishDelete(groupId: string, messageId: string): void {
    this.client?.publish({ destination: `/app/chat/delete/${groupId}/${messageId}` });
  }

  publishTyping(groupId: string, typing: boolean): void {
    this.client?.publish({
      destination: `/app/chat/typing/${groupId}`,
      body: JSON.stringify({ typing }),
    });
  }

  publishRead(groupId: string, messageId: string): void {
    this.client?.publish({ destination: `/app/chat/read/${groupId}/${messageId}` });
  }
}
