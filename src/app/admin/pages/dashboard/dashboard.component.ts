import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, finalize, switchMap } from 'rxjs/operators';
import { Subject, forkJoin, of } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import {
  GroupService,
  GroupResponse,
  GroupMemberResponse,
  CreateGroupRequest,
  InviteCandidateResponse,
  GroupBalancesResponse,
  GroupSummaryResponse,
} from '../../../core/services/group.service';
import { ExpenseService, ExpenseResponse, CreateExpenseRequest } from '../../../core/services/expense.service';
import {
  SettlementService,
  SettlementResponse,
  CreateSettlementRequest,
} from '../../../core/services/settlement.service';
import {
  NotificationService,
  NotificationResponse,
} from '../../../core/services/notification.service';
import {
  GroupMessagesApiService,
  ChatMessageResponse,
} from '../../../core/services/group-messages-api.service';
import {
  RealtimeChatService,
  ChatWsEnvelope,
  ChatMessagePayload,
  TypingPayload,
  ReadReceiptPayload,
  PresencePayload,
} from '../../../core/services/realtime-chat.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { LanguageCode } from '../../../core/i18n/translations';
import { ProfileResponse, ProfileService } from '../../../core/services/profile.service';
import { ThemeMode, ThemeService } from '../../../core/services/theme.service';
import { UbButtonDirective } from '~/components/ui/button';

export const EXPENSE_CATEGORIES = [
  { value: 'FOOD', label: '🍽️ Ăn uống' },
  { value: 'TRANSPORT', label: '🚗 Di chuyển' },
  { value: 'ACCOMMODATION', label: '🏠 Chỗ ở' },
  { value: 'ENTERTAINMENT', label: '🎉 Giải trí' },
  { value: 'SHOPPING', label: '🛒 Mua sắm' },
  { value: 'UTILITIES', label: '💡 Tiện ích' },
  { value: 'OTHER', label: '📦 Khác' },
];

@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, NgClass, UbButtonDirective],
  templateUrl: './dashboard.component.html',
})
export class Dashboard implements OnInit, OnDestroy {
  @ViewChild('chatScroll') chatScroll?: ElementRef<HTMLDivElement>;
  @ViewChild('chatFileInput') chatFileInput?: ElementRef<HTMLInputElement>;

  // ─── State ────────────────────────────────────────────────────────────
  groups = signal<GroupResponse[]>([]);
  selectedGroup = signal<GroupResponse | null>(null);
  expenses = signal<ExpenseResponse[]>([]);
  members = signal<GroupMemberResponse[]>([]);

  // ─── Loading ──────────────────────────────────────────────────────────
  loadingGroups = signal(false);
  loadingExpenses = signal(false);
  loadingBalances = signal(false);
  loadingProfile = signal(false);
  submittingGroup = signal(false);
  submittingExpense = signal(false);
  submittingSettlement = signal(false);
  submittingProfile = signal(false);
  submittingPassword = signal(false);
  uploadingAvatar = signal(false);

  // ─── UI ───────────────────────────────────────────────────────────────
  activeTab = signal<'expenses' | 'balances' | 'charts' | 'chat'>('expenses');
  activeMenu = signal<'dashboard' | 'friends' | 'settings'>('dashboard');

  // ─── Chat ─────────────────────────────────────────────────────────────
  chatMessages = signal<ChatMessageResponse[]>([]);
  chatLoading = signal(false);
  chatLoadingMore = signal(false);
  chatHasMore = signal(true);
  chatInput = '';
  onlineUserIds = signal<Set<string>>(new Set());
  typingUserIds = signal<Set<string>>(new Set());
  readByUser = signal<Record<string, string>>({});
  editingMessageId = signal<string | null>(null);
  chatEditDraft = '';
  private typingStopTimer: ReturnType<typeof setTimeout> | null = null;
  private chatConnectedGroupId: string | null = null;
  private balancesRequestSeq = 0;

  // ─── Notifications ───────────────────────────────────────────────────
  notifications = signal<NotificationResponse[]>([]);
  notificationOpen = signal(false);
  unreadNotifications = computed(() => this.notifications().filter((n) => !n.isRead).length);

  // ─── Balances / settlements ───────────────────────────────────────────
  groupSummary = signal<GroupSummaryResponse | null>(null);
  groupBalances = signal<GroupBalancesResponse | null>(null);
  settlements = signal<SettlementResponse[]>([]);

  // ─── Modals ───────────────────────────────────────────────────────────
  showCreateGroupModal = signal(false);
  showEditGroupModal = signal(false);
  showDeleteGroupModal = signal(false);
  showCreateExpenseModal = signal(false);
  showEditExpenseModal = signal(false);
  showDeleteExpenseModal = signal(false);
  showInviteModal = signal(false);
  showSettlementModal = signal(false);

