// ============================================================
// NutritionLogger — Phase 4
// Barcode scanner (camera API) + USDA food database search
// Auto-macro calculation, meal type classification
// ============================================================

import React, {
  useState, useRef, useCallback, useEffect,
} from "react";
import { useDevice } from "../../hooks/useDevice";
import { useUndo } from "../ui/UndoToast";
import { analytics } from "../../lib/analytics";
import { supabase } from "../../lib/supabase";

// ── TYPES ─────────────────────────────────────────────────────
interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  servingSize: number;
  servingUnit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  barcode?: string;
  source: "usda" | "barcode" | "recent" | "manual";
}

interface FoodLogEntry {
  foodItem: FoodItem;
  servings: number;
  mealType: "breakfast" | "lunch" | "dinner" | "snack" | "supplement";
  loggedAt: string;
}

type NutritionView = "main" | "search" | "barcode" | "manual" | "confirm";

const MEAL_TYPES = [
  { id: "breakfast",  label: "Breakfast",  icon: "🌅", time: "6–10am"  },
  { id: "lunch",      label: "Lunch",      icon: "☀️", time: "11am–2pm"},
  { id: "dinner",     label: "Dinner",     icon: "🌙", time: "5–9pm"   },
  { id: "snack",      label: "Snack",      icon: "🍎", time: "Anytime" },
  { id: "supplement", label: "Supplement", icon: "💊", time: "Anytime" },
] as const;

// ── MAIN COMPONENT ────────────────────────────────────────────
export const NutritionLogger: React.FC<{
  userId: string;
  onLogged?: (entry: FoodLogEntry) => void;
}> = ({ userId, onLogged }) => {
  const { isMobile } = useDevice();
  const { pushUndo } = useUndo();
  const [view, setView] = useState<NutritionView>("main");
  const [mealType, setMealType] = useState<FoodLogEntry["mealType"]>("snack");
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [servings, setServings] = useState(1);
  const [dailyLog, setDailyLog] = useState<FoodLogEntry[]>([]);
  const [todayMacros, setTodayMacros] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });

  useEffect(() => { loadDailyLog(); }, [userId]);

  const loadDailyLog = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("piq_food_log")
      .select("*")
      .eq("user_id", userId)
      .gte("logged_at", today + "T00:00:00Z")
      .lte("logged_at", today + "T23:59:59Z");

    const entries: FoodLogEntry[] = (data ?? []).map((r: any) => ({
      foodItem: {
        id: r.id, name: r.food_name, servingSize: r.serving_size,
        servingUnit: r.serving_unit, calories: r.calories,
        proteinG: r.protein_g, carbsG: r.carbs_g, fatG: r.fat_g,
        source: r.source,
      },
      servings: 1,
      mealType: r.meal_type,
      loggedAt: r.logged_at,
    }));

    setDailyLog(entries);
    setTodayMacros(entries.reduce((acc, e) => ({
      calories: acc.calories + (e.foodItem.calories ?? 0),
      protein:  acc.protein  + (e.foodItem.proteinG ?? 0),
      carbs:    acc.carbs    + (e.foodItem.carbsG ?? 0),
      fat:      acc.fat      + (e.foodItem.fatG ?? 0),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 }));
  };

  const handleFoodSelected = (food: FoodItem) => {
    setSelectedFood(food);
    setView("confirm");
  };

  const handleLogConfirm = async () => {
    if (!selectedFood) return;

    const entry: FoodLogEntry = {
      foodItem: selectedFood,
      servings,
      mealType,
      loggedAt: new Date().toISOString(),
    };

    const logId = `food-${Date.now()}`;
    setView("main");
    setSelectedFood(null);
    setServings(1);

    pushUndo({
      id: logId,
      label: `${selectedFood.name} logged`,
      onUndo: async () => {
        await supabase.from("piq_food_log").delete().eq("id", logId);
        await loadDailyLog();
        analytics.track("nutrition_log_undone");
      },
      onCommit: async () => {
        await supabase.from("piq_food_log").insert({
          id: logId,
          user_id: userId,
          meal_type: mealType,
          food_name: selectedFood.name,
          serving_size: selectedFood.servingSize * servings,
          serving_unit: selectedFood.servingUnit,
          calories: (selectedFood.calories ?? 0) * servings,
          protein_g: (selectedFood.proteinG ?? 0) * servings,
          carbs_g: (selectedFood.carbsG ?? 0) * servings,
          fat_g: (selectedFood.fatG ?? 0) * servings,
          barcode: selectedFood.barcode,
          source: selectedFood.source,
        });
        await loadDailyLog();
        analytics.track("nutrition_logged", { source: selectedFood.source, meal_type: mealType });
      },
    });

    onLogged?.(entry);
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      {view === "main" && (
        <NutritionMain
          mealType={mealType}
          onMealTypeChange={setMealType}
          todayMacros={todayMacros}
          dailyLog={dailyLog}
          onSearch={() => setView("search")}
          onScan={() => setView("barcode")}
          onManual={() => setView("manual")}
          isMobile={isMobile}
        />
      )}
      {view === "search" && (
        <FoodSearch
          onSelect={handleFoodSelected}
          onBack={() => setView("main")}
          userId={userId}
        />
      )}
      {view === "barcode" && (
        <BarcodeScanner
          onFound={handleFoodSelected}
          onBack={() => setView("main")}
        />
      )}
      {view === "manual" && (
        <ManualEntry
          onSave={handleFoodSelected}
          onBack={() => setView("main")}
        />
      )}
      {view === "confirm" && selectedFood && (
        <LogConfirm
          food={selectedFood}
          servings={servings}
          mealType={mealType}
          onServingsChange={setServings}
          onMealTypeChange={setMealType}
          onConfirm={handleLogConfirm}
          onBack={() => setView("search")}
        />
      )}
    </div>
  );
};

