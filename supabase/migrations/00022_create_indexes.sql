-- Services
CREATE INDEX idx_services_category ON public.services(category_id);
CREATE INDEX idx_services_provider ON public.services(provider_id);
CREATE INDEX idx_services_location ON public.services USING gin (to_tsvector('french', location));
CREATE INDEX idx_services_name ON public.services USING gin (to_tsvector('french', name));

-- Provider profiles
CREATE INDEX idx_provider_profiles_user ON public.provider_profiles(user_id);

-- Service requests
CREATE INDEX idx_service_requests_client ON public.service_requests(client_id);
CREATE INDEX idx_service_requests_provider ON public.service_requests(provider_id);
CREATE INDEX idx_service_requests_status ON public.service_requests(status);

-- Bookings
CREATE INDEX idx_bookings_client ON public.bookings(client_id);
CREATE INDEX idx_bookings_provider ON public.bookings(provider_id);

-- Favorites
CREATE INDEX idx_favorites_user ON public.favorites(user_id);

-- Reviews
CREATE INDEX idx_reviews_provider ON public.reviews(provider_id);

-- Messages
CREATE INDEX idx_messages_thread ON public.messages(thread_id);

-- Notifications
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
