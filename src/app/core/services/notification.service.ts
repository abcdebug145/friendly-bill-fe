import { Injectable } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

import { AuthService } from '../auth/auth.service';

export interface NotificationResponse {
  id: string;
  userId: string;
  type: string;
  title?: string;
  body?: string;
  link?: string;
  isRead?: boolean;
  createdAt?: string;
}

interface ApiResponse<T> {
  message: string;
  data?: T;
  success: boolean;
  code: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private client: Client | null = null;
  private sub: StompSubscription | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService
  ) {}

  getNotifications(): Observable<ApiResponse<NotificationResponse[]>> {
    return this.http.get<ApiResponse<NotificationResponse[]>>('/api/users/notifications');
  }

  markRead(id: string): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(`/api/users/notifications/${id}/read`, {});
  }

  connect(onNotification: (notification: NotificationResponse) => void): void {
    this.disconnect();
    const token = this.auth.getAccessToken();
    if (!token) return;

    this.client = new Client({
      webSocketFactory: () => new SockJS('/api/ws') as never,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        if (!this.client) return;
        this.sub = this.client.subscribe('/user/queue/notifications', (msg: IMessage) => {
          try {
            onNotification(JSON.parse(msg.body) as NotificationResponse);
          } catch {
            /* ignore malformed notification */
          }
        });
      },
    });
    void this.client.activate();
  }

  disconnect(): void {
    try {
      this.sub?.unsubscribe();
    } catch {
      /* ignore */
    }
    this.sub = null;
    if (this.client) {
      try {
        void this.client.deactivate();
      } catch {
        /* ignore */
      }
      this.client = null;
    }
  }
}