// ── MAIN NUTRITION VIEW ───────────────────────────────────────
const NutritionMain: React.FC<{
  mealType: string; onMealTypeChange: (m: any) => void;
  todayMacros: { calories: number; protein: number; carbs: number; fat: number };
  dailyLog: FoodLogEntry[];
  onSearch: () => void; onScan: () => void; onManual: () => void;
  isMobile: boolean;
}> = ({ mealType, onMealTypeChange, todayMacros, dailyLog, onSearch, onScan, onManual, isMobile }) => (
  <div className="piq-page">
    {/* Daily macro summary */}
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 }}>
        Today's Nutrition
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {[
          { label: "Calories", value: Math.round(todayMacros.calories), unit: "kcal", color: "#C0392B" },
          { label: "Protein",  value: Math.round(todayMacros.protein),  unit: "g",    color: "#1A5276" },
          { label: "Carbs",    value: Math.round(todayMacros.carbs),    unit: "g",    color: "#E67E22" },
          { label: "Fat",      value: Math.round(todayMacros.fat),      unit: "g",    color: "#8E44AD" },
        ].map(m => (
          <div key={m.label} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 900, color: m.color, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              {m.value}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{m.unit}</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{m.label}</div>
          </div>
        ))}
      </div>
    </div>

    {/* Meal type selector */}
    <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 16 }}>
      {MEAL_TYPES.map(mt => (
        <button
          key={mt.id}
          onClick={() => onMealTypeChange(mt.id)}
          style={{
            padding: "8px 14px", borderRadius: 20, border: `1.5px solid ${mealType === mt.id ? "var(--theme-primary)" : "var(--border-default)"}`,
            background: mealType === mt.id ? "var(--theme-primary)" : "var(--bg-card)",
            color: mealType === mt.id ? "#fff" : "var(--text-muted)",
            fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600,
            cursor: "pointer", whiteSpace: "nowrap", minHeight: 36, minWidth: "auto",
            display: "flex", alignItems: "center", gap: 4,
          }}
        >
          {mt.icon} {mt.label}
        </button>
      ))}
    </div>

    {/* Log entry buttons */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
      <button
        onClick={onSearch}
        style={{ padding: "14px", borderRadius: 10, border: "1px solid var(--border-default)", background: "var(--bg-card)", cursor: "pointer", textAlign: "left", minHeight: 44 }}
      >
        <div style={{ fontSize: 22, marginBottom: 6 }}>🔍</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Search Foods</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>800k+ items</div>
      </button>
      {isMobile && (
        <button
          onClick={onScan}
          style={{ padding: "14px", borderRadius: 10, border: "1px solid var(--border-default)", background: "var(--bg-card)", cursor: "pointer", textAlign: "left", minHeight: 44 }}
        >
          <div style={{ fontSize: 22, marginBottom: 6 }}>📷</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Scan Barcode</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>~2 seconds</div>
        </button>
      )}
    </div>
  </div>
);

