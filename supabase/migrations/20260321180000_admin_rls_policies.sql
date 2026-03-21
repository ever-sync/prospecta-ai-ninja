-- Admin RLS Policies
-- Grant SELECT access to admins and superadmins across all operational tables

-- Profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Presentations (Leads)
CREATE POLICY "Admins can view all presentations"
ON public.presentations FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Campaigns
CREATE POLICY "Admins can view all campaigns"
ON public.campaigns FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Campaign Presentations (Junction)
CREATE POLICY "Admins can view all campaign presentations"
ON public.campaign_presentations FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- CRM Tasks
CREATE POLICY "Admins can view all crm tasks"
ON public.crm_tasks FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- CRM Views
CREATE POLICY "Admins can view all crm views"
ON public.crm_views FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Lead Notes
CREATE POLICY "Admins can view all lead notes"
ON public.lead_notes FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Message Conversion Events
CREATE POLICY "Admins can view all conversion events"
ON public.message_conversion_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Presentation Views
CREATE POLICY "Admins can view all presentation views"
ON public.presentation_views FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Testimonials
CREATE POLICY "Admins can view all testimonials"
ON public.testimonials FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Client Logos
CREATE POLICY "Admins can view all client logos"
ON public.client_logos FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Campaign Message Attempts
CREATE POLICY "Admins can view all campaign attempts"
ON public.campaign_message_attempts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
