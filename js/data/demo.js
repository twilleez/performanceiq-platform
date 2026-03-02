// /js/data/demo.js
export function demoAthletes() {
  const now = new Date().toISOString();
  return [
    { id: "a_demo_1", name: "Jordan", position: "G", year: "11", tags: ["Starter"], metrics: {}, history: { wellness: [], sessions: [] }, created_at: now },
    { id: "a_demo_2", name: "Greg", position: "F", year: "10", tags: ["Bench"], metrics: {}, history: { wellness: [], sessions: [] }, created_at: now }
  ];
}
