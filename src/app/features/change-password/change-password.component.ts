import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { API_ENDPOINTS } from '../../core/config/api.config';
import { ProfileMenuComponent } from '../../shared/profile-menu/profile-menu.component';

interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

@Component({
  selector: 'app-change-password',
  imports: [ReactiveFormsModule, ProfileMenuComponent],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.css'
})
export class ChangePasswordComponent {
  private readonly http = inject(HttpClient);
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly isSubmitting = signal(false);
  protected readonly successMessage = signal('');
  protected readonly errorMessage = signal('');

  protected readonly form = this.formBuilder.nonNullable.group({
    oldPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]]
  });

  protected navigateBack(): void {
    const user = this.authService.getCurrentUser();
    void this.router.navigateByUrl(this.authService.getDepartmentRoute(user?.department));
  }

  protected submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      if (this.form.invalid) {
        this.errorMessage.set('Please fix the errors below.');
      }
      return;
    }

    this.isSubmitting.set(true);
    this.form.disable();
    this.errorMessage.set('');
    this.successMessage.set('');

    const payload = this.form.getRawValue() as ChangePasswordPayload;
    this.http
      .post(API_ENDPOINTS.changePassword, payload)
      .pipe(
        finalize(() => {
          this.isSubmitting.set(false);
          this.form.enable();
        })
      )
      .subscribe({
        next: () => {
          this.successMessage.set('პაროლი წარმატებით განახლდა.');
          this.form.reset({
            oldPassword: '',
            newPassword: ''
          });
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.getBackendErrorMessage(error, 'Failed to change password.'));
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
}
