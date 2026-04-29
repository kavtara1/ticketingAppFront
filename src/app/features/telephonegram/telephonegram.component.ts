import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../../core/auth/auth.service';
import { API_ENDPOINTS } from '../../core/config/api.config';
import { ProfileMenuComponent } from '../../shared/profile-menu/profile-menu.component';

interface TelephonegramTicketPayload {
  telephonegramId: number;
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

interface TelephonegramTicket {
  id?: number | string;
  ticketId?: number | string;
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

interface TelephonegramTicketDetail {
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
  selector: 'app-telephonegram',
  imports: [ReactiveFormsModule, ProfileMenuComponent],
  templateUrl: './telephonegram.component.html',
  styleUrl: './telephonegram.component.css'
})
export class TelephonegramComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  protected readonly currentUser = this.authService.getCurrentUser();
  protected readonly regionOptions = REGION_OPTIONS;

  protected readonly isCreateModalOpen = signal(false);
  protected readonly isRegionDropdownOpen = signal(false);
  protected readonly isCreating = signal(false);
  protected readonly successMessage = signal('');
  protected readonly errorMessage = signal('');

  protected readonly tickets = signal<TelephonegramTicket[]>([]);
  protected readonly isLoadingTickets = signal(true);
  protected readonly ticketsErrorMessage = signal('');

  protected readonly selectedRegion = signal('');
  protected readonly regionSearch = signal('');
  protected readonly selectedRegionLabel = computed(() => this.selectedRegion() || 'აირჩიეთ რეგიონი');
  protected readonly filteredRegions = computed(() => {
    const search = this.regionSearch().trim().toLowerCase();
    if (!search) {
      return this.regionOptions;
    }

    return this.regionOptions.filter((region) => region.toLowerCase().includes(search));
  });

  protected readonly isDetailModalOpen = signal(false);
  protected readonly isLoadingDetail = signal(false);
  protected readonly detailErrorMessage = signal('');
  protected readonly selectedTicketDetail = signal<TelephonegramTicketDetail | null>(null);

  protected readonly isDetailRegionDropdownOpen = signal(false);
  protected readonly detailRegionSearch = signal('');
  protected readonly selectedDetailRegion = signal('');
  protected readonly selectedDetailRegionLabel = computed(() => this.selectedDetailRegion() || 'აირჩიეთ რეგიონი');
  protected readonly filteredDetailRegions = computed(() => {
    const search = this.detailRegionSearch().trim().toLowerCase();
    if (!search) {
      return this.regionOptions;
    }

    return this.regionOptions.filter((region) => region.toLowerCase().includes(search));
  });

  protected readonly isSavingTicket = signal(false);
  protected readonly saveSuccessMessage = signal('');
  protected readonly saveErrorMessage = signal('');
  protected readonly commentText = signal('');
  protected readonly isSubmittingComment = signal(false);
  protected readonly commentErrorMessage = signal('');
  protected readonly isReturningTicket = signal(false);
  protected readonly isReturnConfirmOpen = signal(false);
  protected readonly returnErrorMessage = signal('');

  protected readonly createForm = this.formBuilder.nonNullable.group({
    telephonegramId: ['', Validators.required],
    region: ['', Validators.required],
    address: [''],
    roadSurface: [''],
    responsiblePerson: [''],
    contactPhone: [''],
    time: [''],
    sender: [''],
    sendTo: [''],
    comment: ['']
  });

  protected readonly detailForm = this.formBuilder.nonNullable.group({
    telephonegramId: ['', Validators.required],
    region: ['', Validators.required],
    address: [''],
    roadSurface: [''],
    responsiblePerson: [''],
    contactPhone: [''],
    time: [''],
    sender: [''],
    sendTo: [''],
    comment: ['']
  });

  ngOnInit(): void {
    this.loadTelephonegramTickets();
  }

  protected openCreateModal(): void {
    this.isCreateModalOpen.set(true);
    this.isRegionDropdownOpen.set(false);
    this.regionSearch.set('');
    this.errorMessage.set('');
    this.successMessage.set('');
    this.createForm.reset({
      telephonegramId: '',
      region: '',
      address: '',
      roadSurface: '',
      responsiblePerson: '',
      contactPhone: '',
      time: '',
      sender: '',
      sendTo: '',
      comment: ''
    });
    this.selectedRegion.set('');
  }

