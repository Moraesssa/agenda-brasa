-- Create table for consultations
CREATE TABLE IF NOT EXISTS public.patient_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  summary TEXT,
  consultation_date TIMESTAMP WITH TIME ZONE NOT NULL,
  follow_up_actions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS patient_consultations_patient_id_idx
  ON public.patient_consultations(patient_id);
CREATE INDEX IF NOT EXISTS patient_consultations_provider_id_idx
  ON public.patient_consultations(provider_id);

-- Create table for laboratory results
CREATE TABLE IF NOT EXISTS public.lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  result_url TEXT,
  collected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lab_results_patient_id_idx
  ON public.lab_results(patient_id);
CREATE INDEX IF NOT EXISTS lab_results_provider_id_idx
  ON public.lab_results(provider_id);

-- Create table for patient diary and clinical notes
CREATE TABLE IF NOT EXISTS public.patient_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  mood TEXT,
  title TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS patient_notes_patient_id_idx
  ON public.patient_notes(patient_id);
CREATE INDEX IF NOT EXISTS patient_notes_author_id_idx
  ON public.patient_notes(author_id);

-- Enum to support structured reminder schedules
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type typ
    JOIN pg_namespace nsp ON nsp.oid = typ.typnamespace
    WHERE nsp.nspname = 'public' AND typ.typname = 'reminder_schedule_type'
  ) THEN
    CREATE TYPE public.reminder_schedule_type AS ENUM ('once', 'daily', 'weekly', 'custom');
  END IF;
END $$;

-- Create table for reminder schedules
CREATE TABLE IF NOT EXISTS public.reminder_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  dosage TEXT,
  instructions TEXT,
  schedule_type reminder_schedule_type NOT NULL DEFAULT 'daily',
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  recurrence_interval_minutes INTEGER DEFAULT 1440,
  days_of_week SMALLINT[] DEFAULT '{}',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  notify_email BOOLEAN NOT NULL DEFAULT true,
  notify_push BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  next_trigger_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CHECK (recurrence_interval_minutes IS NULL OR recurrence_interval_minutes > 0),
  CHECK (schedule_type <> 'custom' OR recurrence_interval_minutes IS NOT NULL),
  CHECK (days_of_week <@ ARRAY[0,1,2,3,4,5,6])
);

CREATE INDEX IF NOT EXISTS reminder_schedules_patient_id_idx
  ON public.reminder_schedules(patient_id);
CREATE INDEX IF NOT EXISTS reminder_schedules_next_trigger_at_idx
  ON public.reminder_schedules(next_trigger_at);

-- Table to log reminder deliveries
CREATE TABLE IF NOT EXISTS public.reminder_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID NOT NULL REFERENCES public.reminder_schedules(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'push')),
  status TEXT NOT NULL DEFAULT 'sent',
  payload JSONB,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reminder_notifications_reminder_id_idx
  ON public.reminder_notifications(reminder_id);
CREATE INDEX IF NOT EXISTS reminder_notifications_patient_id_idx
  ON public.reminder_notifications(patient_id);

-- Enable row level security
ALTER TABLE public.patient_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for consultations
CREATE POLICY IF NOT EXISTS "Patients and care team can view consultations"
ON public.patient_consultations
FOR SELECT
USING (
  patient_id = auth.uid()
  OR provider_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY IF NOT EXISTS "Patients and providers manage consultations"
ON public.patient_consultations
FOR INSERT
WITH CHECK (
  patient_id = auth.uid()
  OR public.has_role(auth.uid(), 'medico')
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY IF NOT EXISTS "Patients and providers update consultations"
ON public.patient_consultations
FOR UPDATE
USING (
  patient_id = auth.uid()
  OR provider_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  patient_id = auth.uid()
  OR public.has_role(auth.uid(), 'medico')
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY IF NOT EXISTS "Patients delete their consultations"
ON public.patient_consultations
FOR DELETE
USING (
  patient_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- Policies for lab results
CREATE POLICY IF NOT EXISTS "Patients and care team can view lab results"
ON public.lab_results
FOR SELECT
USING (
  patient_id = auth.uid()
  OR provider_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY IF NOT EXISTS "Providers manage lab results"
ON public.lab_results
FOR INSERT
WITH CHECK (
  patient_id = auth.uid()
  OR public.has_role(auth.uid(), 'medico')
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY IF NOT EXISTS "Providers update lab results"
ON public.lab_results
FOR UPDATE
USING (
  patient_id = auth.uid()
  OR provider_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  patient_id = auth.uid()
  OR public.has_role(auth.uid(), 'medico')
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY IF NOT EXISTS "Patients delete lab results they created"
ON public.lab_results
FOR DELETE
USING (
  patient_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- Policies for patient notes (diary entries)
CREATE POLICY IF NOT EXISTS "Patients manage their own notes"
ON public.patient_notes
FOR ALL
USING (patient_id = auth.uid())
WITH CHECK (patient_id = auth.uid());

-- Policies for reminders
CREATE POLICY IF NOT EXISTS "Patients manage their reminders"
ON public.reminder_schedules
FOR ALL
USING (patient_id = auth.uid())
WITH CHECK (patient_id = auth.uid());

-- Policies for reminder notifications history
CREATE POLICY IF NOT EXISTS "Patients view their reminder notifications"
ON public.reminder_notifications
FOR SELECT
USING (patient_id = auth.uid());

-- Update triggers for automatic timestamp maintenance
CREATE TRIGGER IF NOT EXISTS update_patient_consultations_updated_at
  BEFORE UPDATE ON public.patient_consultations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_lab_results_updated_at
  BEFORE UPDATE ON public.lab_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_patient_notes_updated_at
  BEFORE UPDATE ON public.patient_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_reminder_schedules_updated_at
  BEFORE UPDATE ON public.reminder_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_reminder_notifications_updated_at
  BEFORE UPDATE ON public.reminder_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
