import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// manually load .env
const envPath = path.resolve(process.cwd(), '.env');
let env = {};
try {
  const envText = fs.readFileSync(envPath, 'utf-8');
  envText.split(/\r?\n/).forEach(line => {
    const m = line.match(/^(\w+)=(?:"([^"]*)"|(.*))$/);
    if (m) {
      env[m[1]] = m[2] ?? m[3];
    }
  });
} catch {
  // ignore missing file
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);

const email = 'collegeadmin@yourcollege.com';
const password = 'Certi@123';
const { data, error } = await supabase.auth.signInWithPassword({ email, password });
console.log('data', data);
console.log('error', error);
