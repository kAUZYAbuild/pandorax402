import { useEffect, useState } from "react";

export default function Home() {
  const [payments, setPayments] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const [p, j, m] = await Promise.allSettled([
          fetch("http://localhost:4000/_debug/payments").then(r => r.json()).catch(()=>({payments:[]})),
          fetch("http://localhost:4001/tasks").then(r => r.json()).catch(()=>({tasks:[]})),
          fetch("http://localhost:4015/latest").then(r => r.json()).catch(()=>({messages:[]}))
        ]);
        if (p.status === 'fulfilled') setPayments(p.value.payments || []);
        if (j.status === 'fulfilled') setTasks(j.value.tasks || []);
        if (m.status === 'fulfilled') setMessages(m.value.messages || []);
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      }
    }, 1500);
    return () => clearInterval(t);
  }, []);
  return (
    <main style={{ fontFamily: "ui-monospace, Menlo", padding: 24 }}>
      <h1>PandoraX402 — Live</h1>
      <section style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:24}}>
        <div>
          <h2>Tasks</h2>
          <pre>{JSON.stringify(tasks, null, 2)}</pre>
        </div>
        <div>
          <h2>Payments</h2>
          <pre>{JSON.stringify(payments.slice(-50), null, 2)}</pre>
        </div>
      </section>
      <section>
        <h2>Conversation (latest 100)</h2>
        <div style={{maxHeight: 400, overflow:'auto', border:'1px solid #ddd', padding:12, borderRadius:8}}>
          {messages.map((m:any)=>(
            <div key={m.id} style={{marginBottom:8}}>
              <b>[{m.role}]</b> {m.text}
              {m.meta && <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(m.meta, null, 2)}</pre>}
            </div>
          ))}
        </div>
      </section>
      <section><h2>How to 402</h2>
        <code>curl -X POST http://localhost:4000/x402/quote -H "content-type: application/json" -d '{{...}}'</code>
      </section>
    </main>
  );
}
