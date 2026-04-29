import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-profile-menu',
  templateUrl: './profile-menu.component.html',
  styleUrl: './profile-menu.component.css'
})
export class ProfileMenuComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly isOpen = signal(false);
  protected readonly currentUser = this.authService.getCurrentUser();
  protected readonly fullName = computed(() => {
    const user = this.currentUser;
    if (!user) {
      return 'მომხმარებელი';
    }

    return `${user.firstName} ${user.lastName}`.trim();
  });
  protected readonly initials = computed(() => {
    const user = this.currentUser;
    if (!user) {
      return 'U';
    }

    return `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();
  });

  @HostListener('document:click')
  protected closeOnOutsideClick(): void {
    this.isOpen.set(false);
  }

  protected toggleMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isOpen.update((open) => !open);
  }

  protected goToChangePassword(event: MouseEvent): void {
    event.stopPropagation();
    this.isOpen.set(false);
    void this.router.navigate(['/change-password']);
  }

  protected logout(event: MouseEvent): void {
    event.stopPropagation();
    this.isOpen.set(false);
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
