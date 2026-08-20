-- =============================================================================
-- PROFILES
-- =============================================================================
-- Users can read their own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Anyone can read public profiles (for provider pages, public listings)
CREATE POLICY "profiles_select_public"
  ON public.profiles FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- =============================================================================
-- CATEGORIES
-- =============================================================================
-- Anyone can read active categories
CREATE POLICY "categories_select_active"
  ON public.categories FOR SELECT
  USING (is_active = true);

-- Admins can manage categories
CREATE POLICY "categories_admin_all"
  ON public.categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- =============================================================================
-- PROVIDER PROFILES
-- =============================================================================
-- Anyone can read provider profiles
CREATE POLICY "provider_profiles_select_public"
  ON public.provider_profiles FOR SELECT
  USING (true);

-- Owner can update their own provider profile
CREATE POLICY "provider_profiles_update_own"
  ON public.provider_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Owner can insert their own provider profile
CREATE POLICY "provider_profiles_insert_own"
  ON public.provider_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- SERVICES
-- =============================================================================
-- Anyone can read active services
CREATE POLICY "services_select_active"
  ON public.services FOR SELECT
  USING (is_active = true);

-- Providers can manage their own services (insert, update, delete)
CREATE POLICY "services_insert_own"
  ON public.services FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.provider_profiles
      WHERE provider_profiles.id = services.provider_id
        AND provider_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "services_update_own"
  ON public.services FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.provider_profiles
      WHERE provider_profiles.id = services.provider_id
        AND provider_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.provider_profiles
      WHERE provider_profiles.id = services.provider_id
        AND provider_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "services_delete_own"
  ON public.services FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.provider_profiles
      WHERE provider_profiles.id = services.provider_id
        AND provider_profiles.user_id = auth.uid()
    )
  );

-- =============================================================================
-- SERVICE IMAGES
-- =============================================================================
-- Anyone can read service images
CREATE POLICY "service_images_select_public"
  ON public.service_images FOR SELECT
  USING (true);

-- Service owner can manage images
CREATE POLICY "service_images_insert_own"
  ON public.service_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.services
      JOIN public.provider_profiles ON provider_profiles.id = services.provider_id
      WHERE services.id = service_images.service_id
        AND provider_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "service_images_delete_own"
  ON public.service_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.services
      JOIN public.provider_profiles ON provider_profiles.id = services.provider_id
      WHERE services.id = service_images.service_id
        AND provider_profiles.user_id = auth.uid()
    )
  );

-- =============================================================================
-- SERVICE AVAILABILITY
-- =============================================================================
-- Anyone can read service availability
CREATE POLICY "service_availability_select_public"
  ON public.service_availability FOR SELECT
  USING (true);

-- Service owner can manage availability
CREATE POLICY "service_availability_insert_own"
  ON public.service_availability FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.services
      JOIN public.provider_profiles ON provider_profiles.id = services.provider_id
      WHERE services.id = service_availability.service_id
        AND provider_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "service_availability_update_own"
  ON public.service_availability FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.services
      JOIN public.provider_profiles ON provider_profiles.id = services.provider_id
      WHERE services.id = service_availability.service_id
        AND provider_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.services
      JOIN public.provider_profiles ON provider_profiles.id = services.provider_id
      WHERE services.id = service_availability.service_id
        AND provider_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "service_availability_delete_own"
  ON public.service_availability FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.services
      JOIN public.provider_profiles ON provider_profiles.id = services.provider_id
      WHERE services.id = service_availability.service_id
        AND provider_profiles.user_id = auth.uid()
    )
  );

-- =============================================================================
-- ADDRESSES
-- =============================================================================
-- Users can manage their own addresses
CREATE POLICY "addresses_select_own"
  ON public.addresses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "addresses_insert_own"
  ON public.addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "addresses_update_own"
  ON public.addresses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "addresses_delete_own"
  ON public.addresses FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- SERVICE REQUESTS
-- =============================================================================
-- Client can read their own requests
CREATE POLICY "service_requests_select_client"
  ON public.service_requests FOR SELECT
  USING (
    auth.uid() = client_id
  );

-- Provider can read requests directed at them
CREATE POLICY "service_requests_select_provider"
  ON public.service_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.provider_profiles
      WHERE provider_profiles.id = service_requests.provider_id
        AND provider_profiles.user_id = auth.uid()
    )
  );

