// /js/data/demo.js
export function demoAthletes() {
  const now = new Date().toISOString();

  // Provide richer demo history so Elite features (heatmap / risk) render out-of-box.
  const mkSessions = (loads) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return loads.map((load, idx) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (loads.length - 1 - idx));
      return { date: d.toISOString().slice(0, 10), load };
    });
  };

  return [
    {
      id: "a_demo_1",
      name: "Marcus Johnson",
      position: "PG",
      year: "11",
      number: 23,
      tags: ["Starter"],
      metrics: {},
      history: {
        sessions: mkSessions([70, 80, 92, 45, 70, 55]),
        wellness: [{ date: new Date().toISOString().slice(0, 10), sleep: 8, stress: 3, soreness: 4, readiness: 9 }],
      },
      created_at: now,
    },
    {
      id: "a_demo_2",
      name: "T. Williams",
      position: "C",
      year: "12",
      number: 2,
      tags: ["Bench"],
      metrics: {},
      history: {
        sessions: mkSessions([75, 95, 110, 85, 90, 98]),
        wellness: [{ date: new Date().toISOString().slice(0, 10), sleep: 6, stress: 6, soreness: 7, readiness: 5 }],
      },
      created_at: now,
    },
  ];
}
