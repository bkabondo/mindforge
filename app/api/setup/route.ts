import { Pool } from 'pg'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('token') !== process.env.SETUP_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })

  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS mindforge_users (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email TEXT NOT NULL UNIQUE,
        full_name TEXT,
        role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      GRANT ALL ON mindforge_users TO anon, authenticated;
      ALTER TABLE mindforge_users ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mf_users_self' AND tablename = 'mindforge_users') THEN
          CREATE POLICY "mf_users_self" ON mindforge_users FOR ALL
            USING (auth.uid() = id OR (SELECT role FROM mindforge_users WHERE id = auth.uid()) = 'admin');
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS mindforge_decks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES mindforge_users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        source_text TEXT,
        card_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      GRANT ALL ON mindforge_decks TO anon, authenticated;
      ALTER TABLE mindforge_decks ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mf_decks_user' AND tablename = 'mindforge_decks') THEN
          CREATE POLICY "mf_decks_user" ON mindforge_decks FOR ALL
            USING (user_id = auth.uid() OR (SELECT role FROM mindforge_users WHERE id = auth.uid()) = 'admin');
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS mindforge_cards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deck_id UUID NOT NULL REFERENCES mindforge_decks(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES mindforge_users(id) ON DELETE CASCADE,
        front TEXT NOT NULL,
        back TEXT NOT NULL,
        difficulty NUMERIC DEFAULT 2.5,
        interval INTEGER DEFAULT 1,
        repetitions INTEGER DEFAULT 0,
        next_review TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      GRANT ALL ON mindforge_cards TO anon, authenticated;
      ALTER TABLE mindforge_cards ENABLE ROW LEVEL SECURITY;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mf_cards_user' AND tablename = 'mindforge_cards') THEN
          CREATE POLICY "mf_cards_user" ON mindforge_cards FOR ALL
            USING (user_id = auth.uid() OR (SELECT role FROM mindforge_users WHERE id = auth.uid()) = 'admin');
        END IF;
      END $$;
    `)

    return NextResponse.json({ status: 'Migration complete — mindforge_users, mindforge_decks, mindforge_cards created' })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  } finally {
    client.release()
    await pool.end()
  }
}
