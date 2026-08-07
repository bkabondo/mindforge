const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ykezmltclnblpgpopezo.supabase.co'
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SERVICE_ROLE) { console.error('SUPABASE_SERVICE_ROLE_KEY not set'); process.exit(1) }
const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {auth:{autoRefreshToken:false,persistSession:false}})
const accounts = [
  {email:'kabondobenjamin1@gmail.com',password:process.env.SEED_ADMIN_PASSWORD,full_name:'Benjamin Kabondo',role:'admin'},
  {email:'testuser1@proj.com',password:process.env.SEED_TEST_PASSWORD,full_name:'Alice Johnson',role:'user'},
  {email:'testuser2@proj.com',password:process.env.SEED_TEST_PASSWORD,full_name:'Bob Smith',role:'user'},
  {email:'testuser3@proj.com',password:process.env.SEED_TEST_PASSWORD,full_name:'Carol Davis',role:'user'},
]
async function seed() {
  const {data:{users:existing}} = await admin.auth.admin.listUsers()
  for (const acc of accounts) {
    let uid = existing.find(u=>u.email===acc.email)?.id
    if (!uid) {
      const {data,error} = await admin.auth.admin.createUser({email:acc.email,password:acc.password,email_confirm:true,user_metadata:{full_name:acc.full_name}})
      if (error){console.error(acc.email,error.message);continue}
      uid = data.user.id
    }
    const {error:e2} = await admin.from('mindforge_users').upsert({id:uid,email:acc.email,full_name:acc.full_name,role:acc.role},{onConflict:'id'})
    if(e2) console.error('upsert err',e2.message); else console.log('seeded',acc.email)
  }
  process.exit(0)
}
seed().catch(e=>{console.error(e);process.exit(1)})
