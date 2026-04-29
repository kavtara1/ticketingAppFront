export const API_BASE_URL = 'http://127.0.0.1:8000';

export const API_ENDPOINTS = {
  login: `${API_BASE_URL}/api/ticketing/auth/login/`,
  me: `${API_BASE_URL}/api/ticketing/auth/me/`,
  changePassword: `${API_BASE_URL}/api/ticketing/auth/change-password/`,
  refreshToken: `${API_BASE_URL}/api/ticketing/auth/token/refresh/`,
  validateToken: `${API_BASE_URL}/api/ticketing/auth/token/validate/`,
  ticketsBase: `${API_BASE_URL}/api/ticketing/tickets/`,
  assignedTickets: `${API_BASE_URL}/api/ticketing/tickets/assigned/`,
  ticketsByRegion: `${API_BASE_URL}/api/ticketing/tickets/region/`,
  telephonegramTickets: `${API_BASE_URL}/api/ticketing/tickets/telephonegrams/`,
  users: `${API_BASE_URL}/api/ticketing/users/`,
  register: `${API_BASE_URL}/api/ticketing/auth/register/`
};
