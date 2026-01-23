CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'resident',
    'super_admin'
);


--
-- Name: get_user_hoa_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_hoa_id(_user_id uuid) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT hoa_id FROM public.profiles WHERE user_id = _user_id
$$;


--
-- Name: handle_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: is_super_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_super_admin(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  )
$$;


SET default_table_access_method = heap;

--
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hoa_id uuid NOT NULL,
    author_id uuid,
    title text NOT NULL,
    body text NOT NULL,
    published_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hoa_id uuid NOT NULL,
    uploaded_by uuid,
    name text NOT NULL,
    description text,
    category text NOT NULL,
    file_url text NOT NULL,
    file_type text,
    file_size integer,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT documents_category_check CHECK ((category = ANY (ARRAY['Bylaws'::text, 'Rules'::text, 'Minutes'::text, 'Notices'::text, 'Other'::text])))
);


--
-- Name: hoas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hoas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    address text,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: join_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.join_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hoa_id uuid NOT NULL,
    user_id uuid NOT NULL,
    house_number text NOT NULL,
    street_name text NOT NULL,
    city text NOT NULL,
    state text NOT NULL,
    zip_code text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payment_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    schedule_id uuid NOT NULL,
    resident_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    due_date date NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payment_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'overdue'::text])))
);


--
-- Name: payment_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hoa_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    amount numeric(10,2) NOT NULL,
    frequency text NOT NULL,
    due_day integer,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payment_schedules_due_day_check CHECK (((due_day >= 1) AND (due_day <= 31))),
    CONSTRAINT payment_schedules_frequency_check CHECK ((frequency = ANY (ARRAY['monthly'::text, 'quarterly'::text, 'annual'::text, 'one-time'::text])))
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid,
    resident_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_method text,
    stripe_transaction_id text,
    paid_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    hoa_id uuid,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    unit_number text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    house_number text,
    street_name text,
    city text,
    state text,
    zip_code text,
    status text DEFAULT 'active'::text NOT NULL
);


--
-- Name: resident_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resident_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hoa_id uuid NOT NULL,
    email text,
    house_number text NOT NULL,
    street_name text NOT NULL,
    city text NOT NULL,
    state text NOT NULL,
    zip_code text NOT NULL,
    invite_token uuid DEFAULT gen_random_uuid() NOT NULL,
    created_by uuid,
    used_by uuid,
    used_at timestamp with time zone,
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'resident'::public.app_role NOT NULL
);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: hoas hoas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hoas
    ADD CONSTRAINT hoas_pkey PRIMARY KEY (id);


--
-- Name: join_requests join_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.join_requests
    ADD CONSTRAINT join_requests_pkey PRIMARY KEY (id);


--
-- Name: join_requests join_requests_user_id_hoa_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.join_requests
    ADD CONSTRAINT join_requests_user_id_hoa_id_key UNIQUE (user_id, hoa_id);


--
-- Name: payment_requests payment_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_requests
    ADD CONSTRAINT payment_requests_pkey PRIMARY KEY (id);


--
-- Name: payment_schedules payment_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_schedules
    ADD CONSTRAINT payment_schedules_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: resident_invites resident_invites_invite_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resident_invites
    ADD CONSTRAINT resident_invites_invite_token_key UNIQUE (invite_token);


--
-- Name: resident_invites resident_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resident_invites
    ADD CONSTRAINT resident_invites_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: announcements handle_announcements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER handle_announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: hoas handle_hoas_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER handle_hoas_updated_at BEFORE UPDATE ON public.hoas FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: payment_requests handle_payment_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER handle_payment_requests_updated_at BEFORE UPDATE ON public.payment_requests FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: payment_schedules handle_payment_schedules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER handle_payment_schedules_updated_at BEFORE UPDATE ON public.payment_schedules FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: profiles handle_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER handle_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: join_requests update_join_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_join_requests_updated_at BEFORE UPDATE ON public.join_requests FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: announcements announcements_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: announcements announcements_hoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_hoa_id_fkey FOREIGN KEY (hoa_id) REFERENCES public.hoas(id) ON DELETE CASCADE;