// ── FOOD SEARCH (USDA) ────────────────────────────────────────
const FoodSearch: React.FC<{
  onSelect: (f: FoodItem) => void;
  onBack: () => void;
  userId: string;
}> = ({ onSelect, onBack, userId }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(q)}&pageSize=20&api_key=${import.meta.env.VITE_USDA_API_KEY ?? "DEMO_KEY"}`
      );
      const data = await res.json();
      const items: FoodItem[] = (data.foods ?? []).map((f: any) => {
        const nutrients = f.foodNutrients ?? [];
        const get = (name: string) => nutrients.find((n: any) => n.nutrientName?.toLowerCase().includes(name))?.value ?? 0;
        return {
          id: String(f.fdcId),
          name: f.description,
          brand: f.brandOwner,
          servingSize: f.servingSize ?? 100,
          servingUnit: f.servingSizeUnit ?? "g",
          calories: Math.round(get("energy")),
          proteinG: Math.round(get("protein") * 10) / 10,
          carbsG: Math.round(get("carbohydrate") * 10) / 10,
          fatG: Math.round(get("total lipid") * 10) / 10,
          source: "usda",
        };
      });
      setResults(items);
    } catch (err) {
      console.error("USDA search failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 400);
    return () => clearTimeout(t);
  }, [query, search]);

  return (
    <div className="piq-page">
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--text-muted)", minHeight: 44, minWidth: 44 }}>←</button>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search 800,000+ foods..."
          style={{ flex: 1, height: 44, border: "1px solid var(--border-default)", borderRadius: 8, padding: "0 14px", fontFamily: "var(--font-body)", fontSize: 15, outline: "none" }}
          onFocus={e => (e.target.style.borderColor = "var(--theme-primary)")}
          onBlur={e => (e.target.style.borderColor = "var(--border-default)")}
        />
      </div>

      {loading && <div style={{ textAlign: "center", padding: 20, color: "var(--text-muted)", fontSize: 13 }}>Searching...</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {results.map(food => (
          <button
            key={food.id}
            onClick={() => { onSelect(food); analytics.track("nutrition_food_selected", { source: "search" }); }}
            style={{ padding: "12px 14px", borderRadius: 8, border: "none", background: "var(--bg-card)", cursor: "pointer", textAlign: "left", minHeight: 44, transition: "background 150ms" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-raised)")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--bg-card)")}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3 }}>{food.name}</div>
            {food.brand && <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{food.brand}</div>}
            <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--text-muted)" }}>
              <span>🔥 {food.calories} kcal</span>
              <span>P: {food.proteinG}g</span>
              <span>C: {food.carbsG}g</span>
              <span>F: {food.fatG}g</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// ── BARCODE SCANNER ───────────────────────────────────────────
const BarcodeScanner: React.FC<{
  onFound: (f: FoodItem) => void;
  onBack: () => void;
}> = ({ onFound, onBack }) => {
  const [status, setStatus] = useState<"scanning" | "processing" | "not_found" | "error">("scanning");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    startCamera();
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setStatus("error");
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current) return;
    setStatus("processing");

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);

    // Use BarcodeDetector API (Chrome 83+) or ZXing fallback
    if ("BarcodeDetector" in window) {
      try {
        const detector = new (window as any).BarcodeDetector({ formats: ["upc_a", "upc_e", "ean_13", "ean_8"] });
        const barcodes = await detector.detect(canvas);

        if (barcodes.length > 0) {
          const upc = barcodes[0].rawValue;
          analytics.track("nutrition_barcode_scan", { success: true, food_found: false });
          await lookupBarcode(upc, onFound, () => setStatus("not_found"));
        } else {
          setStatus("not_found");
          analytics.track("nutrition_barcode_scan", { success: false, food_found: false });
        }
      } catch {
        setStatus("not_found");
      }
    } else {
      // Fallback: manual UPC entry
      setStatus("not_found");
    }
  };

  return (
    <div style={{ position: "relative", background: "#000", height: "100dvh" }}>
      <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />

      {/* Overlay */}
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {/* Scan frame */}
        <div style={{ width: 260, height: 120, border: "2px solid #fff", borderRadius: 8, position: "relative", boxShadow: "0 0 0 9999px rgba(0,0,0,.5)" }}>
          <div style={{ position: "absolute", top: -1, left: -1, width: 20, height: 20, borderTop: "3px solid #22C55E", borderLeft: "3px solid #22C55E", borderRadius: "6px 0 0 0" }} />
          <div style={{ position: "absolute", top: -1, right: -1, width: 20, height: 20, borderTop: "3px solid #22C55E", borderRight: "3px solid #22C55E", borderRadius: "0 6px 0 0" }} />
          <div style={{ position: "absolute", bottom: -1, left: -1, width: 20, height: 20, borderBottom: "3px solid #22C55E", borderLeft: "3px solid #22C55E", borderRadius: "0 0 0 6px" }} />
          <div style={{ position: "absolute", bottom: -1, right: -1, width: 20, height: 20, borderBottom: "3px solid #22C55E", borderRight: "3px solid #22C55E", borderRadius: "0 0 6px 0" }} />
          {status === "scanning" && (
            <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 2, background: "#22C55E", animation: "scan-line 1.5s ease-in-out infinite" }} />
          )}
        </div>

        <p style={{ color: "#fff", fontSize: 13, marginTop: 16, textAlign: "center" }}>
          {status === "scanning" && "Align barcode within the frame"}
          {status === "processing" && "Processing..."}
          {status === "not_found" && "Barcode not found — try again or search manually"}
          {status === "error" && "Camera not available"}
        </p>
      </div>

      {/* Controls */}
      <div style={{ position: "absolute", bottom: "calc(20px + env(safe-area-inset-bottom))", left: 0, right: 0, display: "flex", justifyContent: "center", gap: 16 }}>
        <button onClick={onBack} style={{ background: "rgba(0,0,0,.6)", color: "#fff", border: "1px solid rgba(255,255,255,.3)", borderRadius: 22, padding: "10px 20px", cursor: "pointer", fontSize: 14, minHeight: 44 }}>
          Cancel
        </button>
        <button
          onClick={handleCapture}
          disabled={status === "processing"}
          style={{ background: "#22C55E", color: "#fff", border: "none", borderRadius: 22, padding: "10px 24px", cursor: "pointer", fontSize: 14, fontWeight: 700, minHeight: 44 }}
        >
          {status === "processing" ? "..." : "Scan"}
        </button>
      </div>

      <style>{`
        @keyframes scan-line {
          0%,100% { top: 10%; }
          50%      { top: 80%; }
        }
      `}</style>
    </div>
  );
};

async function lookupBarcode(
  upc: string,
  onFound: (f: FoodItem) => void,
  onNotFound: () => void
): Promise<void> {
  try {
    const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=${upc}&api_key=${import.meta.env.VITE_USDA_API_KEY ?? "DEMO_KEY"}`);
    const data = await res.json();
    const food = data.foods?.[0];
    if (!food) { onNotFound(); return; }

    const nutrients = food.foodNutrients ?? [];
    const get = (name: string) => nutrients.find((n: any) => n.nutrientName?.toLowerCase().includes(name))?.value ?? 0;

    onFound({
      id: String(food.fdcId),
      name: food.description,
      brand: food.brandOwner,
      servingSize: food.servingSize ?? 100,
      servingUnit: food.servingSizeUnit ?? "g",
      calories: Math.round(get("energy")),
      proteinG: Math.round(get("protein") * 10) / 10,
      carbsG: Math.round(get("carbohydrate") * 10) / 10,
      fatG: Math.round(get("total lipid") * 10) / 10,
      barcode: upc,
      source: "barcode",
    });
    analytics.track("nutrition_barcode_scan", { success: true, food_found: true });
  } catch {
    onNotFound();
  }
}

