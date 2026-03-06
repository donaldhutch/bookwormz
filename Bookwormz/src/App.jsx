import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from "recharts";

const SUPABASE_URL  = "https://fdwtssdcapcproraekan.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkd3Rzc2RjYXBjcHJvcmFla2FuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NTI1MjksImV4cCI6MjA4ODMyODUyOX0.m5GnAkZKiPTgXiNd3vj3QiHcn_RKUNw4q-NPJe4RjWY";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

const GOOGLE_BOOKS_API_KEY = "AIzaSyDtm_GPThGXNzn_wpPqls-gjGjeO-TfciU";

const MEMBER_COLORS = {
  Don:  { bg: "#e8f4f8", accent: "#2980b9", text: "#1a5276" },
  Dave: { bg: "#fef9e7", accent: "#d4ac0d", text: "#7d6608" },
  Chan: { bg: "#fdf2f8", accent: "#cb4335", text: "#78281f" },
};

const pctToStars = (pct) => pct === null ? null : Math.round((pct / 100 * 5) * 100) / 100;

const starColor = (stars) => {
  if (stars >= 4.5) return "#27ae60";
  if (stars >= 4.0) return "#2ecc71";
  if (stars >= 3.5) return "#f39c12";
  if (stars >= 3.0) return "#e67e22";
  return "#e74c3c";
};

const StarDisplay = ({ stars }) => {
  if (stars === null) return null;
  const full  = Math.floor(stars);
  const half  = stars - full >= 0.25 && stars - full < 0.75;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span style={{ fontSize: 13, letterSpacing: 1 }}>
      {"★".repeat(full)}{half ? "½" : ""}{"☆".repeat(empty)}
    </span>
  );
};

const ScoreRow = ({ stars, name, color }) => {
  if (stars === null) return (
    <div style={{ marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "#bbb" }}>
      <span>{name}</span><span>—</span>
    </div>
  );
  return (
    <div style={{ marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#555" }}>{name}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ color: color || starColor(stars) }}><StarDisplay stars={stars} /></span>
        <span style={{ fontSize: 12, fontWeight: 700, color: color || starColor(stars) }}>{stars.toFixed(2)}</span>
      </div>
    </div>
  );
};

const shortTitle = (title) => title.length > 16 ? title.slice(0, 14) + "…" : title;

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: "white", border: "1px solid #ece9e3", borderRadius: 10, padding: "12px 16px", boxShadow: "0 4px 16px rgba(0,0,0,0.1)", fontFamily: "Georgia, serif", minWidth: 180 }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: "#1a1a2e" }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 12, marginBottom: 4 }}>
          <span style={{ color: p.fill, fontWeight: 600 }}>{p.name}</span>
          <span style={{ fontWeight: 700 }}>{"★".repeat(Math.floor(p.value))}{"☆".repeat(5 - Math.floor(p.value))} {p.value.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
};

async function fetchCoverThumbnail(isbn, title, author) {
  try {
    if (isbn) {
      const res  = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=5&key=${GOOGLE_BOOKS_API_KEY}`);
      const data = await res.json();
      for (const item of (data.items || [])) {
        const t = item.volumeInfo?.imageLinks?.thumbnail || item.volumeInfo?.imageLinks?.smallThumbnail;
        if (t) return t.replace("http://", "https://");
      }
    }
    const q    = encodeURIComponent(`intitle:${title} inauthor:${author}`);
    const res  = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=5&key=${GOOGLE_BOOKS_API_KEY}`);
    const data = await res.json();
    for (const item of (data.items || [])) {
      const t = item.volumeInfo?.imageLinks?.thumbnail || item.volumeInfo?.imageLinks?.smallThumbnail;
      if (t) return t.replace("http://", "https://");
    }
    return null;
  } catch { return null; }
}

// ─── INSIGHTS PAGE ────────────────────────────────────────────────────────────

const COMPARE_OPTIONS = [
  { key: "avg",  label: "🐛 Book Wormz", color: "#1a1a2e", dataKey: b => b.avg },
  { key: "Don",  label: "Don",           color: "#2980b9", dataKey: b => b.don },
  { key: "Dave", label: "Dave",          color: "#d4ac0d", dataKey: b => b.dave },
  { key: "Chan", label: "Chan",          color: "#cb4335", dataKey: b => b.chan },
];

