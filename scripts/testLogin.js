require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

(async () => {
  const email = 'collegeadmin@yourcollege.com';
  const password = 'Certi@123';
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  console.log('data', data);
  console.log('error', error);
})();
