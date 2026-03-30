import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface ChatMessageResponse {
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

interface ApiResponse<T> {
  message: string;
  data?: T;
  success: boolean;
  code: number;
}

@Injectable({ providedIn: 'root' })
export class GroupMessagesApiService {
  constructor(private readonly http: HttpClient) {}

  getMessages(groupId: string, cursor?: string, limit = 30): Observable<ApiResponse<ChatMessageResponse[]>> {
    const params: Record<string, string | number> = { limit };
    if (cursor) params['cursor'] = cursor;
    return this.http.get<ApiResponse<ChatMessageResponse[]>>(`/api/groups/${groupId}/messages`, { params });
  }

  getPresence(groupId: string): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`/api/groups/${groupId}/presence`);
  }

  uploadAttachment(groupId: string, file: File): Observable<ApiResponse<{ url: string }>> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<ApiResponse<{ url: string }>>(`/api/groups/${groupId}/messages/attachments`, fd);
  }
}
