-- Providers, availability slots, and appointments schema extension

-- Create enums for slot and appointment status if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'slot_status') THEN
    CREATE TYPE public.slot_status AS ENUM ('available', 'booked', 'unavailable');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
    CREATE TYPE public.appointment_status AS ENUM ('booked', 'cancelled', 'completed');
  END IF;
END $$;

-- Providers table
CREATE TABLE IF NOT EXISTS public.providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  specialty TEXT,
  city TEXT,
  state TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Availability slots table
CREATE TABLE IF NOT EXISTS public.availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status slot_status NOT NULL DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (provider_id, start_time)
);

-- Appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL UNIQUE REFERENCES public.availability_slots(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status appointment_status NOT NULL DEFAULT 'booked',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Providers policies
CREATE POLICY "Providers are viewable by all" ON public.providers
  FOR SELECT USING (true);

CREATE POLICY "Providers manage own record" ON public.providers
  FOR ALL
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Availability slot policies
CREATE POLICY "Slots are viewable by all" ON public.availability_slots
  FOR SELECT USING (true);

CREATE POLICY "Providers manage own slots" ON public.availability_slots
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = provider_id AND (p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = provider_id AND (p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- Appointment policies
CREATE POLICY "Patients and providers can view appointments" ON public.appointments
  FOR SELECT
  USING (
    auth.uid() = patient_id
    OR EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = provider_id AND (p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Patients create appointments" ON public.appointments
  FOR INSERT
  WITH CHECK (auth.uid() = patient_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Patients and providers update appointments" ON public.appointments
  FOR UPDATE
  USING (
    auth.uid() = patient_id
    OR EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = provider_id AND (p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    auth.uid() = patient_id
    OR EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = provider_id AND (p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- Update triggers for timestamp columns
CREATE TRIGGER update_providers_updated_at
  BEFORE UPDATE ON public.providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_slots_updated_at
  BEFORE UPDATE ON public.availability_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Booking helper function
CREATE OR REPLACE FUNCTION public.book_appointment(slot_id UUID, notes TEXT DEFAULT NULL)
RETURNS public.appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  slot_record public.availability_slots%ROWTYPE;
  appointment_record public.appointments%ROWTYPE;
BEGIN
  SELECT * INTO slot_record
  FROM public.availability_slots
  WHERE id = slot_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Availability slot not found';
  END IF;

  IF slot_record.status <> 'available' THEN
    RAISE EXCEPTION 'Slot is not available for booking';
  END IF;

  INSERT INTO public.appointments (slot_id, provider_id, patient_id, status, notes)
  VALUES (slot_record.id, slot_record.provider_id, auth.uid(), 'booked', notes)
  RETURNING * INTO appointment_record;

  UPDATE public.availability_slots
  SET status = 'booked'
  WHERE id = slot_record.id;

  RETURN appointment_record;
END;
$$;

-- Appointment cancellation helper
CREATE OR REPLACE FUNCTION public.cancel_appointment(appointment_id UUID)
RETURNS public.appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  appointment_record public.appointments%ROWTYPE;
BEGIN
  SELECT * INTO appointment_record
  FROM public.appointments
  WHERE id = appointment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found';
  END IF;

  IF appointment_record.status = 'cancelled' THEN
    RETURN appointment_record;
  END IF;

  IF auth.uid() <> appointment_record.patient_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.providers p
      WHERE p.id = appointment_record.provider_id AND (p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    ) THEN
      RAISE EXCEPTION 'You do not have permission to cancel this appointment';
    END IF;
  END IF;

  UPDATE public.appointments
  SET status = 'cancelled'
  WHERE id = appointment_id
  RETURNING * INTO appointment_record;

  UPDATE public.availability_slots
  SET status = 'available'
  WHERE id = appointment_record.slot_id;

  RETURN appointment_record;
END;
$$;
