// api/debug-lab.js - Endpoint temporal para debug

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { laboratory_id } = req.body;
    
    if (!laboratory_id) {
      return res.json({ 
        error: 'No laboratory_id provided',
        laboratory_id: laboratory_id
      });
    }

    if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
      return res.json({ 
        error: 'No Supabase config',
        hasUrl: !!process.env.VITE_SUPABASE_URL,
        hasKey: !!process.env.VITE_SUPABASE_ANON_KEY
      });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
    
    const { data: lab, error: labError } = await sb
      .from('laboratories')
      .select('id, name, slug')
      .eq('id', laboratory_id)
      .single();

    const isSpt = lab && lab.slug && String(lab.slug).toLowerCase().includes('spt');
    
    return res.json({
      success: true,
      laboratory_id,
      lab,
      labError,
      isSpt,
      slugCheck: lab?.slug ? String(lab.slug).toLowerCase() : null,
      useGmailApi: isSpt
    });
    
  } catch (error) {
    return res.json({
      success: false,
      error: error.message,
      laboratory_id: req.body?.laboratory_id
    });
  }
}