--
-- Name: documents documents_hoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_hoa_id_fkey FOREIGN KEY (hoa_id) REFERENCES public.hoas(id) ON DELETE CASCADE;


--
-- Name: documents documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: join_requests join_requests_hoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.join_requests
    ADD CONSTRAINT join_requests_hoa_id_fkey FOREIGN KEY (hoa_id) REFERENCES public.hoas(id) ON DELETE CASCADE;


--
-- Name: join_requests join_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.join_requests
    ADD CONSTRAINT join_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);


--
-- Name: join_requests join_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.join_requests
    ADD CONSTRAINT join_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: payment_requests payment_requests_resident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_requests
    ADD CONSTRAINT payment_requests_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: payment_requests payment_requests_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_requests
    ADD CONSTRAINT payment_requests_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.payment_schedules(id) ON DELETE CASCADE;


--
-- Name: payment_schedules payment_schedules_hoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_schedules
    ADD CONSTRAINT payment_schedules_hoa_id_fkey FOREIGN KEY (hoa_id) REFERENCES public.hoas(id) ON DELETE CASCADE;


--
-- Name: payments payments_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.payment_requests(id) ON DELETE SET NULL;


--
-- Name: payments payments_resident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_hoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_hoa_id_fkey FOREIGN KEY (hoa_id) REFERENCES public.hoas(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: resident_invites resident_invites_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resident_invites
    ADD CONSTRAINT resident_invites_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: resident_invites resident_invites_hoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resident_invites
    ADD CONSTRAINT resident_invites_hoa_id_fkey FOREIGN KEY (hoa_id) REFERENCES public.hoas(id) ON DELETE CASCADE;


--
-- Name: resident_invites resident_invites_used_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resident_invites
    ADD CONSTRAINT resident_invites_used_by_fkey FOREIGN KEY (used_by) REFERENCES auth.users(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles Admins can manage all profiles in their HOA; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all profiles in their HOA" ON public.profiles USING (((hoa_id = public.get_user_hoa_id(auth.uid())) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: announcements Admins can manage announcements or super_admin all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage announcements or super_admin all" ON public.announcements USING ((((hoa_id = public.get_user_hoa_id(auth.uid())) AND public.has_role(auth.uid(), 'admin'::public.app_role)) OR public.is_super_admin(auth.uid())));


--
-- Name: documents Admins can manage documents or super_admin all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage documents or super_admin all" ON public.documents USING ((((hoa_id = public.get_user_hoa_id(auth.uid())) AND public.has_role(auth.uid(), 'admin'::public.app_role)) OR public.is_super_admin(auth.uid())));


--
-- Name: resident_invites Admins can manage invites in their HOA or super_admin all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage invites in their HOA or super_admin all" ON public.resident_invites USING ((((hoa_id = public.get_user_hoa_id(auth.uid())) AND public.has_role(auth.uid(), 'admin'::public.app_role)) OR public.is_super_admin(auth.uid())));


--
-- Name: join_requests Admins can manage join requests in their HOA or super_admin all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage join requests in their HOA or super_admin all" ON public.join_requests USING ((((hoa_id = public.get_user_hoa_id(auth.uid())) AND public.has_role(auth.uid(), 'admin'::public.app_role)) OR public.is_super_admin(auth.uid())));


--
-- Name: payment_requests Admins can manage payment requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage payment requests" ON public.payment_requests USING ((EXISTS ( SELECT 1
   FROM public.payment_schedules ps
  WHERE ((ps.id = payment_requests.schedule_id) AND (ps.hoa_id = public.get_user_hoa_id(auth.uid())) AND public.has_role(auth.uid(), 'admin'::public.app_role)))));


