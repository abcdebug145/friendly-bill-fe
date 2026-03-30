import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface GroupResponse {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  createdBy: string;
  isActive: boolean;
  createdAt: string;
  memberCount: number;
}

export interface GroupMemberResponse {
  id: string;
  groupId: string;
  userId?: string;
  userEmail: string;
  userFullName?: string;
  userAvatarUrl?: string;
  role: string;
  joinedAt?: string;
  invitedBy?: string;
  invitationStatus: string;
  inviteEmail?: string;
  inviteExpiresAt?: string;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  avatarUrl?: string;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
  avatarUrl?: string;
}

export interface InviteMemberRequest {
  email: string;
  role?: string;
}

export interface InviteCandidateResponse {
  userId: string;
  username: string;
  email: string;
  fullName?: string;
}

export interface BalanceResponse {
  userId: string;
  userName?: string;
  userEmail?: string;
  netAmount: number;
}

export interface DebtEdgeResponse {
  fromUserId: string;
  fromUserName?: string;
  fromUserEmail?: string;
  toUserId: string;
  toUserName?: string;
  toUserEmail?: string;
  amount: number;
}

export interface GroupBalancesResponse {
  balances: BalanceResponse[];
  debts: DebtEdgeResponse[];
}

export interface GroupSummaryResponse {
  groupId: string;
  totalSpent: number;
  totalSettled: number;
  expenseCount: number;
  settlementCount: number;
  totalsByCategory: Record<string, number>;
  topSpenderId?: string;
  topSpenderName?: string;
  topSpenderEmail?: string;
  topSpenderAmount: number;
}

interface ApiResponse<T> {
  message: string;
  data?: T;
  success: boolean;
  code: number;
}

@Injectable({ providedIn: 'root' })
export class GroupService {
  private readonly apiBase = '/api/groups';

  constructor(private readonly http: HttpClient) {}

  getGroups(): Observable<ApiResponse<GroupResponse[]>> {
    return this.http.get<ApiResponse<GroupResponse[]>>(this.apiBase);
  }

  getGroup(groupId: string): Observable<ApiResponse<GroupResponse>> {
    return this.http.get<ApiResponse<GroupResponse>>(`${this.apiBase}/${groupId}`);
  }

  createGroup(request: CreateGroupRequest): Observable<ApiResponse<GroupResponse>> {
    return this.http.post<ApiResponse<GroupResponse>>(this.apiBase, request);
  }

  updateGroup(groupId: string, request: UpdateGroupRequest): Observable<ApiResponse<GroupResponse>> {
    return this.http.put<ApiResponse<GroupResponse>>(`${this.apiBase}/${groupId}`, request);
  }

  deleteGroup(groupId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiBase}/${groupId}`);
  }

  getMembers(groupId: string): Observable<ApiResponse<GroupMemberResponse[]>> {
    return this.http.get<ApiResponse<GroupMemberResponse[]>>(`${this.apiBase}/${groupId}/members`);
  }

  inviteMember(groupId: string, request: InviteMemberRequest): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.apiBase}/${groupId}/members/invite`, request);
  }

  joinGroup(groupId: string, token: string): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.apiBase}/${groupId}/members/join`, null, {
      params: { token }
    });
  }

  searchInviteCandidates(
    groupId: string,
    keyword: string,
    limit = 8
  ): Observable<ApiResponse<InviteCandidateResponse[]>> {
    return this.http.get<ApiResponse<InviteCandidateResponse[]>>(
      `${this.apiBase}/${groupId}/members/invite-candidates`,
      { params: { keyword, limit } }
    );
  }

  removeMember(groupId: string, userId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiBase}/${groupId}/members/${userId}`);
  }

  resendInvite(groupId: string, userId: string): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.apiBase}/${groupId}/members/${userId}/resend-invite`, null);
  }

  getSummary(groupId: string): Observable<ApiResponse<GroupSummaryResponse>> {
    return this.http.get<ApiResponse<GroupSummaryResponse>>(`${this.apiBase}/${groupId}/summary`);
  }

  getBalances(groupId: string): Observable<ApiResponse<GroupBalancesResponse>> {
    return this.http.get<ApiResponse<GroupBalancesResponse>>(`${this.apiBase}/${groupId}/balances`);
  }
}
