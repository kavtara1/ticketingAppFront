import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { API_ENDPOINTS } from '../../core/config/api.config';
import { ProfileMenuComponent } from '../../shared/profile-menu/profile-menu.component';

interface TicketingUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  departmentName: string;
}

@Component({
  selector: 'app-ticketing-users',
  imports: [ReactiveFormsModule, ProfileMenuComponent],
  templateUrl: './ticketing-users.component.html',
  styleUrl: './ticketing-users.component.css'
})
export class TicketingUsersComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly departmentOptions = ['ccsupportfix', 'Telephonegram', 'Servicenet'];
  protected readonly users = signal<TicketingUser[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly selectedUser = signal<TicketingUser | null>(null);
  protected readonly userPendingDelete = signal<TicketingUser | null>(null);
  protected readonly isCreateModalOpen = signal(false);
  protected readonly isEditModalOpen = signal(false);
  protected readonly isDeleteDialogOpen = signal(false);
  protected readonly isCreating = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly isDeleting = signal(false);
  protected readonly modalMessage = signal('');
  protected readonly createModalMessage = signal('');

  protected readonly createForm = this.formBuilder.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    department: ['ccsupportfix', Validators.required]
  });

  protected readonly editForm = this.formBuilder.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    department: ['ccsupportfix', Validators.required]
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  protected reloadUsers(): void {
    this.loadUsers();
  }

  protected openCreateModal(): void {
    if (this.isSaving() || this.isDeleting() || this.isCreating()) {
      return;
    }

    this.createForm.reset({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      department: 'ccsupportfix'
    });
    this.createModalMessage.set('');
    this.isCreateModalOpen.set(true);
  }

  protected closeCreateModal(): void {
    if (this.isCreating()) {
      return;
    }

    this.isCreateModalOpen.set(false);
    this.createModalMessage.set('');
  }

  protected openEditModal(user: TicketingUser): void {
    this.selectedUser.set(user);
    this.modalMessage.set('');
    this.editForm.reset({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      department: user.department
    });
    this.isEditModalOpen.set(true);
  }

  protected closeEditModal(): void {
    if (this.isSaving() || this.isDeleting()) {
      return;
    }

    this.isEditModalOpen.set(false);
    this.selectedUser.set(null);
    this.modalMessage.set('');
  }

  protected openDeleteDialog(user: TicketingUser): void {
    if (this.isDeleting() || this.isSaving()) {
      return;
    }

    this.userPendingDelete.set(user);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.isDeleteDialogOpen.set(true);
  }

  protected closeDeleteDialog(): void {
    if (this.isDeleting()) {
      return;
    }

    this.isDeleteDialogOpen.set(false);
    this.userPendingDelete.set(null);
  }

  protected createUser(): void {
    if (this.createForm.invalid || this.isCreating()) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.isCreating.set(true);
    this.createModalMessage.set('');
    this.successMessage.set('');

    const payload = this.createForm.getRawValue();

    this.http.post<TicketingUser>(API_ENDPOINTS.register, payload).subscribe({
      next: (createdUser) => {
        this.users.update((users) => [createdUser, ...users]);
        this.successMessage.set('User created successfully.');
        this.isCreating.set(false);
        this.closeCreateModal();
      },
      error: (error: HttpErrorResponse) => {
        this.createModalMessage.set(this.getBackendErrorMessage(error, 'Failed to create user.'));
        this.isCreating.set(false);
      }
    });
  }

  protected updateUser(): void {
    const user = this.selectedUser();

    if (!user || this.editForm.invalid || this.isSaving()) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.modalMessage.set('');
    this.successMessage.set('');

    const formValue = this.editForm.getRawValue();
    const payload = {
      ...user,
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email,
      department: formValue.department
    };

    this.http.put<TicketingUser>(this.getUserUrl(user.id), payload).subscribe({
      next: (updatedUser) => {
        this.users.update((users) => users.map((item) => (item.id === updatedUser.id ? updatedUser : item)));
        this.successMessage.set('User updated successfully.');
        this.isSaving.set(false);
        this.closeEditModal();
      },
      error: (error: HttpErrorResponse) => {
        this.modalMessage.set(this.getBackendErrorMessage(error, 'Failed to update user.'));
        this.isSaving.set(false);
      }
    });
  }

  protected confirmDelete(): void {
    const user = this.userPendingDelete();

    if (!user || this.isDeleting()) {
      return;
    }

    this.isDeleting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.http.delete<void>(this.getUserUrl(user.id)).subscribe({
      next: () => {
        this.users.update((users) => users.filter((item) => item.id !== user.id));
        this.successMessage.set('User deleted successfully.');
        this.isDeleting.set(false);
        this.closeDeleteDialog();

        if (this.selectedUser()?.id === user.id) {
          this.closeEditModal();
        }
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(this.getBackendErrorMessage(error, 'Failed to delete user.'));
        this.isDeleting.set(false);
      }
    });
  }

  private loadUsers(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.http.get<TicketingUser[]>(API_ENDPOINTS.users).subscribe({
      next: (users) => {
        this.users.set(users);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(
          error.status === 401 || error.status === 403
            ? 'Your session is not authorized to load users. Please sign in again.'
            : 'Failed to load users from the server.'
        );
        this.isLoading.set(false);
      }
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

  private getUserUrl(userId: number): string {
    return `${API_ENDPOINTS.users}${userId}/`;
  }
}