function InsightsPage({ books }) {
  const [compareKey, setCompareKey] = useState("avg");
  const finishedBooks = books.filter(b => b.avg !== null);

  const parseDate    = (d) => d ? new Date(d).getTime() : 0;
  const chronological = [...finishedBooks].sort((a, b) => parseDate(a.date_picked) - parseDate(b.date_picked));
  const compareOption = COMPARE_OPTIONS.find(o => o.key === compareKey);

  const chartData = chronological.map(b => ({
    title:      b.title,
    shortTitle: shortTitle(b.title),
    [compareOption.label]: compareOption.dataKey(b) !== null ? parseFloat(compareOption.dataKey(b).toFixed(2)) : null,
    "Goodreads": b.goodreads_score !== null ? parseFloat(b.goodreads_score.toFixed(2)) : null,
  }));

  const booksWithBoth = finishedBooks.filter(b => compareOption.dataKey(b) !== null && b.goodreads_score !== null);
  const compareAvg    = booksWithBoth.length ? (booksWithBoth.reduce((s, b) => s + compareOption.dataKey(b), 0) / booksWithBoth.length).toFixed(2) : null;
  const grBooks       = finishedBooks.filter(b => b.goodreads_score !== null);
  const grAvg         = grBooks.length ? (grBooks.reduce((s, b) => s + b.goodreads_score, 0) / grBooks.length).toFixed(2) : null;
  const ratedHigher   = booksWithBoth.filter(b => compareOption.dataKey(b) > b.goodreads_score).length;
  const grHigher      = booksWithBoth.filter(b => b.goodreads_score > compareOption.dataKey(b)).length;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 32px 64px" }}>
      <h2 style={{ fontSize: 26, fontWeight: 700, color: "#1a1a2e", marginBottom: 6 }}>📊 Ratings Over Time</h2>
      <p style={{ color: "#888", fontSize: 14, marginBottom: 24 }}>Compare ratings vs. Goodreads, in the order books were read.</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#aaa", marginRight: 4 }}>Compare:</span>
        {COMPARE_OPTIONS.map(opt => (
          <button key={opt.key} onClick={() => setCompareKey(opt.key)} style={{
            padding: "8px 16px", borderRadius: 8, border: `2px solid ${opt.color}`,
            cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "Georgia, serif",
            background: compareKey === opt.key ? opt.color : "white",
            color: compareKey === opt.key ? "white" : opt.color, transition: "all 0.15s",
          }}>{opt.label}</button>
        ))}
        <span style={{ fontSize: 12, color: "#aaa" }}>vs. 📗 Goodreads</span>
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 36 }}>
        {compareAvg && (
          <div style={{ background: "white", borderRadius: 12, padding: "16px 22px", border: `1px solid ${compareOption.color}44`, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: compareOption.color }}>{compareAvg} ★</div>
            <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: 1 }}>{compareOption.label} Avg</div>
          </div>
        )}
        {grAvg && (
          <div style={{ background: "white", borderRadius: 12, padding: "16px 22px", border: "1px solid #4a7c5944", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#4a7c59" }}>{grAvg} ★</div>
            <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: 1 }}>Goodreads Avg</div>
          </div>
        )}
        <div style={{ background: "white", borderRadius: 12, padding: "16px 22px", border: "1px solid #ece9e3", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: compareOption.color }}>{ratedHigher}</div>
          <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: 1 }}>{compareOption.label} Rated Higher</div>
        </div>
        <div style={{ background: "white", borderRadius: 12, padding: "16px 22px", border: "1px solid #ece9e3", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#4a7c59" }}>{grHigher}</div>
          <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: 1 }}>Goodreads Rated Higher</div>
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 16, border: "1px solid #ece9e3", padding: "28px 16px 16px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
        <ResponsiveContainer width="100%" height={420}>
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 80 }} barCategoryGap="25%" barGap={3}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="shortTitle" tick={{ fontFamily: "Georgia, serif", fontSize: 11, fill: "#888" }} angle={-45} textAnchor="end" interval={0} />
            <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontFamily: "Georgia, serif", fontSize: 11, fill: "#888" }} tickFormatter={v => `${v}★`} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontFamily: "Georgia, serif", fontSize: 13, paddingTop: 12 }} formatter={(value) => <span style={{ color: "#444" }}>{value}</span>} />
            {compareAvg && <ReferenceLine y={parseFloat(compareAvg)} stroke={compareOption.color} strokeDasharray="4 4" strokeOpacity={0.4} />}
            {grAvg      && <ReferenceLine y={parseFloat(grAvg)}      stroke="#4a7c59"             strokeDasharray="4 4" strokeOpacity={0.4} />}
            <Bar dataKey={compareOption.label} fill={compareOption.color} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Goodreads"           fill="#4a7c59"             radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div style={{ fontSize: 11, color: "#bbb", textAlign: "center", marginTop: 4 }}>Dashed lines show all-time averages</div>
      </div>
    </div>
  );
}

// ─── SUBMIT SCORE MODAL ───────────────────────────────────────────────────────

