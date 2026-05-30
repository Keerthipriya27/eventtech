import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function RecentMessages({ userId }: { userId: string }) {
  const [msgs, setMsgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, [userId]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await (supabase as any)
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(full_name)')
        .or(`recipient_id.eq.${userId},sender_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(10);
      setMsgs(data || []);
    } catch (e:any) { console.error('load messages', e); }
    setLoading(false);
  };

  const markRead = async (id: string) => {
    try {
      await (supabase as any).from('messages').update({ read: true }).eq('id', id);
      setMsgs((m) => m.map(x => x.id===id?{...x, read:true}:x));
    } catch (e:any) { toast.error(e.message||'Failed'); }
  };

  if (!msgs.length) return <div className="text-sm text-muted-foreground">No messages yet.</div>;

  return (
    <div className="space-y-2">
      {msgs.map((m:any)=> (
        <div key={m.id} className="p-3 rounded-lg bg-muted flex items-start justify-between">
          <div>
            <div className="text-sm font-medium">{m.sender?.full_name || (m.sender_id===userId? 'You' : 'Unknown')}</div>
            <div className="text-xs text-muted-foreground">{m.body}</div>
            <div className="text-xs text-muted-foreground mt-1">{new Date(m.created_at).toLocaleString()}</div>
          </div>
          <div className="flex flex-col gap-2">
            {!m.read && <Badge className="text-xs">New</Badge>}
            {!m.read && <Button size="sm" variant="outline" onClick={()=>markRead(m.id)}>Mark read</Button>}
          </div>
        </div>
      ))}
    </div>
  );
}