  // ─── Forms ────────────────────────────────────────────────────────────
  groupForm = { name: '', description: '' };
  expenseForm: CreateExpenseRequest = {
    description: '',
    amount: 0,
    category: '',
    splitType: 'EQUAL',
  };
  expenseAttachmentFile: File | null = null;
  inviteEmail = '';
  inviteKeyword = '';
  settlementForm: CreateSettlementRequest = {
    fromUserId: '',
    toUserId: '',
    amount: 0,
    paymentMethod: 'CASH',
    note: '',
  };
  inviteCandidates = signal<InviteCandidateResponse[]>([]);
  searchingInviteCandidates = signal(false);
  private readonly inviteKeyword$ = new Subject<string>();
  errorMessage = signal('');
  settingsMessage = signal('');
  settingsError = signal('');
  profile = signal<ProfileResponse | null>(null);
  profileForm = { fullName: '', phoneNumber: '' };
  passwordForm = { oldPassword: '', newPassword: '', confirmPassword: '' };

  // ─── Selection ────────────────────────────────────────────────────────
  expenseToDelete = signal<ExpenseResponse | null>(null);
  expenseToEdit = signal<ExpenseResponse | null>(null);

  // ─── Current user ─────────────────────────────────────────────────────
  currentUserEmail = signal('');
  /** Chữ hiển thị trên avatar navbar khi chưa có ảnh (ưu tiên họ tên, sau đó phần local của email). */
  navbarUserInitials = computed(() => {
    const full = this.profile()?.fullName?.trim();
    if (full) {
      const parts = full.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        const a = parts[0]?.[0] ?? '';
        const b = parts[parts.length - 1]?.[0] ?? '';
        return (a + b).toUpperCase();
      }
      return full.slice(0, 2).toUpperCase();
    }
    const email = this.currentUserEmail().trim();
    const local = email.includes('@') ? (email.split('@')[0] ?? '') : email;
    const two = local.slice(0, 2).toUpperCase();
    return two || '?';
  });

  currentUserId = computed(() => {
    const email = this.currentUserEmail();
    return this.members().find((m) => m.userEmail === email)?.userId ?? null;
  });

  typingLabel = computed(() => {
    const ids = [...this.typingUserIds()];
    const self = this.currentUserId();
    const names = ids
      .filter((id) => id !== self)
      .map((id) => {
        const m = this.members().find((mem) => mem.userId === id);
        return m?.userFullName ?? m?.userEmail ?? 'Ai đó';
      });
    if (!names.length) return '';
    return names.join(', ') + ' đang gõ...';
  });

  readonly categories = EXPENSE_CATEGORIES;

  constructor(
    private readonly authService: AuthService,
    private readonly groupService: GroupService,
    private readonly expenseService: ExpenseService,
    private readonly settlementService: SettlementService,
    private readonly messagesApi: GroupMessagesApiService,
    private readonly realtimeChat: RealtimeChatService,
    private readonly notificationService: NotificationService,
    private readonly profileService: ProfileService,
    public readonly i18n: I18nService,
    public readonly themeService: ThemeService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
    private readonly ngZone: NgZone
  ) {}

  ngOnInit(): void {
    const email = this.authService.getCurrentUserEmail();
    if (email) this.currentUserEmail.set(email);
    this.loadProfile();
    this.setupInviteSearch();
    this.loadGroups();
    this.loadNotifications();
    this.notificationService.connect((notification) => {
      this.ngZone.run(() => {
        this.notifications.update((list) => [notification, ...list.filter((n) => n.id !== notification.id)]);
        this.flush();
      });
    });

    this.route.queryParamMap.subscribe((params) => {
      const groupId = params.get('groupId');
      const inviteToken = params.get('inviteToken');
      if (!groupId || !inviteToken) return;

      this.groupService.joinGroup(groupId, inviteToken).subscribe({
        next: () => {
          this.errorMessage.set('');
          this.loadGroups();
          void this.router.navigate([], { queryParams: {} });
        },
        error: (e: HttpErrorResponse) => {
          this.errorMessage.set(this.extractMessage(e, 'Không thể tham gia nhóm từ link mời.'));
          void this.router.navigate([], { queryParams: {} });
        },
      });
    });
  }

  ngOnDestroy(): void {
    this.disconnectChat();
    this.notificationService.disconnect();
    if (this.typingStopTimer) {
      clearTimeout(this.typingStopTimer);
    }
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.notificationOpen()) {
      this.closeNotifications(true);
    }
  }

  selectTab(tab: 'expenses' | 'balances' | 'charts' | 'chat'): void {
    this.activeTab.set(tab);
    const g = this.selectedGroup();
    if (tab === 'chat' && g) {
      void this.ensureChatConnected();
    } else if (tab === 'balances' && g) {
      this.disconnectChat(false);
      this.loadBalances(g.id);
    } else {
      this.disconnectChat(false);
    }
  }

  selectMenu(menu: 'dashboard' | 'friends' | 'settings'): void {
    this.activeMenu.set(menu);
    this.errorMessage.set('');
    if (menu === 'settings') {
      this.disconnectChat(false);
      this.loadProfile();
    }
  }

  // ─── Group CRUD ───────────────────────────────────────────────────────

  loadGroups(): void {
    this.loadingGroups.set(true);
    this.groupService
      .getGroups()
      .pipe(finalize(() => { this.loadingGroups.set(false); this.flush(); }))
      .subscribe({
        next: (res) => {
          const list = res.data ?? [];
          this.groups.set(list);
          if (list.length && !this.selectedGroup()) {
            this.selectGroup(list[0]);
          }
        },
        error: () => this.groups.set([]),
      });
  }

  selectGroup(group: GroupResponse): void {
    const tab = this.activeTab();
    this.disconnectChat();
    this.selectedGroup.set(group);
    this.activeTab.set(tab);
    this.errorMessage.set('');
    this.loadExpenses(group.id);
    this.loadMembers(group.id);
    if (tab === 'chat') {
      queueMicrotask(() => void this.ensureChatConnected());
    } else if (tab === 'balances') {
      this.loadBalances(group.id);
    }
  }

  openCreateGroupModal(): void {
    this.groupForm = { name: '', description: '' };
    this.errorMessage.set('');
    this.showCreateGroupModal.set(true);
  }

  openEditGroupModal(): void {
    const g = this.selectedGroup();
    if (!g) return;
    this.groupForm = { name: g.name, description: g.description ?? '' };
    this.errorMessage.set('');
    this.showEditGroupModal.set(true);
  }

  createGroup(): void {
    if (!this.groupForm.name.trim()) {
      this.errorMessage.set('Tên nhóm không được để trống.');
      return;
    }
    this.submittingGroup.set(true);
    const req: CreateGroupRequest = {
      name: this.groupForm.name.trim(),
      description: this.groupForm.description.trim() || undefined,
    };
    this.groupService
      .createGroup(req)
      .pipe(finalize(() => { this.submittingGroup.set(false); this.flush(); }))
      .subscribe({
        next: (res) => {
          this.showCreateGroupModal.set(false);
          this.loadGroups();
          if (res.data) this.selectGroup(res.data);
        },
        error: (e: HttpErrorResponse) => this.errorMessage.set(this.extractMessage(e, 'Tạo nhóm thất bại.')),
      });
  }

  updateGroup(): void {
    const g = this.selectedGroup();
    if (!g || !this.groupForm.name.trim()) return;
    this.submittingGroup.set(true);
    this.groupService
      .updateGroup(g.id, {
        name: this.groupForm.name.trim(),
        description: this.groupForm.description.trim() || undefined,
      })
      .pipe(finalize(() => { this.submittingGroup.set(false); this.flush(); }))
      .subscribe({
        next: (res) => {
          this.showEditGroupModal.set(false);
          if (res.data) {
            this.selectedGroup.set(res.data);
            this.groups.update((gs) => gs.map((x) => (x.id === res.data!.id ? res.data! : x)));
          }
        },
        error: (e: HttpErrorResponse) => this.errorMessage.set(this.extractMessage(e, 'Cập nhật nhóm thất bại.')),
      });
  }

  confirmDeleteGroup(): void {
    this.showDeleteGroupModal.set(true);
  }

  deleteGroup(): void {
    const g = this.selectedGroup();
    if (!g) return;
    this.groupService
      .deleteGroup(g.id)
      .pipe(finalize(() => this.flush()))
      .subscribe({
        next: () => {
          this.showDeleteGroupModal.set(false);
          this.selectedGroup.set(null);
          this.expenses.set([]);
          this.members.set([]);
          this.disconnectChat();
          this.loadGroups();
        },
        error: (e: HttpErrorResponse) => this.errorMessage.set(this.extractMessage(e, 'Xóa nhóm thất bại.')),
      });
  }

  // ─── Member ───────────────────────────────────────────────────────────

  loadMembers(groupId: string): void {
    this.groupService
      .getMembers(groupId)
      .subscribe({ next: (res) => { this.members.set(res.data ?? []); this.flush(); } });
  }

  openInviteModal(): void {
    this.inviteEmail = '';
    this.inviteKeyword = '';
    this.inviteCandidates.set([]);
    this.errorMessage.set('');
    this.showInviteModal.set(true);
  }

  inviteMember(): void {
    const g = this.selectedGroup();
    if (!g || !this.inviteEmail.trim()) return;
    this.groupService
      .inviteMember(g.id, { email: this.inviteEmail.trim() })
      .pipe(finalize(() => this.flush()))
      .subscribe({
        next: () => {
          this.showInviteModal.set(false);
          this.loadMembers(g.id);
        },
        error: (e: HttpErrorResponse) => this.errorMessage.set(this.extractMessage(e, 'Mời thành viên thất bại.')),
      });
  }

  onInviteKeywordChange(): void {
    this.inviteKeyword$.next(this.inviteKeyword);
  }

  pickInviteCandidate(candidate: InviteCandidateResponse): void {
    this.inviteEmail = candidate.email;
    this.inviteKeyword = `${candidate.username} (${candidate.email})`;
    this.inviteCandidates.set([]);
    this.flush();
  }

  resendInvite(member: GroupMemberResponse): void {
    const g = this.selectedGroup();
    if (!g) return;
    this.groupService.resendInvite(g.id, member.id).subscribe({
      next: () => {
        this.loadMembers(g.id);
        this.errorMessage.set('');
        this.flush();
      },
      error: (e: HttpErrorResponse) => this.errorMessage.set(this.extractMessage(e, 'Gửi lại lời mời thất bại.')),
    });
  }

  isMemberOnline(userId?: string): boolean {
    if (!userId) return false;
    return this.onlineUserIds().has(userId);
  }

  // ─── Notifications ───────────────────────────────────────────────────

  loadNotifications(): void {
    this.notificationService.getNotifications().subscribe({
      next: (res) => {
        this.notifications.set(res.data ?? []);
        this.flush();
      },
      error: () => this.notifications.set([]),
    });
  }

  toggleNotifications(): void {
    if (this.notificationOpen()) {
      this.closeNotifications(true);
    } else {
      this.notificationOpen.set(true);
    }
  }

  closeNotifications(markUnreadAsRead = false): void {
    this.notificationOpen.set(false);
    if (!markUnreadAsRead) return;

    const unread = this.notifications().filter((n) => !n.isRead);
    if (!unread.length) return;

    this.notifications.update((list) => list.map((n) => ({ ...n, isRead: true })));
    forkJoin(unread.map((n) => this.notificationService.markRead(n.id))).subscribe({
      next: () => this.flush(),
      error: () => this.flush(),
    });
  }

  openNotification(notification: NotificationResponse): void {
    if (!notification.isRead) {
      this.notificationService.markRead(notification.id).subscribe({
        next: () => {
          this.notifications.update((list) =>
            list.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
          );
          this.flush();
        },
      });
    }
    this.closeNotifications(false);
    if (notification.link) {
      void this.router.navigateByUrl(notification.link);
    }
  }

  // ─── Settings / Account ───────────────────────────────────────────────

  loadProfile(): void {
    if (this.loadingProfile()) return;
    this.loadingProfile.set(true);
    this.profileService
      .getMe()
      .pipe(finalize(() => { this.loadingProfile.set(false); this.flush(); }))
      .subscribe({
        next: (res) => {
          const profile = res.data ?? null;
          this.profile.set(profile);
          this.profileForm = {
            fullName: profile?.fullName ?? '',
            phoneNumber: profile?.phoneNumber ?? '',
          };
          this.flush();
        },
        error: (e: HttpErrorResponse) => this.settingsError.set(this.extractMessage(e, 'Không tải được thông tin tài khoản.')),
      });
  }

  saveProfile(): void {
    const fullName = this.profileForm.fullName.trim();
    if (!fullName) {
      this.settingsError.set('Họ tên không được để trống.');
      return;
    }
    this.settingsError.set('');
    this.settingsMessage.set('');
    this.submittingProfile.set(true);
    this.profileService
      .updateMe({
        fullName,
        phoneNumber: this.profileForm.phoneNumber.trim() || undefined,
        avatarUrl: this.profile()?.avatarUrl,
      })
      .pipe(finalize(() => { this.submittingProfile.set(false); this.flush(); }))
      .subscribe({
        next: (res) => {
          this.profile.set(res.data ?? this.profile());
          this.settingsMessage.set('Đã cập nhật tài khoản.');
        },
        error: (e: HttpErrorResponse) => this.settingsError.set(this.extractMessage(e, 'Cập nhật tài khoản thất bại.')),
      });
  }

  changePassword(): void {
    this.settingsError.set('');
    this.settingsMessage.set('');
    if (this.passwordForm.newPassword.length < 6) {
      this.settingsError.set('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.settingsError.set('Mật khẩu xác nhận không khớp.');
      return;
    }
    this.submittingPassword.set(true);
    this.profileService
      .changePassword(this.passwordForm.oldPassword, this.passwordForm.newPassword)
      .pipe(finalize(() => { this.submittingPassword.set(false); this.flush(); }))
      .subscribe({
        next: () => {
          this.passwordForm = { oldPassword: '', newPassword: '', confirmPassword: '' };
          this.settingsMessage.set('Đã đổi mật khẩu.');
        },
        error: (e: HttpErrorResponse) => this.settingsError.set(this.extractMessage(e, 'Đổi mật khẩu thất bại.')),
      });
  }

  onSettingsAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.settingsError.set('');
    this.settingsMessage.set('');
    this.uploadingAvatar.set(true);
    this.profileService
      .uploadAvatar(file)
      .pipe(finalize(() => {
        this.uploadingAvatar.set(false);
        input.value = '';
        this.flush();
      }))
      .subscribe({
        next: (res) => {
          if (res.data?.url) {
            this.profile.set({ ...(this.profile() as ProfileResponse), avatarUrl: res.data.url });
            this.settingsMessage.set('Đã cập nhật avatar.');
          }
        },
        error: (e: HttpErrorResponse) => this.settingsError.set(this.extractMessage(e, 'Tải avatar thất bại.')),
      });
  }

  setLanguage(language: LanguageCode): void {
    this.i18n.setLanguage(language);
  }

  setTheme(theme: ThemeMode): void {
    this.themeService.setTheme(theme);
  }

  // ─── Chat realtime ────────────────────────────────────────────────────

  private disconnectChat(clearMessages = true): void {
    this.realtimeChat.disconnect();
    this.chatConnectedGroupId = null;
    if (clearMessages) {
      this.chatMessages.set([]);
      this.chatHasMore.set(true);
    }
    this.onlineUserIds.set(new Set());
    this.typingUserIds.set(new Set());
    this.readByUser.set({});
    this.editingMessageId.set(null);
    this.chatEditDraft = '';
  }

  private async ensureChatConnected(): Promise<void> {
    const g = this.selectedGroup();
    if (!g || this.activeTab() !== 'chat') return;
    if (this.chatConnectedGroupId === g.id) return;

    this.disconnectChat();
    this.chatConnectedGroupId = g.id;
    this.chatLoading.set(true);

    this.messagesApi.getPresence(g.id).subscribe({
      next: (res) => {
        const ids = res.data ?? [];
        this.onlineUserIds.set(new Set(ids));
        this.flush();
      },
      error: () => this.onlineUserIds.set(new Set()),
    });

    this.messagesApi.getMessages(g.id, undefined, 30).subscribe({
      next: (res) => {
        const list = res.data ?? [];
        this.chatMessages.set(list);
        this.chatHasMore.set(list.length >= 30);
        this.chatLoading.set(false);
        this.flush();
        this.scrollChatToBottom();
        const last = list[list.length - 1];
        if (last?.id) {
          this.realtimeChat.publishRead(g.id, last.id);
        }
      },
      error: () => {
        this.chatLoading.set(false);
        this.flush();
      },
    });

    this.realtimeChat.connect(g.id, {
      onMain: (env) => this.ngZone.run(() => this.applyChatEnvelope(env)),
      onTyping: (ev) => this.ngZone.run(() => this.applyTyping(ev)),
      onRead: (ev) => this.ngZone.run(() => this.applyRead(ev)),
      onPresence: (ev) => this.ngZone.run(() => this.applyPresence(ev)),
    });
  }

  private applyChatEnvelope(env: ChatWsEnvelope): void {
    if (env.type === 'MESSAGE' && env.message) {
      const m = this.payloadToRow(env.message);
      this.chatMessages.update((list) => {
        if (list.some((x) => x.id === m.id)) return list;
        return [...list, m];
      });
      this.scrollChatToBottom();
      const g = this.selectedGroup();
      if (g && m.id && m.senderId !== this.currentUserId()) {
        this.realtimeChat.publishRead(g.id, m.id);
      }
    } else if (env.type === 'EDIT' && env.message) {
      const m = this.payloadToRow(env.message);
      this.chatMessages.update((list) => list.map((x) => (x.id === m.id ? m : x)));
    } else if (env.type === 'DELETE' && env.deletedMessageId) {
      const id = env.deletedMessageId;
      this.chatMessages.update((list) =>
        list.map((x) => (x.id === id ? { ...x, isDeleted: true, content: '' } : x))
      );
    }
    this.flush();
  }

  private payloadToRow(p: ChatMessagePayload): ChatMessageResponse {
    return {
      id: p.id,
      groupId: p.groupId,
      senderId: p.senderId,
      senderEmail: p.senderEmail,
      senderName: p.senderName,
      content: p.content,
      messageType: p.messageType,
      attachmentUrl: p.attachmentUrl,
      isDeleted: p.isDeleted,
      editedAt: p.editedAt,
      createdAt: p.createdAt,
    };
  }

  private applyTyping(ev: TypingPayload): void {
    this.typingUserIds.update((set) => {
      const next = new Set(set);
      if (ev.typing) {
        next.add(ev.userId);
      } else {
        next.delete(ev.userId);
      }
      return next;
    });
    this.flush();
  }

  private applyRead(ev: ReadReceiptPayload): void {
    this.readByUser.update((m) => ({ ...m, [ev.userId]: ev.lastReadMessageId }));
    this.flush();
  }

  private applyPresence(ev: PresencePayload): void {
    const ids = ev.onlineUserIds ?? [];
    this.onlineUserIds.set(new Set(ids));
    this.flush();
  }

  loadMoreChatMessages(): void {
    const g = this.selectedGroup();
    const msgs = this.chatMessages();
    if (!g || !msgs.length || !this.chatHasMore() || this.chatLoadingMore()) return;
    const oldest = msgs[0];
    if (!oldest?.createdAt) return;
    this.chatLoadingMore.set(true);
    this.messagesApi.getMessages(g.id, oldest.createdAt, 30).subscribe({
      next: (res) => {
        const older = res.data ?? [];
        this.chatHasMore.set(older.length >= 30);
        if (older.length) {
          this.chatMessages.update((cur) => [...older, ...cur]);
        }
        this.chatLoadingMore.set(false);
        this.flush();
      },
      error: () => {
        this.chatLoadingMore.set(false);
        this.flush();
      },
    });
  }

  onChatScroll(event: Event): void {
    const el = event.target as HTMLDivElement;
    if (el.scrollTop < 40) {
      this.loadMoreChatMessages();
    }
  }

  sendChatMessage(): void {
    const g = this.selectedGroup();
    if (!g || !this.chatInput.trim()) return;
    this.realtimeChat.publishSend(g.id, {
      content: this.chatInput.trim(),
      messageType: 'TEXT',
    });
    this.chatInput = '';
    const gid = g.id;
    this.realtimeChat.publishTyping(gid, false);
    this.flush();
  }

  onChatInput(): void {
    const g = this.selectedGroup();
    if (!g) return;
    this.realtimeChat.publishTyping(g.id, true);
    if (this.typingStopTimer) clearTimeout(this.typingStopTimer);
    this.typingStopTimer = setTimeout(() => {
      this.realtimeChat.publishTyping(g.id, false);
      this.typingStopTimer = null;
    }, 1500);
  }

  openChatFilePicker(): void {
    this.chatFileInput?.nativeElement.click();
  }

  onChatFileSelected(event: Event): void {
    const g = this.selectedGroup();
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!g || !file) return;
    this.messagesApi.uploadAttachment(g.id, file).subscribe({
      next: (res) => {
        const url = res.data?.url;
        if (url) {
          const isImg = file.type.startsWith('image/');
          this.realtimeChat.publishSend(g.id, {
            content: file.name,
            messageType: isImg ? 'IMAGE' : 'FILE',
            attachmentUrl: url,
          });
        }
        input.value = '';
        this.flush();
      },
      error: () => {
        input.value = '';
        this.errorMessage.set('Tải file thất bại.');
        this.flush();
      },
    });
  }

  startEditMessage(m: ChatMessageResponse): void {
    if (m.senderId !== this.currentUserId() || m.isDeleted) return;
    this.editingMessageId.set(m.id);
    this.chatEditDraft = m.content ?? '';
    this.flush();
  }

  cancelEditMessage(): void {
    this.editingMessageId.set(null);
    this.chatEditDraft = '';
    this.flush();
  }

  saveEditMessage(): void {
    const g = this.selectedGroup();
    const id = this.editingMessageId();
    if (!g || !id || !this.chatEditDraft.trim()) return;
    this.realtimeChat.publishEdit(g.id, id, this.chatEditDraft.trim());
    this.cancelEditMessage();
  }

  deleteChatMessage(m: ChatMessageResponse): void {
    const g = this.selectedGroup();
    if (!g || m.senderId !== this.currentUserId()) return;
    if (!confirm('Xóa tin nhắn này?')) return;
    this.realtimeChat.publishDelete(g.id, m.id);
  }

  formatChatTime(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
  }

  private scrollChatToBottom(): void {
    queueMicrotask(() => {
      const el = this.chatScroll?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }

  // ─── Expense CRUD ─────────────────────────────────────────────────────

  loadExpenses(groupId: string): void {
    this.loadingExpenses.set(true);
    this.expenseService
      .getExpenses(groupId)
      .pipe(finalize(() => { this.loadingExpenses.set(false); this.flush(); }))
      .subscribe({
        next: (res) => this.expenses.set(res.data ?? []),
        error: () => this.expenses.set([]),
      });
  }

  openCreateExpenseModal(): void {
    if (!this.selectedGroup()) return;
    this.expenseForm = { description: '', amount: 0, category: '', splitType: 'EQUAL' };
    this.expenseAttachmentFile = null;
    this.errorMessage.set('');
    this.showCreateExpenseModal.set(true);
  }

  createExpense(): void {
    const g = this.selectedGroup();
    if (!g) return;
    if (!this.expenseForm.description?.trim() || !this.expenseForm.amount) {
      this.errorMessage.set('Vui lòng điền tên và số tiền.');
      return;
    }
    this.submittingExpense.set(true);
    const req: CreateExpenseRequest = {
      ...this.expenseForm,
      description: this.expenseForm.description.trim(),
      amount: Number(this.expenseForm.amount),
      category: this.expenseForm.category?.trim() || undefined,
      splitType: 'EQUAL',
    };
    if (this.expenseAttachmentFile) {
      this.expenseService.uploadAttachment(g.id, this.expenseAttachmentFile).subscribe({
        next: (res) => {
          this.createExpenseWithPayload(g.id, { ...req, receiptImageUrl: res.data?.url });
        },
        error: (e: HttpErrorResponse) => {
          this.submittingExpense.set(false);
          this.errorMessage.set(this.extractMessage(e, 'Tải file đính kèm thất bại.'));
          this.flush();
        },
      });
      return;
    }

    this.createExpenseWithPayload(g.id, req);
  }

  private createExpenseWithPayload(groupId: string, req: CreateExpenseRequest): void {
    this.expenseService
      .createExpense(groupId, req)
      .pipe(finalize(() => { this.submittingExpense.set(false); this.flush(); }))
      .subscribe({
        next: () => {
          this.showCreateExpenseModal.set(false);
          this.expenseAttachmentFile = null;
          this.loadExpenses(groupId);
          this.loadBalances(groupId);
        },
        error: (e: HttpErrorResponse) => this.errorMessage.set(this.extractMessage(e, 'Tạo chi phí thất bại.')),
      });
  }

  onExpenseAttachmentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.expenseAttachmentFile = input.files?.[0] ?? null;
    this.flush();
  }

  clearExpenseAttachment(): void {
    this.expenseAttachmentFile = null;
    this.flush();
  }

  openEditExpenseModal(expense: ExpenseResponse): void {
    this.expenseToEdit.set(expense);
    this.expenseForm = {
      description: expense.description,
      amount: expense.amount,
      category: expense.category ?? '',
      receiptImageUrl: expense.receiptImageUrl,
      splitType: 'EQUAL',
    };
    this.expenseAttachmentFile = null;
    this.errorMessage.set('');
    this.showEditExpenseModal.set(true);
  }

  updateExpense(): void {
    const g = this.selectedGroup();
    const e = this.expenseToEdit();
    if (!g || !e) return;
    this.submittingExpense.set(true);
    this.expenseService
      .updateExpense(g.id, e.id, {
        description: this.expenseForm.description?.trim(),
        amount: Number(this.expenseForm.amount),
        category: this.expenseForm.category?.trim() || undefined,
      })
      .pipe(finalize(() => { this.submittingExpense.set(false); this.flush(); }))
      .subscribe({
        next: () => {
          this.showEditExpenseModal.set(false);
          this.expenseToEdit.set(null);
          this.loadExpenses(g.id);
          this.loadBalances(g.id);
        },
        error: (err: HttpErrorResponse) => this.errorMessage.set(this.extractMessage(err, 'Cập nhật thất bại.')),
      });
  }

  confirmDeleteExpense(expense: ExpenseResponse): void {
    this.expenseToDelete.set(expense);
    this.showDeleteExpenseModal.set(true);
  }

  deleteExpense(): void {
    const g = this.selectedGroup();
    const e = this.expenseToDelete();
    if (!g || !e) return;
    this.expenseService
      .deleteExpense(g.id, e.id)
      .pipe(finalize(() => this.flush()))
      .subscribe({
        next: () => {
          this.showDeleteExpenseModal.set(false);
          this.expenseToDelete.set(null);
          this.loadExpenses(g.id);
          this.loadBalances(g.id);
        },
        error: (err: HttpErrorResponse) => this.errorMessage.set(this.extractMessage(err, 'Xóa chi phí thất bại.')),
      });
  }

  // ─── Balances / Settlement ────────────────────────────────────────────

  loadBalances(groupId: string): void {
    const seq = ++this.balancesRequestSeq;
    this.loadingBalances.set(true);
    forkJoin({
      summary: this.groupService.getSummary(groupId),
      balances: this.groupService.getBalances(groupId),
      settlements: this.settlementService.getSettlements(groupId),
    })
      .pipe(finalize(() => {
        if (seq === this.balancesRequestSeq) {
          this.loadingBalances.set(false);
          this.flush();
        }
      }))
      .subscribe({
        next: ({ summary, balances, settlements }) => {
          if (seq !== this.balancesRequestSeq) return;
          this.groupSummary.set(summary.data ?? null);
          this.groupBalances.set(balances.data ?? null);
          this.settlements.set(settlements.data ?? []);
          this.flush();
        },
        error: () => {
          if (seq !== this.balancesRequestSeq) return;
          this.groupSummary.set(null);
          this.groupBalances.set(null);
          this.settlements.set([]);
        },
      });
  }

  openSettlementModal(edge?: { fromUserId: string; toUserId: string; amount: number }): void {
    const firstDebt = edge ?? this.groupBalances()?.debts?.[0];
    this.settlementForm = {
      fromUserId: firstDebt?.fromUserId ?? '',
      toUserId: firstDebt?.toUserId ?? '',
      amount: firstDebt?.amount ?? 0,
      paymentMethod: 'CASH',
      note: '',
    };
    this.errorMessage.set('');
    this.showSettlementModal.set(true);
  }

  createSettlement(): void {
    const g = this.selectedGroup();
    if (!g || !this.settlementForm.fromUserId || !this.settlementForm.toUserId || !this.settlementForm.amount) {
      this.errorMessage.set('Vui lòng chọn người trả, người nhận và số tiền.');
      return;
    }
    this.submittingSettlement.set(true);
    this.settlementService
      .createSettlement(g.id, {
        ...this.settlementForm,
        amount: Number(this.settlementForm.amount),
        note: this.settlementForm.note?.trim() || undefined,
      })
      .pipe(finalize(() => { this.submittingSettlement.set(false); this.flush(); }))
      .subscribe({
        next: () => {
          this.showSettlementModal.set(false);
          this.loadBalances(g.id);
          this.loadExpenses(g.id);
        },
        error: (e: HttpErrorResponse) => this.errorMessage.set(this.extractMessage(e, 'Ghi nhận thanh toán thất bại.')),
      });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  getMyShare(expense: ExpenseResponse): number {
    const uid = this.currentUserId();
    if (!uid) return 0;
    return expense.splits.find((s) => s.userId === uid)?.shareAmount ?? 0;
  }

  totalSpent(): number {
    return this.expenses().reduce((sum, e) => sum + Number(e.amount), 0);
  }

  categoryLabel(value?: string): string {
    return this.categories.find((c) => c.value === value)?.label ?? value ?? '📦 Khác';
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  }

  getInitials(name?: string): string {
    if (!name) return '?';
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  }

  getAvatarColor(str?: string): string {
    const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-rose-500', 'bg-amber-500', 'bg-teal-500'];
    if (!str) return colors[0];
    return colors[str.charCodeAt(0) % colors.length];
  }

  closeAllModals(): void {
    this.showCreateGroupModal.set(false);
    this.showEditGroupModal.set(false);
    this.showDeleteGroupModal.set(false);
    this.showCreateExpenseModal.set(false);
    this.showEditExpenseModal.set(false);
    this.showDeleteExpenseModal.set(false);
    this.showInviteModal.set(false);
    this.showSettlementModal.set(false);
    this.errorMessage.set('');
  }

  logout(): void {
    this.disconnectChat();
    this.authService.clearSession();
    void this.router.navigate(['/login']);
  }

  goProfile(): void {
    void this.router.navigate(['/profile']);
  }

  private flush(): void {
    this.ngZone.run(() => {
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
  }

  private setupInviteSearch(): void {
    this.inviteKeyword$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((keyword) => {
          const groupId = this.selectedGroup()?.id;
          if (!groupId || keyword.trim().length < 2) {
            this.inviteCandidates.set([]);
            return of({ data: [] as InviteCandidateResponse[] });
          }
          this.searchingInviteCandidates.set(true);
          return this.groupService
            .searchInviteCandidates(groupId, keyword.trim())
            .pipe(finalize(() => this.searchingInviteCandidates.set(false)));
        })
      )
      .subscribe({
        next: (res) => {
          this.inviteCandidates.set(res?.data ?? []);
          this.flush();
        },
        error: () => {
          this.inviteCandidates.set([]);
          this.flush();
        },
      });
  }

  private extractMessage(error: HttpErrorResponse, fallback: string): string {
    const payload = error?.error;
    if (typeof payload === 'string') {
      try { return (JSON.parse(payload) as { message?: string }).message ?? fallback; } catch { return fallback; }
    }
    if (payload && typeof payload === 'object' && 'message' in payload) {
      const m = (payload as { message?: unknown }).message;
      return typeof m === 'string' && m ? m : fallback;
    }
    return fallback;
  }
}
