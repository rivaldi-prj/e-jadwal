-- ==============================================================================
-- SKEMA DATABASE SUPABASE - E-JADWAL ZOOM S1 KEBIDANAN FIKES UNBRAH
-- Jalankan kode SQL ini di menu: "SQL Editor" -> "New Query" pada dashboard Supabase
-- ==============================================================================

-- 1. Buat Tabel Jadwal Perkuliahan (bookings)
CREATE TABLE IF NOT EXISTS public.bookings (
    id TEXT PRIMARY KEY,
    day TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    batch TEXT NOT NULL,
    note TEXT NOT NULL,
    pic TEXT DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- === FITUR STATUS BOOKING (v2) ===
    status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_by TEXT DEFAULT '',
    requester_email TEXT DEFAULT '',
    requested_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    reject_reason TEXT DEFAULT ''
);

-- Migrasi: tambah kolom status, email, dan room (aman dijalankan berkali-kali)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected'));
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS requested_by TEXT DEFAULT '';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS requester_email TEXT DEFAULT '';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS reject_reason TEXT DEFAULT '';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS room TEXT DEFAULT 'zoom';

-- Set semua booking lama (tanpa status) menjadi 'approved'
UPDATE public.bookings SET status = 'approved' WHERE status IS NULL;
UPDATE public.bookings SET room = 'zoom' WHERE room IS NULL;

-- Penegakan Aturan di Database: Cegah dua jadwal/pengajuan aktif memakai ruang (Zoom/Google Meet) pada hari & jam yang sama
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_booking_slot_room 
ON public.bookings (day, time_slot, room) 
WHERE status != 'rejected';

-- 2. Buat Tabel Konfigurasi Akun Zoom (zoom_config)
CREATE TABLE IF NOT EXISTS public.zoom_config (
    id INT PRIMARY KEY DEFAULT 1,
    name TEXT DEFAULT 'ZOOM KEBIDANAN',
    join_url TEXT NOT NULL,
    meeting_id TEXT NOT NULL,
    passcode TEXT NOT NULL,
    gmeet_url TEXT DEFAULT 'https://meet.google.com/kqe-reho-vbd',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.zoom_config ADD COLUMN IF NOT EXISTS gmeet_url TEXT DEFAULT 'https://meet.google.com/kqe-reho-vbd';

-- Masukkan Konfigurasi Akun Zoom Bawaan S1 Kebidanan
INSERT INTO public.zoom_config (id, name, join_url, meeting_id, passcode, gmeet_url)
VALUES (
    1,
    'ZOOM KEBIDANAN',
    'https://zoom.us/j/91053222846?pwd=IVBzhDahrYwKkOZtl80RS88eZH1JzE.1',
    '910 5322 2846',
    '433452',
    'https://meet.google.com/kqe-reho-vbd'
)
ON CONFLICT (id) DO UPDATE SET gmeet_url = EXCLUDED.gmeet_url WHERE public.zoom_config.gmeet_url IS NULL;

-- 3. Aktifkan Keamanan Row Level Security (RLS)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zoom_config ENABLE ROW LEVEL SECURITY;

-- 4. Buat Kebijakan Akses (Mahasiswa & Admin dapat Membaca & Mengubah Data)
DROP POLICY IF EXISTS "Public Read Bookings" ON public.bookings;
CREATE POLICY "Public Read Bookings" ON public.bookings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Insert Bookings" ON public.bookings;
CREATE POLICY "Public Insert Bookings" ON public.bookings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public Update Bookings" ON public.bookings;
CREATE POLICY "Public Update Bookings" ON public.bookings FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public Delete Bookings" ON public.bookings;
CREATE POLICY "Public Delete Bookings" ON public.bookings FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public Read Zoom Config" ON public.zoom_config;
CREATE POLICY "Public Read Zoom Config" ON public.zoom_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Update Zoom Config" ON public.zoom_config;
CREATE POLICY "Public Update Zoom Config" ON public.zoom_config FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public Insert Zoom Config" ON public.zoom_config;
CREATE POLICY "Public Insert Zoom Config" ON public.zoom_config FOR INSERT WITH CHECK (true);

-- 5. Aktifkan Fitur Realtime (Sinkronisasi Langsung ke HP Mahasiswa saat ada perubahan)
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.zoom_config;
