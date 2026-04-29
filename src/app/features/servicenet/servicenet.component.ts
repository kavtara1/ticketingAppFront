import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';

import { AuthService } from '../../core/auth/auth.service';
import { API_ENDPOINTS } from '../../core/config/api.config';
import { ProfileMenuComponent } from '../../shared/profile-menu/profile-menu.component';

interface ServiceNetTicket {
  ticketId?: number | string;
  id?: number | string;
  region: string;
  address: string;
  roadSurface: string;
  responsiblePerson: string;
  contactPhone: string;
  time: string;
  sender: string;
  sendTo: string;
  comment: string;
}

interface TicketComment {
  commentId: number;
  ticketId: number;
  comment: string;
  author: string;
  createdAt: string;
}

interface ServiceNetTicketDetail {
  telephonegramId: number;
  ticketId: number;
  region: string;
  address: string;
  roadSurface: string;
  responsiblePerson: string;
  contactPhone: string;
  time: string;
  sender: string;
  sendTo: string;
  comment: string;
  author: string;
  comments: TicketComment[];
  originDepartment: string;
  assignedDepartment: string;
  createdDate: string;
  lastUpdate: string;
}

const REGION_OPTIONS = [
  'თბილისი',
  'აჭარა',
  'გურია',
  'იმერეთი',
  'კახეთი',
  'მცხეთა-მთიანეთი',
  'რაჭა-ლეჩხუმი',
  'სამეგრელო-ზემო სვანეთი',
  'სამცხე-ჯავახეთი',
  'ქვემო ქართლი',
  'შიდა ქართლი'
] as const;

