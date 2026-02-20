import { useState } from "react";

const RAW_DATA = [
  { title: "Gentleman in Moscow", picker: "Don", date: "Jan 2023", don: 70.10, dave: 67.10, chan: null, avg: 68.60 },
  { title: "Tomorrow and Tomorrow and Tomorrow", picker: "Don", date: "Mar 2023", don: 88.50, dave: 77.60, chan: 80.10, avg: 82.07 },
  { title: "The Wager", picker: "Chan", date: "May 2023", don: 77.00, dave: 82.50, chan: 87.30, avg: 82.27 },
  { title: "All Sinners Bleed", picker: "Dave", date: "Jul 2023", don: 70.30, dave: 75.05, chan: 62.00, avg: 69.12 },
  { title: "Band of Brothers", picker: "Chan", date: "Aug 2023", don: 88.40, dave: 90.90, chan: 96.90, avg: 92.07 },
  { title: "Killers of the Flower Moon", picker: "Don", date: "Oct 2023", don: 77.30, dave: 85.90, chan: 86.80, avg: 83.33 },
  { title: "Medium Raw", picker: "Dave", date: "Oct 2023", don: 84.70, dave: 86.90, chan: 92.40, avg: 88.00 },
  { title: "A Short History of Nearly Everything", picker: "Chan", date: "Dec 2023", don: 72.30, dave: 84.50, chan: 85.02, avg: 80.61 },
  { title: "Martyr!", picker: "Don", date: "Feb 2024", don: 77.50, dave: 69.00, chan: 42.00, avg: 62.83 },
  { title: "Lonesome Dove", picker: "Dave", date: "Mar 2024", don: 94.20, dave: 96.91, chan: 93.90, avg: 95.00 },
  { title: "The 7½ Deaths of Evelyn Hardcastle", picker: "Chan", date: "May 2024", don: 77.81, dave: 82.30, chan: 83.60, avg: 81.24 },
  { title: "Demon Copperhead", picker: "Don", date: "Jul 2024", don: 95.89, dave: 91.20, chan: 97.20, avg: 94.76 },
  { title: "When Breath Becomes Air", picker: "Dave", date: "Sep 2024", don: 94.29, dave: 93.10, chan: 86.50, avg: 91.30 },
  { title: "Ultra Processed People", picker: "Chan", date: "Sep 2024", don: 86.34, dave: 87.40, chan: 87.80, avg: 87.18 },
  { title: "Dune", picker: "Don", date: "Nov 2024", don: 84.93, dave: 86.50, chan: 85.20, avg: 85.54 },
  { title: "Matterhorn", picker: "Dave", date: "Jan 2024", don: 88.11, dave: null, chan: 89.84, avg: 88.98 },
  { title: "Say Nothing", picker: "Chan", date: "Mar 2025", don: 81.21, dave: 85.70, chan: 86.56, avg: 84.49 },
  { title: "The Nightingale", picker: "Don", date: "Apr 2025", don: 76.21, dave: 75.40, chan: 78.40, avg: 76.67 },
  { title: "A Thousand Splendid Suns", picker: "Dave", date: "Jul 2025", don: 76.90, dave: 82.30, chan: 81.80, avg: 80.33 },
  { title: "Eminent Dogs, Dangerous Men", picker: "Chan", date: "Aug 2025", don: 62.10, dave: 65.00, chan: 67.90, avg: 65.00 },
  { title: "Shop Class as Soulcraft", picker: "Don", date: "Sep 2025", don: 73.51, dave: 79.70, chan: 71.10, avg: 74.77 },
  { title: "Empire of Pain", picker: "Dave", date: "Oct 2025", don: 84.74, dave: 92.10, chan: 88.93, avg: 88.59 },
  { title: "Small Things Like These", picker: "Chan", date: "Dec 2025", don: 69.71, dave: 81.10, chan: 78.30, avg: 76.37 },
  { title: "Fourth Wing", picker: "Don", date: "Dec 2025", don: 78.43, dave: 80.69, chan: 84.60, avg: 81.24 },
];

const MEMBER_COLORS = {
  Don:  { bg: "#e8f4f8", accent: "#2980b9", text: "#1a5276" },
  Dave: { bg: "#fef9e7", accent: "#d4ac0d", text: "#7d6608" },
  Chan: { bg: "#fdf2f8", accent: "#cb4335", text: "#78281f" },
};

const scoreColor = (score) => {
  if (score >= 90) return "#27ae60";
  if (score >= 80) return "#2ecc71";
  if (score >= 70) return "#f39c12";
  if (score >= 60) return "#e67e22";
  return "#e74c3c";
};