// ── LOG CONFIRM VIEW ──────────────────────────────────────────
const LogConfirm: React.FC<{
  food: FoodItem; servings: number; mealType: string;
  onServingsChange: (n: number) => void;
  onMealTypeChange: (m: any) => void;
  onConfirm: () => void; onBack: () => void;
}> = ({ food, servings, mealType, onServingsChange, onMealTypeChange, onConfirm, onBack }) => (
  <div className="piq-page">
    <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--text-muted)", minHeight: 44, marginBottom: 16 }}>←</button>

    <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{food.name}</div>
    {food.brand && <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>{food.brand}</div>}

    {/* Macros preview */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
      {[
        { l: "Calories", v: Math.round(food.calories * servings), u: "kcal", c: "#C0392B" },
        { l: "Protein",  v: Math.round(food.proteinG * servings * 10) / 10, u: "g", c: "#1A5276" },
        { l: "Carbs",    v: Math.round(food.carbsG * servings * 10) / 10,   u: "g", c: "#E67E22" },
        { l: "Fat",      v: Math.round(food.fatG * servings * 10) / 10,     u: "g", c: "#8E44AD" },
      ].map(m => (
        <div key={m.l} style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)", borderRadius: 8, padding: "10px", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: m.c, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{m.v}</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{m.l}<br />{m.u}</div>
        </div>
      ))}
    </div>

    {/* Servings */}
    <div style={{ marginBottom: 20 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 8 }}>
        Servings ({food.servingSize}{food.servingUnit} each)
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => onServingsChange(Math.max(0.5, servings - 0.5))} style={{ width: 44, height: 44, borderRadius: "50%", border: "1px solid var(--border-default)", background: "var(--bg-card)", fontSize: 20, cursor: "pointer" }}>−</button>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "var(--text-primary)", minWidth: 40, textAlign: "center" }}>{servings}</div>
        <button onClick={() => onServingsChange(servings + 0.5)} style={{ width: 44, height: 44, borderRadius: "50%", border: "1px solid var(--border-default)", background: "var(--bg-card)", fontSize: 20, cursor: "pointer" }}>+</button>
      </div>
    </div>

    <button
      onClick={onConfirm}
      style={{ width: "100%", height: 48, borderRadius: 10, border: "none", background: "var(--theme-primary)", color: "#fff", fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 700, cursor: "pointer" }}
    >
      Log {food.name}
    </button>
  </div>
);