@Component({
  selector: 'app-servicenet',
  imports: [ProfileMenuComponent],
  templateUrl: './servicenet.component.html',
  styleUrl: './servicenet.component.css'
})
export class ServiceNetComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  protected readonly currentUser = this.authService.getCurrentUser();
  protected readonly selectedTicketMenu = signal<'servicenet' | null>(null);
  protected readonly regionOptions = REGION_OPTIONS;
  protected readonly selectedRegion = signal<string>('all');
  protected readonly tickets = signal<ServiceNetTicket[]>([]);
  protected readonly isLoadingTickets = signal(false);
  protected readonly ticketsErrorMessage = signal('');
  protected readonly isDetailModalOpen = signal(false);
  protected readonly isLoadingDetail = signal(false);
  protected readonly detailErrorMessage = signal('');
  protected readonly selectedTicketDetail = signal<ServiceNetTicketDetail | null>(null);
  protected readonly isReturningTicket = signal(false);
  protected readonly isReturnConfirmOpen = signal(false);
  protected readonly returnErrorMessage = signal('');
  protected readonly commentText = signal('');
  protected readonly isSubmittingComment = signal(false);
  protected readonly commentErrorMessage = signal('');

  ngOnInit(): void {
    this.tickets.set([]);
    this.ticketsErrorMessage.set('');
    this.isLoadingTickets.set(false);
  }

  protected selectServiceNetTickets(): void {
    this.selectedTicketMenu.set('servicenet');
    if (this.selectedRegion() === 'all') {
      this.loadTickets();
    } else {
      this.loadTicketsByRegion(this.selectedRegion());
    }
  }

  protected reloadTickets(): void {
    if (this.selectedTicketMenu() === 'servicenet') {
      if (this.selectedRegion() !== 'all') {
        this.loadTicketsByRegion(this.selectedRegion());
      } else {
        this.loadTickets();
      }
    }
  }

  protected selectAllTickets(): void {
    this.selectedRegion.set('all');
    if (this.selectedTicketMenu() !== 'servicenet') {
      return;
    }
    this.loadTickets();
  }

  protected selectRegionFilter(region: string): void {
    this.selectedRegion.set(region);
    if (this.selectedTicketMenu() !== 'servicenet') {
      return;
    }
    this.loadTicketsByRegion(region);
  }

  protected openTicket(ticket: ServiceNetTicket): void {
    const ticketId = this.resolveTicketId(ticket);
    if (!ticketId) {
      this.detailErrorMessage.set('ტიკეტის ID ვერ მოიძებნა.');
      this.selectedTicketDetail.set(null);
      this.isDetailModalOpen.set(true);
      return;
    }

    this.isDetailModalOpen.set(true);
    this.isLoadingDetail.set(true);
    this.detailErrorMessage.set('');
    this.selectedTicketDetail.set(null);
    this.commentText.set('');
    this.commentErrorMessage.set('');
    this.returnErrorMessage.set('');
    this.isReturnConfirmOpen.set(false);

    this.http
      .get<ServiceNetTicketDetail>(`${API_ENDPOINTS.telephonegramTickets}${ticketId}/`)
      .subscribe({
        next: (ticketDetail) => {
          this.selectedTicketDetail.set(ticketDetail);
          this.isLoadingDetail.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.detailErrorMessage.set(this.getBackendErrorMessage(error, 'ტიკეტის გახსნა ვერ მოხერხდა.'));
          this.isLoadingDetail.set(false);
        }
      });
  }

  protected closeTicketDetails(): void {
    if (this.isLoadingDetail()) {
      return;
    }

    this.isDetailModalOpen.set(false);
    this.detailErrorMessage.set('');
    this.selectedTicketDetail.set(null);
    this.commentText.set('');
    this.commentErrorMessage.set('');
    this.returnErrorMessage.set('');
    this.isReturnConfirmOpen.set(false);
  }

  protected formatDateTime(value: string): string {
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      return value;
    }

    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');
    const hours = String(parsedDate.getHours()).padStart(2, '0');
    const minutes = String(parsedDate.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  protected onCommentChange(value: string): void {
    this.commentText.set(value);
  }

  protected addComment(): void {
    const detail = this.selectedTicketDetail();
    const comment = this.commentText().trim();

    if (!detail || !detail.ticketId) {
      this.commentErrorMessage.set('ტიკეტი ვერ მოიძებნა.');
      return;
    }

    if (!comment) {
      this.commentErrorMessage.set('კომენტარი ცარიელი ვერ იქნება.');
      return;
    }

    this.isSubmittingComment.set(true);
    this.commentErrorMessage.set('');

    this.http
      .post<{ comment: string }>(`${API_ENDPOINTS.ticketsBase}${detail.ticketId}/comments/`, { comment })
      .subscribe({
        next: () => {
          this.commentText.set('');
          this.isSubmittingComment.set(false);
          this.refreshTicketDetails(detail.ticketId);
        },
        error: (error: HttpErrorResponse) => {
          this.commentErrorMessage.set(this.getBackendErrorMessage(error, 'კომენტარის დამატება ვერ მოხერხდა.'));
          this.isSubmittingComment.set(false);
        }
      });
  }

  protected openReturnConfirm(): void {
    if (!this.selectedTicketDetail() || this.isReturningTicket()) {
      return;
    }
    this.isReturnConfirmOpen.set(true);
  }

  protected closeReturnConfirm(): void {
    if (this.isReturningTicket()) {
      return;
    }
    this.isReturnConfirmOpen.set(false);
  }

  protected confirmReturnToOrigin(): void {
    this.isReturnConfirmOpen.set(false);
    this.returnTicketToOrigin();
  }

  protected returnTicketToOrigin(): void {
    const detail = this.selectedTicketDetail();
    if (!detail?.ticketId || !detail.originDepartment || this.isReturningTicket()) {
      return;
    }

    this.isReturningTicket.set(true);
    this.returnErrorMessage.set('');

    this.http
      .patch(`${API_ENDPOINTS.ticketsBase}${detail.ticketId}/assignment/`, {
        assignedDepartment: detail.originDepartment
      })
      .subscribe({
        next: () => {
          this.isReturningTicket.set(false);
          this.closeTicketDetails();
          this.reloadTickets();
        },
        error: (error: HttpErrorResponse) => {
          this.returnErrorMessage.set(
            this.getBackendErrorMessage(error, 'ბილეთის დაბრუნება ვერ მოხერხდა.')
          );
          this.isReturningTicket.set(false);
        }
      });
  }

  private loadTickets(): void {
    const assignedDepartment = this.currentUser?.department;
    if (!assignedDepartment) {
      this.tickets.set([]);
      this.ticketsErrorMessage.set('დეპარტამენტი ვერ მოიძებნა.');
      this.isLoadingTickets.set(false);
      return;
    }

    this.isLoadingTickets.set(true);
    this.ticketsErrorMessage.set('');

    this.http
      .get<ServiceNetTicket[]>(API_ENDPOINTS.assignedTickets, { params: { assignedDepartment } })
      .subscribe({
        next: (tickets) => {
          this.tickets.set(tickets);
          this.isLoadingTickets.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.ticketsErrorMessage.set(this.getBackendErrorMessage(error, 'ბილეთების ჩატვირთვა ვერ მოხერხდა.'));
          this.isLoadingTickets.set(false);
        }
      });
  }

  private resolveTicketId(ticket: ServiceNetTicket): number | null {
    const rawId = ticket.ticketId || ticket.id;
    if (rawId === null || rawId === undefined || rawId === '') {
      return null;
    }

    const parsed = Number(rawId);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private loadTicketsByRegion(region: string): void {
    this.isLoadingTickets.set(true);
    this.ticketsErrorMessage.set('');

    this.http.get<ServiceNetTicket[]>(API_ENDPOINTS.ticketsByRegion, { params: { region } }).subscribe({
      next: (tickets) => {
        this.tickets.set(tickets);
        this.isLoadingTickets.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.ticketsErrorMessage.set(this.getBackendErrorMessage(error, 'ბილეთების ჩატვირთვა ვერ მოხერხდა.'));
        this.isLoadingTickets.set(false);
      }
    });
  }

  private refreshTicketDetails(ticketId: number): void {
    this.http.get<ServiceNetTicketDetail>(`${API_ENDPOINTS.telephonegramTickets}${ticketId}/`).subscribe({
      next: (ticketDetail) => this.selectedTicketDetail.set(ticketDetail),
      error: () => {}
    });
  }

  private getBackendErrorMessage(error: HttpErrorResponse, fallbackMessage: string): string {
    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }

    if (error.error && typeof error.error === 'object') {
      if (typeof error.error.detail === 'string' && error.error.detail.trim()) {
        return error.error.detail;
      }

      const firstEntry = Object.entries(error.error)[0];
      if (firstEntry) {
        const [, value] = firstEntry;
        if (Array.isArray(value) && value.length > 0) {
          return String(value[0]);
        }

        if (typeof value === 'string' && value.trim()) {
          return value;
        }
      }
    }

    return fallbackMessage;
  }
}