const ScoreBar = ({ score, name }) => {
  if (score === null) return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#bbb", marginBottom: 2 }}>
        <span>{name}</span><span>—</span>
      </div>
      <div style={{ height: 5, background: "#f0f0f0", borderRadius: 3 }} />
    </div>
  );
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
        <span style={{ fontWeight: 600, color: "#555" }}>{name}</span>
        <span style={{ color: scoreColor(score), fontWeight: 700 }}>{score.toFixed(1)}%</span>
      </div>
      <div style={{ height: 5, background: "#f0f0f0", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score}%`, background: scoreColor(score), borderRadius: 3 }} />
      </div>
    </div>
  );
};

export default function BookWormz() {
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("date");
  const [search, setSearch] = useState("");
  const [hovered, setHovered] = useState(null);

  const members = ["All", "Don", "Dave", "Chan"];

  const sorted = [...RAW_DATA]
    .filter(b => filter === "All" || b.picker === filter)
    .filter(b => b.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "score") return b.avg - a.avg;
      if (sort === "title") return a.title.localeCompare(b.title);
      return 0;
    });

  const topBook = [...RAW_DATA].sort((a, b) => b.avg - a.avg)[0];
  const avgAll = (RAW_DATA.reduce((s, b) => s + b.avg, 0) / RAW_DATA.length).toFixed(1);
  const pickerStats = ["Don", "Dave", "Chan"].map(name => {
    const picked = RAW_DATA.filter(b => b.picker === name);
    const avg = (picked.reduce((s, b) => s + b.avg, 0) / picked.length).toFixed(1);
    return { name, count: picked.length, avg };
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f7f4ef", fontFamily: "Georgia, serif", color: "#1a1a1a" }}>
      {/* Header */}
      <div style={{ background: "#1a1a2e", color: "white", padding: "40px 32px 32px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 20px)" }} />
        <div style={{ position: "relative", maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 8 }}>
            <span style={{ fontSize: 48 }}>📚</span>
            <div>
              <div style={{ fontSize: 11, letterSpacing: 4, color: "#aaa", textTransform: "uppercase", marginBottom: 4 }}>Est. 2023</div>
              <h1 style={{ margin: 0, fontSize: 42, fontWeight: 700, letterSpacing: -1 }}>The Book Wormz</h1>
            </div>
          </div>
          <p style={{ margin: "8px 0 24px", color: "#aaa", fontSize: 15 }}>Don · Dave · Chan — {RAW_DATA.length} books read and rated</p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 20px" }}>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{avgAll}%</div>
              <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: 1 }}>Group Avg</div>
            </div>
            {pickerStats.map(p => (
              <div key={p.name} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 20px" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: MEMBER_COLORS[p.name].accent }}>{p.avg}%</div>
                <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: 1 }}>{p.name} · {p.count} picks</div>
              </div>
            ))}
            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 20px", flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>🏆 {topBook.title}</div>
              <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: 1 }}>Top rated · {topBook.avg}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 32px 0" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            placeholder="Search books..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, background: "white", flex: 1, minWidth: 180, fontFamily: "Georgia, serif" }}
          />
          <div style={{ display: "flex", gap: 6 }}>
            {members.map(m => (
              <button key={m} onClick={() => setFilter(m)} style={{
                padding: "9px 15px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "Georgia, serif",
                background: filter === m ? (m === "All" ? "#1a1a2e" : MEMBER_COLORS[m]?.accent) : "white",
                color: filter === m ? "white" : "#555",
              }}>{m}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[["date", "📅 Date"], ["score", "⭐ Score"], ["title", "🔤 Title"]].map(([val, label]) => (
              <button key={val} onClick={() => setSort(val)} style={{
                padding: "9px 12px", borderRadius: 8, border: "1px solid #ddd", cursor: "pointer", fontSize: 12,
                background: sort === val ? "#1a1a2e" : "white", color: sort === val ? "white" : "#555", fontFamily: "Georgia, serif"
              }}>{label}</button>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 13, color: "#888", marginTop: 10 }}>Showing {sorted.length} of {RAW_DATA.length} books</div>
      </div>

      {/* Grid */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 32px 48px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 18 }}>
          {sorted.map((book) => {
            const color = MEMBER_COLORS[book.picker];
            const isHovered = hovered === book.title;
            return (
              <div key={book.title}
                onMouseEnter={() => setHovered(book.title)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  background: "white", borderRadius: 14, overflow: "hidden",
                  boxShadow: isHovered ? "0 8px 28px rgba(0,0,0,0.13)" : "0 2px 10px rgba(0,0,0,0.06)",
                  border: "1px solid #ece9e3",
                  transform: isHovered ? "translateY(-3px)" : "none",
                  transition: "all 0.2s"
                }}>
                <div style={{ height: 5, background: color.accent }} />
                <div style={{ padding: "18px 20px 20px" }}>
                  <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>{book.title}</h3>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
                    <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: color.bg, color: color.text, fontWeight: 700 }}>📖 {book.picker}'s pick</span>
                    <span style={{ fontSize: 11, color: "#aaa" }}>{book.date}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f7f4ef", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
                    <span style={{ fontSize: 12, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Group Score</span>
                    <span style={{ fontSize: 24, fontWeight: 700, color: scoreColor(book.avg) }}>{book.avg.toFixed(1)}%</span>
                  </div>
                  <ScoreBar score={book.don} name="Don" />
                  <ScoreBar score={book.dave} name="Dave" />
                  <ScoreBar score={book.chan} name="Chan" />
                </div>
              </div>
            );
          })}
        </div>
        {sorted.length === 0 && <div style={{ textAlign: "center", padding: 60, color: "#aaa", fontSize: 18 }}>No books found 📚</div>}
      </div>
      <div style={{ textAlign: "center", padding: "0 0 32px", color: "#bbb", fontSize: 12 }}>The Book Wormz · Built with Claude</div>
    </div>
  );
}