function SubmitScoreModal({ books, memberName, existingScores, onClose, onSubmitted }) {
  const [bookId, setBookId]   = useState("");
  const [score, setScore]     = useState("");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);

  const scorableBooks = books.filter(b => {
    const alreadyScored = existingScores.some(s => s.book_id === b.id && s.member_name === memberName);
    return !alreadyScored;
  });

  const handleSubmit = async () => {
    if (!bookId) return setError("Please select a book.");
    const val = parseFloat(score);
    if (isNaN(val) || val < 1 || val > 100) return setError("Score must be between 1 and 100.");
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from("scores").upsert({ book_id: bookId, member_name: memberName, score: val }, { onConflict: "book_id,member_name" });
    if (err) { setError(err.message); setSaving(false); return; }
    onSubmitted();
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "white", borderRadius: 16, padding: 32, width: 400, maxWidth: "90vw", fontFamily: "Georgia, serif", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 20, color: "#1a1a2e" }}>📝 Submit Score</h3>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>Book</label>
          <select value={bookId} onChange={e => setBookId(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, fontFamily: "Georgia, serif", background: "white" }}>
            <option value="">Select a book...</option>
            {scorableBooks.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>Score (1–100)</label>
          <input
            type="number" min="1" max="100" value={score}
            onChange={e => setScore(e.target.value)}
            placeholder="e.g. 85"
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, fontFamily: "Georgia, serif", boxSizing: "border-box" }}
          />
          {score && !isNaN(parseFloat(score)) && (
            <div style={{ fontSize: 12, color: "#888", marginTop: 6 }}>= {pctToStars(parseFloat(score)).toFixed(2)} ★</div>
          )}
        </div>
        {error && <div style={{ color: "#e74c3c", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #ddd", background: "white", cursor: "pointer", fontFamily: "Georgia, serif" }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#1a1a2e", color: "white", cursor: "pointer", fontFamily: "Georgia, serif", fontWeight: 600 }}>
            {saving ? "Saving..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ADD / EDIT BOOK MODAL (admin only) ───────────────────────────────────────

function BookModal({ book, onClose, onSaved }) {
  const blank = { title: "", author: "", year: "", picker: "", date_picked: "", isbn: "", goodreads_score: "" };
  const [form, setForm]     = useState(book || blank);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);
  const isEdit = !!book;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) return setError("Title is required.");
    setSaving(true);
    setError(null);
    const payload = {
      title:          form.title.trim(),
      author:         form.author.trim(),
      year:           form.year.trim(),
      picker:         form.picker.trim(),
      date_picked:    form.date_picked.trim(),
      isbn:           form.isbn.trim(),
      goodreads_score: form.goodreads_score !== "" ? parseFloat(form.goodreads_score) : null,
    };
    let err;
    if (isEdit) {
      ({ error: err } = await supabase.from("books").update(payload).eq("id", book.id));
    } else {
      ({ error: err } = await supabase.from("books").insert(payload));
    }
    if (err) { setError(err.message); setSaving(false); return; }
    onSaved();
    onClose();
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${form.title}"? This will also delete all scores for this book.`)) return;
    setSaving(true);
    const { error: err } = await supabase.from("books").delete().eq("id", book.id);
    if (err) { setError(err.message); setSaving(false); return; }
    onSaved();
    onClose();
  };

  const fields = [
    { key: "title",          label: "Book Title",    placeholder: "e.g. Lonesome Dove" },
    { key: "author",         label: "Author",        placeholder: "e.g. Larry McMurtry" },
    { key: "year",           label: "Year Published",placeholder: "e.g. 1985" },
    { key: "picker",         label: "Who Picked",    placeholder: "Don, Dave, or Chan" },
    { key: "date_picked",    label: "Date Picked",   placeholder: "e.g. 3/25/24" },
    { key: "isbn",           label: "ISBN",          placeholder: "e.g. 9780743224543" },
    { key: "goodreads_score",label: "Goodreads Score",placeholder: "e.g. 4.32" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, overflowY: "auto" }}>
      <div style={{ background: "white", borderRadius: 16, padding: 32, width: 460, maxWidth: "90vw", fontFamily: "Georgia, serif", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", margin: "20px auto" }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 20, color: "#1a1a2e" }}>{isEdit ? "✏️ Edit Book" : "➕ Add New Book"}</h3>
        {fields.map(f => (
          <div key={f.key} style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 5 }}>{f.label}</label>
            <input
              value={form[f.key] || ""}
              onChange={e => set(f.key, e.target.value)}
              placeholder={f.placeholder}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, fontFamily: "Georgia, serif", boxSizing: "border-box" }}
            />
          </div>
        ))}
        {error && <div style={{ color: "#e74c3c", fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "space-between", marginTop: 8 }}>
          <div>
            {isEdit && (
              <button onClick={handleDelete} disabled={saving} style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#fdf2f2", color: "#e74c3c", cursor: "pointer", fontFamily: "Georgia, serif", fontWeight: 600 }}>
                Delete
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #ddd", background: "white", cursor: "pointer", fontFamily: "Georgia, serif" }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#1a1a2e", color: "white", cursor: "pointer", fontFamily: "Georgia, serif", fontWeight: 600 }}>
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Book"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── HISTORY PAGE ─────────────────────────────────────────────────────────────

function HistoryPage({ books, memberName }) {
  const [posts, setPosts]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [bookId, setBookId]       = useState("");
  const [title, setTitle]         = useState("");
  const [url, setUrl]             = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [postType, setPostType]   = useState("link"); // "link" | "image"
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState(null);

  const loadPosts = async () => {
    const { data } = await supabase.from("posts").select("*, books(title)").order("created_at", { ascending: false });
    setPosts(data || []);
    setLoading(false);
  };

  useEffect(() => { loadPosts(); }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const resetForm = () => {
    setUrl(""); setTitle(""); setBookId("");
    setImageFile(null); setImagePreview(null);
    setPostType("link"); setShowForm(false); setError(null);
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);

    let imageUrl = null;

    // Upload image if provided
    if (postType === "image") {
      if (!imageFile) return setError("Please select an image.") || setSaving(false);
      const ext      = imageFile.name.split(".").pop();
      const filename = `${Date.now()}-${memberName}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("post-images")
        .upload(filename, imageFile, { contentType: imageFile.type });
      if (uploadErr) { setError(uploadErr.message); setSaving(false); return; }
      const { data: { publicUrl } } = supabase.storage.from("post-images").getPublicUrl(filename);
      imageUrl = publicUrl;
    } else {
      if (!url.trim()) { setError("URL is required."); setSaving(false); return; }
    }

    const { error: err } = await supabase.from("posts").insert({
      book_id:     bookId || null,
      member_name: memberName,
      title:       title.trim() || null,
      url:         postType === "link" ? url.trim() : null,
      image_url:   imageUrl,
    });

    if (err) { setError(err.message); setSaving(false); return; }
    resetForm();
    loadPosts();
    setSaving(false);
  };

  const handleDelete = async (id, imageUrl) => {
    if (!window.confirm("Delete this post?")) return;
    // Delete image from storage if it exists
    if (imageUrl) {
      const filename = imageUrl.split("/").pop();
      await supabase.storage.from("post-images").remove([filename]);
    }
    await supabase.from("posts").delete().eq("id", id);
    loadPosts();
  };

  const formatDate = (ts) => new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const getLinkPreview = (url) => {
    try {
      const u = new URL(url);
      if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) return { icon: "🎬", label: "YouTube Video" };
      if (u.hostname.includes("docs.google.com") && url.includes("presentation")) return { icon: "📊", label: "Google Slides" };
      if (u.hostname.includes("docs.google.com")) return { icon: "📄", label: "Google Doc" };
      if (u.hostname.includes("drive.google.com")) return { icon: "📁", label: "Google Drive" };
      if (u.hostname.includes("dropbox.com")) return { icon: "📦", label: "Dropbox" };
      if (u.hostname.includes("photos.google.com") || u.hostname.includes("photo")) return { icon: "📷", label: "Photos" };
      if (u.hostname.includes("vimeo.com")) return { icon: "🎬", label: "Vimeo Video" };
      return { icon: "🔗", label: u.hostname };
    } catch { return { icon: "🔗", label: "Link" }; }
  };

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 32px 64px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h2 style={{ fontSize: 26, fontWeight: 700, color: "#1a1a2e", margin: 0 }}>📜 Group History</h2>
        <button onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }} style={{
          padding: "10px 18px", borderRadius: 8, border: "none", cursor: "pointer",
          fontSize: 13, fontWeight: 600, fontFamily: "Georgia, serif",
          background: showForm ? "#eee" : "#1a1a2e", color: showForm ? "#555" : "white"
        }}>{showForm ? "Cancel" : "➕ Add Post"}</button>
      </div>
      <p style={{ color: "#888", fontSize: 14, marginBottom: 28 }}>Videos, slides, photos and memories — members only.</p>

      {/* Add post form */}
      {showForm && (
        <div style={{ background: "white", borderRadius: 14, padding: 24, border: "1px solid #ece9e3", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", marginBottom: 28 }}>

          {/* Post type toggle */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {[["link", "🔗 Link"], ["image", "📷 Photo"]].map(([type, label]) => (
              <button key={type} onClick={() => setPostType(type)} style={{
                padding: "8px 18px", borderRadius: 8, border: `2px solid ${postType === type ? "#1a1a2e" : "#ddd"}`,
                background: postType === type ? "#1a1a2e" : "white",
                color: postType === type ? "white" : "#888",
                cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "Georgia, serif"
              }}>{label}</button>
            ))}
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 5 }}>Book (optional)</label>
            <select value={bookId} onChange={e => setBookId(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, fontFamily: "Georgia, serif", background: "white" }}>
              <option value="">— General / no specific book —</option>
              {[...books].sort((a,b) => a.title.localeCompare(b.title)).map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 5 }}>Title (optional)</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder={postType === "image" ? "e.g. Book club night photos" : "e.g. Band of Brothers discussion video"}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, fontFamily: "Georgia, serif", boxSizing: "border-box" }} />
          </div>

          {postType === "link" ? (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 5 }}>URL *</label>
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..."
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, fontFamily: "Georgia, serif", boxSizing: "border-box" }} />
            </div>
          ) : (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 5 }}>Photo *</label>
              <input type="file" accept="image/*" onChange={handleImageChange}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, fontFamily: "Georgia, serif", boxSizing: "border-box", background: "white" }} />
              {imagePreview && (
                <img src={imagePreview} alt="Preview" style={{ marginTop: 12, maxWidth: "100%", maxHeight: 240, borderRadius: 8, objectFit: "cover", border: "1px solid #eee" }} />
              )}
            </div>
          )}

          {error && <div style={{ color: "#e74c3c", fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button onClick={handleSubmit} disabled={saving} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: "#1a1a2e", color: "white", cursor: "pointer", fontFamily: "Georgia, serif", fontWeight: 600 }}>
            {saving ? "Uploading..." : "Post"}
          </button>
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>Loading...</div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#aaa", fontSize: 16 }}>No posts yet — add the first one! 📎</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {posts.map(post => {
            const color = MEMBER_COLORS[post.member_name] || MEMBER_COLORS["Don"];
            const isPhoto = !!post.image_url;
            const preview = !isPhoto && post.url ? getLinkPreview(post.url) : null;
            return (
              <div key={post.id} style={{ background: "white", borderRadius: 14, border: "1px solid #ece9e3", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
                {/* Photo */}
                {isPhoto && (
                  <img src={post.image_url} alt={post.title || "Photo"} style={{ width: "100%", maxHeight: 400, objectFit: "cover", display: "block" }} />
                )}
                <div style={{ padding: "16px 20px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                  {!isPhoto && <div style={{ fontSize: 28, flexShrink: 0, marginTop: 2 }}>{preview?.icon}</div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {!isPhoto && post.url ? (
                      <a href={post.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e", textDecoration: "none", display: "block", marginBottom: 6, wordBreak: "break-word" }}>
                        {post.title || preview?.label}
                      </a>
                    ) : post.title ? (
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e", marginBottom: 6 }}>{post.title}</div>
                    ) : null}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      {post.books?.title && (
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#f0f0f0", color: "#666" }}>📚 {post.books.title}</span>
                      )}
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: color.bg, color: color.text, fontWeight: 600 }}>{post.member_name}</span>
                      <span style={{ fontSize: 11, color: "#bbb" }}>{formatDate(post.created_at)}</span>
                      {isPhoto && (
                        <a href={post.image_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#aaa", textDecoration: "none" }}>View full size ↗</a>
                      )}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(post.id, post.image_url)} style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: "#ddd", fontSize: 16, padding: 4 }} title="Delete">✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function BookWormz() {
  const [session, setSession]           = useState(null);
  const [member, setMember]             = useState(null);
  const [books, setBooks]               = useState([]);
  const [scores, setScores]             = useState([]);
  const [thumbnails, setThumbnails]     = useState({});
  const [loading, setLoading]           = useState(true);
  const [authLoading, setAuthLoading]   = useState(true);
  const [filter, setFilter]             = useState("All");
  const [sort, setSort]                 = useState("score");
  const [search, setSearch]             = useState("");
  const [hovered, setHovered]           = useState(null);
  const [page, setPage]                 = useState("books");
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showBookModal, setShowBookModal]   = useState(false);
  const [showLoginModal, setShowLoginModal]   = useState(false);
  const [editingBook, setEditingBook]       = useState(null);
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [authError, setAuthError]       = useState(null);
  const [signingIn, setSigningIn]       = useState(false);

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load member profile when session changes
  useEffect(() => {
    if (!session) { setMember(null); return; }
    supabase.from("members").select("*").eq("id", session.user.id).single()
      .then(({ data }) => setMember(data));
  }, [session]);

  // Load books + scores
  const loadData = async () => {
    const [{ data: booksData }, { data: scoresData }] = await Promise.all([
      supabase.from("books").select("*").order("created_at"),
      supabase.from("scores").select("*"),
    ]);
    setBooks(booksData || []);
    setScores(scoresData || []);
    setLoading(false);
  };

  // Load data on mount — public, no session required
  useEffect(() => { loadData(); }, []);

  // Fetch thumbnails for books
  useEffect(() => {
    if (!books.length) return;
    books.forEach(async (book) => {
      if (thumbnails[book.id]) return;
      const thumb = await fetchCoverThumbnail(book.isbn, book.title, book.author);
      if (thumb) setThumbnails(prev => ({ ...prev, [book.id]: thumb }));
    });
  }, [books]);

  // Sign in
  const handleSignIn = async () => {
    setSigningIn(true);
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setAuthError(error.message); }
    else { setShowLoginModal(false); setEmail(""); setPassword(""); }
    setSigningIn(false);
  };

  const handleSignOut = () => supabase.auth.signOut();

  // Enrich books with computed scores
  const enrichedBooks = books.map(book => {
    const bookScores = scores.filter(s => s.book_id === book.id);
    const don  = bookScores.find(s => s.member_name === "Don")?.score  ?? null;
    const dave = bookScores.find(s => s.member_name === "Dave")?.score ?? null;
    const chan = bookScores.find(s => s.member_name === "Chan")?.score ?? null;
    const submitted = [don, dave, chan].filter(v => v !== null);
    const avg  = submitted.length === 3 ? submitted.reduce((a, b) => a + b, 0) / 3 : null;
    return {
      ...book,
      don:  pctToStars(don),
      dave: pctToStars(dave),
      chan:  pctToStars(chan),
      avg:  pctToStars(avg),
    };
  });

  const currentlyReading = enrichedBooks.filter(b => b.avg === null);
  const finishedBooks    = enrichedBooks.filter(b => b.avg !== null);

  const members = ["All", "Don", "Dave", "Chan"];
  const sorted  = [...finishedBooks]
    .filter(b => filter === "All" || b.picker === filter)
    .filter(b => b.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === "score" ? b.avg - a.avg : a.title.localeCompare(b.title));

  const topBook = [...finishedBooks].sort((a, b) => b.avg - a.avg)[0];
  const avgAll  = finishedBooks.length
    ? (finishedBooks.reduce((s, b) => s + b.avg, 0) / finishedBooks.length).toFixed(2)
    : "—";
  const pickerStats = ["Don", "Dave", "Chan"].map(name => {
    const picked = finishedBooks.filter(b => b.picker === name);
    const avg    = picked.length ? (picked.reduce((s, b) => s + b.avg, 0) / picked.length).toFixed(2) : "—";
    return { name, count: picked.length, avg };
  });

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f4ef", fontFamily: "Georgia, serif", fontSize: 20, color: "#888" }}>
      Loading The Book Wormz... 📚
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f7f4ef", fontFamily: "Georgia, serif", color: "#1a1a1a" }}>

      {/* Modals */}
      {showScoreModal && (
        <SubmitScoreModal
          books={enrichedBooks}
          memberName={member?.name}
          existingScores={scores}
          onClose={() => setShowScoreModal(false)}
          onSubmitted={loadData}
        />
      )}
      {showLoginModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "white", borderRadius: 20, padding: 40, width: 380, maxWidth: "90vw", boxShadow: "0 8px 40px rgba(0,0,0,0.2)", fontFamily: "Georgia, serif" }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📚</div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1a1a2e" }}>Member Sign In</h2>
              <p style={{ color: "#aaa", fontSize: 13, margin: "6px 0 0" }}>Don, Dave &amp; Chan only</p>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 5 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, fontFamily: "Georgia, serif", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 5 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSignIn()}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, fontFamily: "Georgia, serif", boxSizing: "border-box" }}
              />
            </div>
            {authError && <div style={{ color: "#e74c3c", fontSize: 13, marginBottom: 12 }}>{authError}</div>}
            <button onClick={handleSignIn} disabled={signingIn} style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: "#1a1a2e", color: "white", fontSize: 15, fontWeight: 700, fontFamily: "Georgia, serif", cursor: "pointer", marginBottom: 10 }}>
              {signingIn ? "Signing in..." : "Sign In"}
            </button>
            <button onClick={() => { setShowLoginModal(false); setAuthError(null); }} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "1px solid #ddd", background: "white", color: "#888", fontSize: 14, fontFamily: "Georgia, serif", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}
      {(showBookModal || editingBook) && (
        <BookModal
          book={editingBook}
          onClose={() => { setShowBookModal(false); setEditingBook(null); }}
          onSaved={loadData}
        />
      )}

      {/* Header */}
      <div style={{ background: "#1a1a2e", color: "white", padding: "40px 32px 32px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 20px)" }} />
        <div style={{ position: "relative", maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
              <span style={{ fontSize: 48 }}>📚</span>
              <div>
                <div style={{ fontSize: 11, letterSpacing: 4, color: "#aaa", textTransform: "uppercase", marginBottom: 4 }}>Est. 2023</div>
                <h1 style={{ margin: 0, fontSize: 42, fontWeight: 700, letterSpacing: -1 }}>The Book Wormz</h1>
              </div>
            </div>
            {/* Nav + actions */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button onClick={() => setPage("books")} style={{ padding: "10px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "Georgia, serif", background: page === "books" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.07)", color: "white" }}>📚 Books</button>
              <button onClick={() => setPage("insights")} style={{ padding: "10px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "Georgia, serif", background: page === "insights" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.07)", color: "white" }}>📊 Insights</button>
              {session && <button onClick={() => setPage("history")} style={{ padding: "10px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "Georgia, serif", background: page === "history" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.07)", color: "white" }}>📜 History</button>}
              {session ? (
                <>
                  <button onClick={() => setShowScoreModal(true)} style={{ padding: "10px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "Georgia, serif", background: "#f39c12", color: "white" }}>✏️ Submit Score</button>
                  {member?.is_admin && (
                    <button onClick={() => { setEditingBook(null); setShowBookModal(true); }} style={{ padding: "10px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "Georgia, serif", background: "#27ae60", color: "white" }}>➕ Add Book</button>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 4 }}>
                    <span style={{ fontSize: 12, color: "#aaa" }}>👋 {member?.name}</span>
                    <button onClick={handleSignOut} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#aaa", cursor: "pointer", fontSize: 12, fontFamily: "Georgia, serif" }}>Sign out</button>
                  </div>
                </>
              ) : (
                <button onClick={() => setShowLoginModal(true)} style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.3)", background: "transparent", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "Georgia, serif" }}>🔑 Member Sign In</button>
              )}
            </div>
          </div>
          <p style={{ margin: "8px 0 24px", color: "#aaa", fontSize: 15 }}>Don · Dave · Chan — {finishedBooks.length} books read and rated</p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 20px" }}>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{avgAll} <span style={{ fontSize: 18 }}>★</span></div>
              <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: 1 }}>Group Avg</div>
            </div>
            {pickerStats.map(p => (
              <div key={p.name} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 20px" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: MEMBER_COLORS[p.name].accent }}>{p.avg} <span style={{ fontSize: 18 }}>★</span></div>
                <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: 1 }}>{p.name} · {p.count} picks</div>
              </div>
            ))}
            {topBook && (
              <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 20px", flex: 1, minWidth: 180, display: "flex", alignItems: "center", gap: 12 }}>
                {thumbnails[topBook.id] && <img src={thumbnails[topBook.id]} alt={topBook.title} style={{ width: 36, height: 52, objectFit: "cover", borderRadius: 3, boxShadow: "0 2px 8px rgba(0,0,0,0.4)", flexShrink: 0 }} />}
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>🏆 {topBook.title}</div>
                  <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: 1 }}>Top rated · {topBook.avg} ★</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Insights page */}
      {page === "insights" && <InsightsPage books={enrichedBooks} />}

      {/* History page — members only */}
      {page === "history" && session && <HistoryPage books={enrichedBooks} memberName={member?.name} />}

      {/* Books page */}
      {page === "books" && <>

        {/* Currently Reading */}
        {currentlyReading.length > 0 && (
          <div style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #2d3561 100%)", borderBottom: "3px solid #f39c12" }}>
            <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 32px" }}>
              <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#f39c12", marginBottom: 16, fontWeight: 700 }}>📖 Currently Reading</div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                {currentlyReading.map(book => {
                  const color = MEMBER_COLORS[book.picker] || MEMBER_COLORS["Don"];
                  return (
                    <div key={book.id} style={{ display: "flex", gap: 16, alignItems: "center", background: "rgba(255,255,255,0.07)", borderRadius: 14, padding: "16px 20px", flex: 1, minWidth: 280, border: "1px solid rgba(243,156,18,0.3)" }}>
                      {thumbnails[book.id] ? (
                        <img src={thumbnails[book.id]} alt={book.title} style={{ width: 52, height: 72, objectFit: "cover", borderRadius: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.4)", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 52, height: 72, background: "rgba(255,255,255,0.1)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>📗</div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "white", lineHeight: 1.2, marginBottom: 4 }}>{book.title}</div>
                        {book.author && <div style={{ fontSize: 13, color: "#aaa", fontStyle: "italic", marginBottom: 8 }}>{book.author}</div>}
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: color.bg, color: color.text, fontWeight: 700 }}>📖 {book.picker}'s pick</span>
                          {book.date_picked && <span style={{ fontSize: 11, color: "#888" }}>Started {book.date_picked}</span>}
                          {book.goodreads_score && <span style={{ fontSize: 11, color: "#f39c12", fontWeight: 600 }}>★ {book.goodreads_score} on Goodreads</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <div style={{ fontSize: 28 }}>🐛</div>
                        <div style={{ fontSize: 10, color: "#888" }}>In progress</div>
                        {member?.is_admin && (
                          <button onClick={() => setEditingBook(book)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#aaa", cursor: "pointer", fontFamily: "Georgia, serif" }}>Edit</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 32px 0" }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input placeholder="Search books..." value={search} onChange={e => setSearch(e.target.value)}
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
              {[["score", "⭐ Score"], ["title", "🔤 Title"]].map(([val, label]) => (
                <button key={val} onClick={() => setSort(val)} style={{
                  padding: "9px 12px", borderRadius: 8, border: "1px solid #ddd", cursor: "pointer", fontSize: 12,
                  background: sort === val ? "#1a1a2e" : "white", color: sort === val ? "white" : "#555", fontFamily: "Georgia, serif"
                }}>{label}</button>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 13, color: "#888", marginTop: 10 }}>Showing {sorted.length} of {finishedBooks.length} books</div>
        </div>

        {/* Grid */}
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 32px 48px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 18 }}>
            {sorted.map(book => {
              const color    = MEMBER_COLORS[book.picker] || MEMBER_COLORS["Don"];
              const isHovered = hovered === book.id;
              const thumb    = thumbnails[book.id];
              return (
                <div key={book.id}
                  onMouseEnter={() => setHovered(book.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ background: "white", borderRadius: 14, overflow: "hidden", boxShadow: isHovered ? "0 8px 28px rgba(0,0,0,0.13)" : "0 2px 10px rgba(0,0,0,0.06)", border: "1px solid #ece9e3", transform: isHovered ? "translateY(-3px)" : "none", transition: "all 0.2s" }}>
                  <div style={{ height: 5, background: color.accent }} />
                  <div style={{ padding: "16px 18px 18px" }}>
                    <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
                      <div style={{ flexShrink: 0 }}>
                        {thumb ? <img src={thumb} alt={book.title} style={{ width: 68, height: 100, objectFit: "cover", borderRadius: 4, boxShadow: "0 3px 10px rgba(0,0,0,0.2)" }} onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} /> : null}
                        <div style={{ width: 68, height: 100, background: `linear-gradient(135deg, ${color.accent}33, ${color.accent}66)`, borderRadius: 4, display: thumb ? "none" : "flex", alignItems: "center", justifyContent: "center", fontSize: 28, boxShadow: "0 3px 10px rgba(0,0,0,0.1)", border: `1px solid ${color.accent}44` }}>📚</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ margin: "0 0 3px", fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{book.title}</h3>
                        {book.author && <div style={{ fontSize: 12, color: "#888", fontStyle: "italic", marginBottom: 3 }}>{book.author}</div>}
                        {book.year && <div style={{ fontSize: 11, color: "#bbb", marginBottom: 8 }}>Published {book.year}</div>}
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                          <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: color.bg, color: color.text, fontWeight: 700 }}>📖 {book.picker}'s pick</span>
                          <span style={{ fontSize: 11, color: "#aaa" }}>{book.date_picked}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <ScoreRow stars={book.avg} name="🐛 Book Wormz" />
                      {book.goodreads_score !== null && <ScoreRow stars={book.goodreads_score} name="📗 Goodreads" color="#4a7c59" />}
                    </div>
                    <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 12 }}>
                      <div style={{ fontSize: 10, color: "#bbb", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Individual Scores</div>
                      <ScoreRow stars={book.don}  name="Don"  color={MEMBER_COLORS.Don.accent} />
                      <ScoreRow stars={book.dave} name="Dave" color={MEMBER_COLORS.Dave.accent} />
                      <ScoreRow stars={book.chan}  name="Chan" color={MEMBER_COLORS.Chan.accent} />
                    </div>
                    {member?.is_admin && (
                      <button onClick={() => setEditingBook(book)} style={{ marginTop: 12, width: "100%", padding: "7px", borderRadius: 7, border: "1px solid #eee", background: "#fafafa", color: "#888", cursor: "pointer", fontSize: 12, fontFamily: "Georgia, serif" }}>✏️ Edit</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {sorted.length === 0 && <div style={{ textAlign: "center", padding: 60, color: "#aaa", fontSize: 18 }}>No books found 📚</div>}
        </div>
      </>}

      <div style={{ textAlign: "center", padding: "0 0 32px", color: "#bbb", fontSize: 12 }}>The Book Wormz · Built with Claude</div>
    </div>
  );
}
