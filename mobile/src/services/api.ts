const API_BASE = process.env.EXPO_PUBLIC_API_URL!;

const apiFetch = async (path: string, options: RequestInit = {}, token?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: token } : {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
};

export const api = {
  // Events
  getEvents: (token: string) =>
    apiFetch('/events', {}, token),

  createEvent: (token: string, data: object) =>
    apiFetch('/events', { method: 'POST', body: JSON.stringify(data) }, token),

  getEvent: (token: string, eventId: string) =>
    apiFetch(`/events/${eventId}`, {}, token),

  updateEvent: (token: string, eventId: string, data: object) =>
    apiFetch(`/events/${eventId}`, { method: 'PUT', body: JSON.stringify(data) }, token),

  deleteEvent: (token: string, eventId: string) =>
    apiFetch(`/events/${eventId}`, { method: 'DELETE' }, token),

  // Planning (timeline, budget, menu, etc.)
  getPlanning: (token: string, eventId: string) =>
    apiFetch(`/events/${eventId}/planning`, {}, token),

  savePlanning: (token: string, eventId: string, data: object) =>
    apiFetch(`/events/${eventId}/planning`, { method: 'PUT', body: JSON.stringify(data) }, token),

  // Guests
  getGuests: (token: string, eventId: string) =>
    apiFetch(`/events/${eventId}/guests`, {}, token),

  addGuest: (token: string, eventId: string, data: object) =>
    apiFetch(`/events/${eventId}/guests`, { method: 'POST', body: JSON.stringify(data) }, token),

  updateGuest: (token: string, eventId: string, guestId: string, data: object) =>
    apiFetch(`/events/${eventId}/guests/${guestId}`, { method: 'PUT', body: JSON.stringify(data) }, token),

  deleteGuest: (token: string, eventId: string, guestId: string) =>
    apiFetch(`/events/${eventId}/guests/${guestId}`, { method: 'DELETE' }, token),

  // RSVP (public)
  getRsvp: (token: string) =>
    apiFetch(`/rsvp/${token}`),

  submitRsvp: (token: string, data: object) =>
    apiFetch(`/rsvp/${token}`, { method: 'POST', body: JSON.stringify(data) }),

  // AI
  ai: (token: string, action: string, payload: object) =>
    apiFetch('/ai', { method: 'POST', body: JSON.stringify({ action, ...payload }) }, token),

  // Invitations
  getInvitations: (token: string, eventId: string) =>
    apiFetch(`/events/${eventId}/invitations`, {}, token),

  createInvitation: (token: string, eventId: string, data: object) =>
    apiFetch(`/events/${eventId}/invitations`, { method: 'POST', body: JSON.stringify(data) }, token),

  sendInvitation: (token: string, eventId: string, invitationId: string, data: object) =>
    apiFetch(`/events/${eventId}/invitations/${invitationId}/send`, { method: 'POST', body: JSON.stringify(data) }, token),

  // Vendors
  getVendors: (token: string, eventId: string) =>
    apiFetch(`/events/${eventId}/vendors`, {}, token),

  addVendor: (token: string, eventId: string, data: object) =>
    apiFetch(`/events/${eventId}/vendors`, { method: 'POST', body: JSON.stringify(data) }, token),

  updateVendor: (token: string, eventId: string, vendorId: string, data: object) =>
    apiFetch(`/events/${eventId}/vendors/${vendorId}`, { method: 'PUT', body: JSON.stringify(data) }, token),
};
