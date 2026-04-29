import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';
import { ChangePasswordComponent } from './features/change-password/change-password.component';
import { LoginComponent } from './features/login/login.component';
import { ServiceNetComponent } from './features/servicenet/servicenet.component';
import { TelephonegramComponent } from './features/telephonegram/telephonegram.component';
import { TicketingUsersComponent } from './features/ticketing-users/ticketing-users.component';

export const routes: Routes = [
  {
    path: '',
    component: LoginComponent
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'telephonegram',
    component: TelephonegramComponent,
    canActivate: [authGuard]
  },
  {
    path: 'servicenet',
    component: ServiceNetComponent,
    canActivate: [authGuard]
  },
  {
    path: 'change-password',
    component: ChangePasswordComponent,
    canActivate: [authGuard]
  },
  {
    path: 'ticketingusers',
    component: TicketingUsersComponent,
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