--
-- Name: payment_schedules Admins can manage payment schedules or super_admin all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage payment schedules or super_admin all" ON public.payment_schedules USING ((((hoa_id = public.get_user_hoa_id(auth.uid())) AND public.has_role(auth.uid(), 'admin'::public.app_role)) OR public.is_super_admin(auth.uid())));


--
-- Name: hoas Admins can update their HOA or super_admin any; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update their HOA or super_admin any" ON public.hoas FOR UPDATE USING ((((id = public.get_user_hoa_id(auth.uid())) AND public.has_role(auth.uid(), 'admin'::public.app_role)) OR public.is_super_admin(auth.uid())));


--
-- Name: payment_requests Admins can view all payment requests in their HOA; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all payment requests in their HOA" ON public.payment_requests FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.payment_schedules ps
  WHERE ((ps.id = payment_requests.schedule_id) AND (ps.hoa_id = public.get_user_hoa_id(auth.uid())) AND public.has_role(auth.uid(), 'admin'::public.app_role)))));


--
-- Name: payments Admins can view all payments in their HOA; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all payments in their HOA" ON public.payments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.user_id = payments.resident_id) AND (p.hoa_id = public.get_user_hoa_id(auth.uid())) AND public.has_role(auth.uid(), 'admin'::public.app_role)))));


--
-- Name: user_roles Admins can view all roles in their HOA; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles in their HOA" ON public.user_roles FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.profiles p1
     JOIN public.profiles p2 ON ((p1.hoa_id = p2.hoa_id)))
  WHERE ((p1.user_id = auth.uid()) AND (p2.user_id = user_roles.user_id) AND public.has_role(auth.uid(), 'admin'::public.app_role)))));


--
-- Name: resident_invites Anyone can view invite by token for signup; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view invite by token for signup" ON public.resident_invites FOR SELECT USING (true);


--
-- Name: join_requests Authenticated users can create join requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create join requests" ON public.join_requests FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: payments Users can insert their own payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own payments" ON public.payments FOR INSERT WITH CHECK ((resident_id = auth.uid()));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: announcements Users can view announcements in their HOA or super_admin all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view announcements in their HOA or super_admin all" ON public.announcements FOR SELECT USING (((hoa_id = public.get_user_hoa_id(auth.uid())) OR public.is_super_admin(auth.uid())));


--
-- Name: documents Users can view documents in their HOA or super_admin all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view documents in their HOA or super_admin all" ON public.documents FOR SELECT USING (((hoa_id = public.get_user_hoa_id(auth.uid())) OR public.is_super_admin(auth.uid())));


--
-- Name: payment_schedules Users can view payment schedules in their HOA or super_admin al; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view payment schedules in their HOA or super_admin al" ON public.payment_schedules FOR SELECT USING (((hoa_id = public.get_user_hoa_id(auth.uid())) OR public.is_super_admin(auth.uid())));


--
-- Name: profiles Users can view profiles in their HOA or super_admin all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view profiles in their HOA or super_admin all" ON public.profiles FOR SELECT USING (((hoa_id = public.get_user_hoa_id(auth.uid())) OR public.is_super_admin(auth.uid())));


--
-- Name: hoas Users can view their own HOA or super_admin all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own HOA or super_admin all" ON public.hoas FOR SELECT USING (((id = public.get_user_hoa_id(auth.uid())) OR public.is_super_admin(auth.uid())));


--
-- Name: payment_requests Users can view their own payment requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own payment requests" ON public.payment_requests FOR SELECT USING ((resident_id = auth.uid()));


--
-- Name: payments Users can view their own payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own payments" ON public.payments FOR SELECT USING ((resident_id = auth.uid()));


--
-- Name: join_requests Users can view their own requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own requests" ON public.join_requests FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: announcements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

--
-- Name: documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

--
-- Name: hoas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hoas ENABLE ROW LEVEL SECURITY;

--
-- Name: join_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_schedules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;

--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: resident_invites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.resident_invites ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;