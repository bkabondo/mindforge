const { Pool } = require('pg')
// Set DATABASE_URL environment variable before running
// e.g. DATABASE_URL=postgresql://postgres:password@db.project.supabase.co:5432/postgres?sslmode=require
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
async function run() {
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS mindforge_users (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email TEXT NOT NULL UNIQUE, full_name TEXT,
        role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      GRANT ALL ON mindforge_users TO anon, authenticated;
      ALTER TABLE mindforge_users ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "mf_users_select" ON mindforge_users;
      CREATE POLICY "mf_users_select" ON mindforge_users FOR SELECT USING (auth.uid()=id OR EXISTS(SELECT 1 FROM mindforge_users u WHERE u.id=auth.uid() AND u.role='admin'));
      DROP POLICY IF EXISTS "mf_users_insert" ON mindforge_users;
      CREATE POLICY "mf_users_insert" ON mindforge_users FOR INSERT WITH CHECK (auth.uid()=id);
      DROP POLICY IF EXISTS "mf_users_update" ON mindforge_users;
      CREATE POLICY "mf_users_update" ON mindforge_users FOR UPDATE USING (auth.uid()=id);

      CREATE TABLE IF NOT EXISTS mindforge_decks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES mindforge_users(id) ON DELETE CASCADE,
        name TEXT NOT NULL, description TEXT, source_text TEXT, card_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      GRANT ALL ON mindforge_decks TO anon, authenticated;
      ALTER TABLE mindforge_decks ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "mf_decks_all" ON mindforge_decks;
      CREATE POLICY "mf_decks_all" ON mindforge_decks FOR ALL USING (user_id=auth.uid() OR EXISTS(SELECT 1 FROM mindforge_users WHERE id=auth.uid() AND role='admin'));

      CREATE TABLE IF NOT EXISTS mindforge_cards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deck_id UUID NOT NULL REFERENCES mindforge_decks(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES mindforge_users(id) ON DELETE CASCADE,
        front TEXT NOT NULL, back TEXT NOT NULL,
        difficulty REAL DEFAULT 2.5, interval INTEGER DEFAULT 1,
        repetitions INTEGER DEFAULT 0, next_review TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      GRANT ALL ON mindforge_cards TO anon, authenticated;
      ALTER TABLE mindforge_cards ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "mf_cards_all" ON mindforge_cards;
      CREATE POLICY "mf_cards_all" ON mindforge_cards FOR ALL USING (user_id=auth.uid());
    `)
    console.log('Done')
  } finally { client.release(); await pool.end() }
}
run().catch(console.error)
