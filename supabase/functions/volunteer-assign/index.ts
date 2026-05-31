const corsHeaders = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type,authorization"};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const tasks = body.tasks || [];
    const volunteer = body.volunteer || null;
    const volunteers = Array.isArray(body.volunteers)
      ? body.volunteers
      : volunteer
        ? [volunteer]
        : [];
    const useAI = body.use_ai || body.mode === 'recommend' || false;

    // Recommendation mode: score tasks for a single volunteer when provided.
    if (body.mode === 'recommend' && volunteer) {
      const userSkills = volunteer.skills || [];
      const assignments = tasks.map((t: any) => {
        const requiredSkills = t.required_skills || [];
        const overlap = requiredSkills.filter((s: string) =>
          userSkills.some((skill: string) => skill.toLowerCase().includes(String(s).toLowerCase()) || String(s).toLowerCase().includes(skill.toLowerCase())),
        );
        const score = Math.min(95, 35 + overlap.length * 20 + Math.floor(Math.random() * 15));
        return {
          task_id: t.id,
          volunteer_id: volunteer.id,
          score,
          reason: overlap.length ? `Matched on ${overlap.join(', ')}` : 'General fit',
        };
      });
      assignments.sort((a: any, b: any) => b.score - a.score);
      return new Response(JSON.stringify({ assignments }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // If AI is requested and key is available, call OpenAI to score and recommend
    const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY');
    if (useAI && OPENAI_KEY) {
      try {
        const system = `You are an assistant that assigns volunteers to tasks. Each task has id, title, required_skills (array), and priority. Each volunteer has id, name, skills (array), availability windows, and current load (integer). For each task pick the best single volunteer and return a JSON array named assignments where each item has task_id, volunteer_id, score (0-100), and reason (short). Return only JSON.`;
        const userPrompt = JSON.stringify({ tasks: tasks.map((t:any)=>({ id: t.id, title: t.title, required_skills: t.required_skills||[], priority: t.priority||'normal' })), volunteers: volunteers.map((v:any)=>({ id: v.id, name: v.name||'', skills: v.skills||[], load: v.load||0 })) });
        const payload = {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: `Input: ${userPrompt}\n\nRespond with JSON like: {"assignments":[{"task_id":"...","volunteer_id":"...","score":90,"reason":"..."}]}` }
          ],
          temperature: 0,
          max_tokens: 800,
        };
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
          body: JSON.stringify(payload),
        });
        const result = await resp.json();
        const content = result?.choices?.[0]?.message?.content;
        let parsed = null;
        try {
          parsed = JSON.parse(content);
        } catch (e) {
          // Attempt to extract JSON substring
          const match = content && content.match(/\{[\s\S]*\}/);
          if (match) parsed = JSON.parse(match[0]);
        }
        if (parsed && parsed.assignments) {
          return new Response(JSON.stringify({ assignments: parsed.assignments }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        // Fallback to greedy below if parsing failed
      } catch (e) {
        console.error('AI assignment failed', e);
        // fall through to greedy
      }
    }

    // Greedy assigner fallback: for each task pick volunteer with matching skills and lowest load
    const assignments:any[] = [];
    const loadMap = new Map();
    for (const v of volunteers) loadMap.set(v.id, v.load || 0);

    for (const t of tasks) {
      let candidates = volunteers.filter((v:any) => {
        if (!t.required_skills || t.required_skills.length===0) return true;
        return t.required_skills.every((s:string) => (v.skills||[]).includes(s));
      });
      candidates.sort((a:any,b:any) => (loadMap.get(a.id)||0) - (loadMap.get(b.id)||0));
      const chosen = candidates[0];
      if (chosen) {
        assignments.push({ task_id: t.id, volunteer_id: chosen.id, score: 100 - (loadMap.get(chosen.id)||0), reason: 'skill_match' });
        loadMap.set(chosen.id, (loadMap.get(chosen.id)||0)+1);
      }
    }
    return new Response(JSON.stringify({ assignments }), { headers: { ...corsHeaders, 'Content-Type':'application/json' } });
  } catch(e){ return new Response(JSON.stringify({ error: String(e) }), { status:500, headers: { ...corsHeaders, 'Content-Type':'application/json' } }); }
});
