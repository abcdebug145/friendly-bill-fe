import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface CreateSettlementRequest {
  fromUserId: string;
  toUserId: string;
  amount: number;
  paymentMethod?: string;
  note?: string;
}

export interface SettlementResponse {
  id: string;
  groupId: string;
  fromUserId: string;
  fromUserName?: string;
  fromUserEmail?: string;
  toUserId: string;
  toUserName?: string;
  toUserEmail?: string;
  amount: number;
  settlementDate?: string;
  paymentMethod?: string;
  notes?: string;
  status: string;
  createdAt?: string;
}

interface ApiResponse<T> {
  message: string;
  data?: T;
  success: boolean;
  code: number;
}

@Injectable({ providedIn: 'root' })
export class SettlementService {
  constructor(private readonly http: HttpClient) {}

  getSettlements(groupId: string): Observable<ApiResponse<SettlementResponse[]>> {
    return this.http.get<ApiResponse<SettlementResponse[]>>(`/api/groups/${groupId}/settlements`);
  }

  createSettlement(groupId: string, request: CreateSettlementRequest): Observable<ApiResponse<SettlementResponse>> {
    return this.http.post<ApiResponse<SettlementResponse>>(`/api/groups/${groupId}/settlements`, request);
  }

  completeSettlement(groupId: string, settlementId: string): Observable<ApiResponse<SettlementResponse>> {
    return this.http.post<ApiResponse<SettlementResponse>>(
      `/api/groups/${groupId}/settlements/${settlementId}/complete`,
      null
    );
  }

  cancelSettlement(groupId: string, settlementId: string): Observable<ApiResponse<SettlementResponse>> {
    return this.http.post<ApiResponse<SettlementResponse>>(
      `/api/groups/${groupId}/settlements/${settlementId}/cancel`,
      null
    );
  }
}