  protected closeCreateModal(): void {
    if (this.isCreating()) {
      return;
    }

    this.isCreateModalOpen.set(false);
    this.isRegionDropdownOpen.set(false);
    this.regionSearch.set('');
  }

  protected toggleRegionDropdown(): void {
    this.isRegionDropdownOpen.update((isOpen) => !isOpen);
    if (!this.isRegionDropdownOpen()) {
      this.regionSearch.set('');
    }
  }

  protected selectRegion(region: string): void {
    this.selectedRegion.set(region);
    this.createForm.controls.region.setValue(region);
    this.createForm.controls.region.markAsTouched();
    this.isRegionDropdownOpen.set(false);
    this.regionSearch.set('');
  }

  protected onRegionSearch(value: string): void {
    this.regionSearch.set(value);
  }

  protected createTicket(): void {
    if (this.isCreating()) {
      return;
    }

    const formValue = this.createForm.getRawValue();
    const telephonegramId = Number(formValue.telephonegramId.trim());
    const region = formValue.region.trim();

    if (!region || !Number.isInteger(telephonegramId) || telephonegramId <= 0) {
      this.createForm.markAllAsTouched();
      this.errorMessage.set('Please fill all required fields. Region and Telephonegram ID are required.');
      return;
    }

    this.isCreating.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const payload: TelephonegramTicketPayload = {
      ...formValue,
      telephonegramId,
      region
    };

    this.http.post<TelephonegramTicketPayload>(API_ENDPOINTS.telephonegramTickets, payload).subscribe({
      next: () => {
        this.successMessage.set('ბილეთი წარმატებით შეიქმნა.');
        this.isCreating.set(false);
        this.loadTelephonegramTickets();
        this.closeCreateModal();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(this.getBackendErrorMessage(error, 'ბილეთის შექმნა ვერ მოხერხდა.'));
        this.isCreating.set(false);
      }
    });
  }

  protected reloadTickets(): void {
    this.loadTelephonegramTickets();
  }

  protected openTicket(ticket: TelephonegramTicket): void {
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
    this.saveErrorMessage.set('');
    this.saveSuccessMessage.set('');
    this.commentText.set('');
    this.commentErrorMessage.set('');
    this.returnErrorMessage.set('');
    this.isReturnConfirmOpen.set(false);
    this.isDetailRegionDropdownOpen.set(false);
    this.detailRegionSearch.set('');

    this.http.get<TelephonegramTicketDetail>(`${API_ENDPOINTS.telephonegramTickets}${ticketId}/`).subscribe({
      next: (ticketDetail) => {
        this.selectedTicketDetail.set(ticketDetail);
        this.patchDetailForm(ticketDetail);
        this.isLoadingDetail.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.detailErrorMessage.set(this.getBackendErrorMessage(error, 'ტიკეტის გახსნა ვერ მოხერხდა.'));
        this.isLoadingDetail.set(false);
      }
    });
  }

  protected closeTicketDetails(): void {
    if (this.isLoadingDetail() || this.isSavingTicket() || this.isSubmittingComment() || this.isReturningTicket()) {
      return;
    }

    this.isDetailModalOpen.set(false);
    this.isLoadingDetail.set(false);
    this.detailErrorMessage.set('');
    this.selectedTicketDetail.set(null);
    this.saveSuccessMessage.set('');
    this.saveErrorMessage.set('');
    this.commentText.set('');
    this.commentErrorMessage.set('');
    this.returnErrorMessage.set('');
    this.isReturnConfirmOpen.set(false);
    this.isDetailRegionDropdownOpen.set(false);
    this.detailRegionSearch.set('');
  }

  protected toggleDetailRegionDropdown(): void {
    this.isDetailRegionDropdownOpen.update((isOpen) => !isOpen);
    if (!this.isDetailRegionDropdownOpen()) {
      this.detailRegionSearch.set('');
    }
  }

  protected onDetailRegionSearch(value: string): void {
    this.detailRegionSearch.set(value);
  }

  protected selectDetailRegion(region: string): void {
    this.selectedDetailRegion.set(region);
    this.detailForm.controls.region.setValue(region);
    this.detailForm.controls.region.markAsTouched();
    this.isDetailRegionDropdownOpen.set(false);
    this.detailRegionSearch.set('');
  }