-- Client can create requests
CREATE POLICY "service_requests_insert_client"
  ON public.service_requests FOR INSERT
  WITH CHECK (auth.uid() = client_id);

-- Provider can update request status
CREATE POLICY "service_requests_update_provider"
  ON public.service_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.provider_profiles
      WHERE provider_profiles.id = service_requests.provider_id
        AND provider_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.provider_profiles
      WHERE provider_profiles.id = service_requests.provider_id
        AND provider_profiles.user_id = auth.uid()
    )
  );

-- Client can cancel their own requests
CREATE POLICY "service_requests_cancel_client"
  ON public.service_requests FOR UPDATE
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

-- =============================================================================
-- BOOKINGS
-- =============================================================================
-- Participants can read their own bookings
CREATE POLICY "bookings_select_client"
  ON public.bookings FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "bookings_select_provider"
  ON public.bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.provider_profiles
      WHERE provider_profiles.id = bookings.provider_id
        AND provider_profiles.user_id = auth.uid()
    )
  );

-- Provider can update booking status
CREATE POLICY "bookings_update_provider"
  ON public.bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.provider_profiles
      WHERE provider_profiles.id = bookings.provider_id
        AND provider_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.provider_profiles
      WHERE provider_profiles.id = bookings.provider_id
        AND provider_profiles.user_id = auth.uid()
    )
  );

-- Client can cancel their own bookings
CREATE POLICY "bookings_update_client"
  ON public.bookings FOR UPDATE
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

-- =============================================================================
-- FAVORITES
-- =============================================================================
-- Users can manage their own favorites
CREATE POLICY "favorites_select_own"
  ON public.favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "favorites_insert_own"
  ON public.favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorites_delete_own"
  ON public.favorites FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- REVIEWS
-- =============================================================================
-- Anyone can read reviews
CREATE POLICY "reviews_select_public"
  ON public.reviews FOR SELECT
  USING (true);

-- Reviewer can create reviews
CREATE POLICY "reviews_insert_own"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

-- Reviewer can update their own reviews
CREATE POLICY "reviews_update_own"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = reviewer_id)
  WITH CHECK (auth.uid() = reviewer_id);

-- =============================================================================
-- MESSAGE THREADS
-- =============================================================================
-- Participants can read their own threads
CREATE POLICY "message_threads_select_participant"
  ON public.message_threads FOR SELECT
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- Users can create threads where they are a participant
CREATE POLICY "message_threads_insert_own"
  ON public.message_threads FOR INSERT
  WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- =============================================================================
-- MESSAGES
-- =============================================================================
-- Thread participants can read messages
CREATE POLICY "messages_select_participant"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.message_threads
      WHERE message_threads.id = messages.thread_id
        AND (message_threads.participant_1 = auth.uid()
             OR message_threads.participant_2 = auth.uid())
    )
  );

-- Thread participants can send messages
CREATE POLICY "messages_insert_participant"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.message_threads
      WHERE message_threads.id = messages.thread_id
        AND (message_threads.participant_1 = auth.uid()
             OR message_threads.participant_2 = auth.uid())
    )
  );

-- Senders can update their own messages (mark as read by recipient handled via update)
CREATE POLICY "messages_update_participant"
  ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.message_threads
      WHERE message_threads.id = messages.thread_id
        AND (message_threads.participant_1 = auth.uid()
             OR message_threads.participant_2 = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.message_threads
      WHERE message_threads.id = messages.thread_id
        AND (message_threads.participant_1 = auth.uid()
             OR message_threads.participant_2 = auth.uid())
    )
  );

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================
-- Users can read their own notifications
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- REPORTS
-- =============================================================================
-- Users can create reports
CREATE POLICY "reports_insert_own"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Users can read their own reports
CREATE POLICY "reports_select_own"
  ON public.reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- Admins can manage all reports
CREATE POLICY "reports_admin_all"
  ON public.reports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- =============================================================================
-- ADMIN LOGS
-- =============================================================================
-- Admins can read admin logs
CREATE POLICY "admin_logs_select_admin"
  ON public.admin_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Admins can create admin logs
CREATE POLICY "admin_logs_insert_admin"
  ON public.admin_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
