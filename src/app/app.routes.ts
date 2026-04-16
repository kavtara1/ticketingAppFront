import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';
import { LoginComponent } from './features/login/login.component';
import { TicketingUsersComponent } from './features/ticketing-users/ticketing-users.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'ticketingusers',
    component: TicketingUsersComponent,
    canActivate: [authGuard]
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'ticketingusers'
  },
  {
    path: '**',
    redirectTo: 'ticketingusers'
  }
];