  protected saveTicketDetails(): void {
    const detail = this.selectedTicketDetail();
    if (!detail?.ticketId || this.isSavingTicket()) {
      return;
    }

    const formValue = this.detailForm.getRawValue();
    const telephonegramId = Number(formValue.telephonegramId.trim());
    const region = formValue.region.trim();

    if (!region || !Number.isInteger(telephonegramId) || telephonegramId <= 0) {
      this.detailForm.markAllAsTouched();
      this.saveErrorMessage.set('Please fill all required fields. Region and Telephonegram ID are required.');
      return;
    }

    this.isSavingTicket.set(true);
    this.saveErrorMessage.set('');
    this.saveSuccessMessage.set('');

    const payload: TelephonegramTicketPayload = {
      ...formValue,
      telephonegramId,
      region
    };

    this.http.patch(`${API_ENDPOINTS.telephonegramTickets}${detail.ticketId}/`, payload).subscribe({
      next: () => {
        this.isSavingTicket.set(false);
        this.saveSuccessMessage.set('ცვლილებები შენახულია.');
        this.refreshTicketDetails(detail.ticketId);
        this.loadTelephonegramTickets();
      },
      error: (error: HttpErrorResponse) => {
        this.saveErrorMessage.set(this.getBackendErrorMessage(error, 'ტიკეტის განახლება ვერ მოხერხდა.'));
        this.isSavingTicket.set(false);
      }
    });
  }

  protected onCommentChange(value: string): void {
    this.commentText.set(value);
  }

  protected addComment(): void {
    const detail = this.selectedTicketDetail();
    const comment = this.commentText().trim();

    if (!detail?.ticketId) {
      this.commentErrorMessage.set('ტიკეტი ვერ მოიძებნა.');
      return;
    }

    if (!comment) {
      this.commentErrorMessage.set('კომენტარი ცარიელი ვერ იქნება.');
      return;
    }

    this.isSubmittingComment.set(true);
    this.commentErrorMessage.set('');

    this.http.post<{ comment: string }>(`${API_ENDPOINTS.ticketsBase}${detail.ticketId}/comments/`, { comment }).subscribe({
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

  protected returnTicketToServiceNet(): void {
    const detail = this.selectedTicketDetail();
    if (!detail?.ticketId || this.isReturningTicket()) {
      return;
    }

    this.isReturningTicket.set(true);
    this.returnErrorMessage.set('');

    this.http.patch(`${API_ENDPOINTS.ticketsBase}${detail.ticketId}/assignment/`, { assignedDepartment: 'Servicenet' }).subscribe({
      next: () => {
        this.isReturningTicket.set(false);
        this.closeTicketDetails();
        this.loadTelephonegramTickets();
      },
      error: (error: HttpErrorResponse) => {
        this.returnErrorMessage.set(this.getBackendErrorMessage(error, 'ბილეთის დაბრუნება ვერ მოხერხდა.'));
        this.isReturningTicket.set(false);
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

  protected confirmReturnToServiceNet(): void {
    this.isReturnConfirmOpen.set(false);
    this.returnTicketToServiceNet();
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

  private loadTelephonegramTickets(): void {
    this.isLoadingTickets.set(true);
    this.ticketsErrorMessage.set('');

    this.http.get<TelephonegramTicket[]>(API_ENDPOINTS.assignedTickets, {
      params: { assignedDepartment: 'Telephonegram' }
    }).subscribe({
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

  private resolveTicketId(ticket: TelephonegramTicket): number | null {
    const rawId = ticket.ticketId || ticket.id;
    if (rawId === null || rawId === undefined || rawId === '') {
      return null;
    }

    const parsed = Number(rawId);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private patchDetailForm(detail: TelephonegramTicketDetail): void {
    this.detailForm.patchValue({
      telephonegramId: String(detail.telephonegramId ?? ''),
      region: detail.region ?? '',
      address: detail.address ?? '',
      roadSurface: detail.roadSurface ?? '',
      responsiblePerson: detail.responsiblePerson ?? '',
      contactPhone: detail.contactPhone ?? '',
      time: detail.time ?? '',
      sender: detail.sender ?? '',
      sendTo: detail.sendTo ?? '',
      comment: detail.comment ?? ''
    });
    this.selectedDetailRegion.set(detail.region ?? '');
  }

  private refreshTicketDetails(ticketId: number): void {
    this.http.get<TelephonegramTicketDetail>(`${API_ENDPOINTS.telephonegramTickets}${ticketId}/`).subscribe({
      next: (ticketDetail) => {
        this.selectedTicketDetail.set(ticketDetail);
        this.patchDetailForm(ticketDetail);
      },
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
