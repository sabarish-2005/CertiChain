import { supabase } from "../src/integrations/supabase/client";

async function test() {
  const email = "collegeadmin@yourcollege.com";
  const password = "Certi@123";
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  console.log("data:", data);
  console.log("error:", error);
}

test();
