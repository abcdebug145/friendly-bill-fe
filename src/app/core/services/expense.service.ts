import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface ExpenseSplitResponse {
  id: string;
  userId: string;
  userFullName?: string;
  userEmail?: string;
  shareAmount: number;
  percentage?: number;
  isSettled: boolean;
  settledAt?: string;
}

export interface ExpenseResponse {
  id: string;
  groupId: string;
  paidBy: string;
  paidByName?: string;
  paidByEmail?: string;
  amount: number;
  description: string;
  category?: string;
  expenseDate?: string;
  notes?: string;
  receiptImageUrl?: string;
  createdAt: string;
  splits: ExpenseSplitResponse[];
}

export interface ExpenseSplitRequest {
  userId: string;
  percentage?: number;
}

export interface CreateExpenseRequest {
  amount: number;
  description: string;
  category?: string;
  expenseDate?: string;
  notes?: string;
  receiptImageUrl?: string;
  paidByUserId?: string;
  splitType?: 'EQUAL' | 'PERCENTAGE';
  splits?: ExpenseSplitRequest[];
}

export interface UpdateExpenseRequest {
  amount?: number;
  description?: string;
  category?: string;
  expenseDate?: string;
  notes?: string;
  receiptImageUrl?: string;
  paidByUserId?: string;
  splitType?: 'EQUAL' | 'PERCENTAGE';
  splits?: ExpenseSplitRequest[];
}

interface ApiResponse<T> {
  message: string;
  data?: T;
  success: boolean;
  code: number;
}

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  constructor(private readonly http: HttpClient) {}

  private base(groupId: string): string {
    return `/api/groups/${groupId}/expenses`;
  }

  getExpenses(groupId: string): Observable<ApiResponse<ExpenseResponse[]>> {
    return this.http.get<ApiResponse<ExpenseResponse[]>>(this.base(groupId));
  }

  getExpense(groupId: string, expenseId: string): Observable<ApiResponse<ExpenseResponse>> {
    return this.http.get<ApiResponse<ExpenseResponse>>(`${this.base(groupId)}/${expenseId}`);
  }

  createExpense(groupId: string, request: CreateExpenseRequest): Observable<ApiResponse<ExpenseResponse>> {
    return this.http.post<ApiResponse<ExpenseResponse>>(this.base(groupId), request);
  }

  uploadAttachment(groupId: string, file: File): Observable<ApiResponse<{ url: string }>> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ApiResponse<{ url: string }>>(`${this.base(groupId)}/attachments`, form);
  }

  updateExpense(
    groupId: string,
    expenseId: string,
    request: UpdateExpenseRequest
  ): Observable<ApiResponse<ExpenseResponse>> {
    return this.http.put<ApiResponse<ExpenseResponse>>(`${this.base(groupId)}/${expenseId}`, request);
  }

  deleteExpense(groupId: string, expenseId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.base(groupId)}/${expenseId}`);
  }
}