// ── MANUAL ENTRY ──────────────────────────────────────────────
const ManualEntry: React.FC<{ onSave: (f: FoodItem) => void; onBack: () => void }> = ({ onSave, onBack }) => {
  const [form, setForm] = useState({ name: "", calories: "", protein: "", carbs: "", fat: "", servingSize: "100", servingUnit: "g" });
  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.name && form.calories;

  return (
    <div className="piq-page">
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--text-muted)", minHeight: 44, marginBottom: 16 }}>←</button>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Enter manually</div>

      {[
        { key: "name",        label: "Food name",  placeholder: "e.g. Chicken breast", type: "text" },
        { key: "calories",    label: "Calories",   placeholder: "kcal", type: "number" },
        { key: "protein",     label: "Protein (g)",placeholder: "g",    type: "number" },
        { key: "carbs",       label: "Carbs (g)",  placeholder: "g",    type: "number" },
        { key: "fat",         label: "Fat (g)",    placeholder: "g",    type: "number" },
      ].map(f => (
        <div key={f.key} style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 5 }}>{f.label}</label>
          <input
            type={f.type}
            value={(form as any)[f.key]}
            onChange={e => update(f.key, e.target.value)}
            placeholder={f.placeholder}
            style={{ width: "100%", height: 44, border: "1px solid var(--border-default)", borderRadius: 8, padding: "0 14px", fontFamily: "var(--font-body)", fontSize: 15, outline: "none" }}
            onFocus={e => (e.target.style.borderColor = "var(--theme-primary)")}
            onBlur={e => (e.target.style.borderColor = "var(--border-default)")}
          />
        </div>
      ))}

      <button
        disabled={!valid}
        onClick={() => onSave({ id: `manual-${Date.now()}`, name: form.name, servingSize: Number(form.servingSize), servingUnit: form.servingUnit, calories: Number(form.calories), proteinG: Number(form.protein), carbsG: Number(form.carbs), fatG: Number(form.fat), source: "manual" })}
        style={{ width: "100%", height: 48, borderRadius: 10, border: "none", background: valid ? "var(--theme-primary)" : "var(--border-default)", color: "#fff", fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 700, cursor: valid ? "pointer" : "not-allowed", marginTop: 8 }}
      >
        Add Food
      </button>
    </div>
  );
};
