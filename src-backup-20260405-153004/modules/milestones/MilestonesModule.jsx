// src/modules/milestones/MilestonesModule.jsx
// Held Milestones & Development module.
// Dashboard view by default. Domain filters. Tier-gated NS context.

import { useState, useEffect, useMemo } from "react";
import { useT, useApp, font, serif } from "../../core/shared.jsx";
import { supabase } from "../../lib/supabase.js";
import {
  MILESTONES,
  DOMAINS,
  AGE_GROUPS,
  getMilestonesForAge,
  getBrainContext,
} from "./data/milestones.js";
import { MilestoneCard } from "./components/MilestoneCard.jsx";
import { WonderWeeksCard } from "./components/WonderWeeksCard.jsx";
import { NervousSystemStory } from "./components/NervousSystemStory.jsx";

// ─── AGE HELPER ───────────────────────────────────────────────────────────────
function getAgeInMonths(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months--;
  if (months < 0) { years--; months += 12; }
  return years * 12 + months;
}

function ageLabel(months) {
  if (months === null) return null;
  if (months < 24) return `${months} months`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m > 0 ? `${y}y ${m}mo` : `${y} years`;
}

// ─── UPGRADE MODAL ────────────────────────────────────────────────────────────
function UpgradeModal({ onClose, T, currentUser }) {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.55)", zIndex: 300,
      display: "flex", alignItems: "flex-end",
    }}>
      <div style={{
        background: T.bg2, borderRadius: "20px 20px 0 0",
        width: "100%", padding: "28px 24px 48px",
      }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🌿</div>
          <div style={{ fontFamily: serif, fontSize: 22, color: T.headingText, marginBottom: 8 }}>
            Held Plus
          </div>
          <p style={{
            fontFamily: font, fontSize: 14, color: T.muted,
            lineHeight: 1.7, maxWidth: 300, margin: "0 auto",
          }}>
            Unlock the full nervous system context behind every milestone —
            plus personalized insights for your child's age.
          </p>
        </div>

        {[
          { icon: "🌿", label: "Nervous system context for every milestone" },
          { icon: "🌀", label: "Full Wonder Weeks leap details + NS framing" },
          { icon: "🌱", label: "Your child's nervous system story" },
          { icon: "🧠", label: "Brain development context cards" },
          { icon: "✦",  label: "Held proactively surfaces age-specific insights" },
        ].map(f => (
          <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 18, width: 28, textAlign: "center", flexShrink: 0 }}>{f.icon}</span>
            <span style={{ fontFamily: font, fontSize: 13.5, color: T.text }}>{f.label}</span>
          </div>
        ))}

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <div style={{ fontFamily: serif, fontSize: 22, color: T.teal, marginBottom: 4 }}>$10/month</div>
          <div style={{ fontFamily: font, fontSize: 12, color: T.muted, marginBottom: 20 }}>Cancel anytime</div>
          <button onClick={onClose} style={{
            display: "block", width: "100%", padding: "14px",
            borderRadius: 12, border: "none",
            background: T.teal, color: "#fff",
            fontFamily: font, fontSize: 15, fontWeight: 700, cursor: "pointer",
            marginBottom: 12,
          }}>
            Upgrade to Plus →
          </button>
          <button onClick={onClose} style={{
            background: "none", border: "none",
            fontFamily: font, fontSize: 13, color: T.muted, cursor: "pointer",
          }}>
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BRAIN CONTEXT CARD ───────────────────────────────────────────────────────
function BrainContextCard({ ageMonths, isPremium, showUpgrade, T }) {
  const ageYears = ageMonths !== null ? ageMonths / 12 : 0;
  const ctx = getBrainContext(ageYears);
  if (!ctx) return null;

  if (!isPremium) {
    return (
      <button onClick={showUpgrade} style={{
        width: "100%", padding: "14px 16px", borderRadius: 14,
        border: `1px dashed ${T.purple}40`,
        background: `${T.purple}06`,
        display: "flex", alignItems: "center", gap: 10,
        cursor: "pointer", marginBottom: 14, textAlign: "left",
      }}>
        <span style={{ fontSize: 20 }}>🧠</span>
        <div>
          <div style={{ fontFamily: font, fontSize: 13, color: T.purple, fontWeight: 600 }}>
            Brain development context
          </div>
          <div style={{ fontFamily: font, fontSize: 12, color: T.muted }}>
            What's happening in {ageLabel(ageMonths)}'s brain right now — Held Plus →
          </div>
        </div>
      </button>
    );
  }

  return (
    <div style={{
      borderRadius: 14,
      border: `1px solid ${T.purple}30`,
      background: `${T.purple}08`,
      padding: "14px 16px",
      marginBottom: 14,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 18 }}>🧠</span>
        <span style={{
          fontFamily: font, fontSize: 10, fontWeight: 700,
          letterSpacing: ".12em", textTransform: "uppercase", color: T.purple,
        }}>
          Brain development
        </span>
      </div>
      <div style={{ fontFamily: serif, fontSize: 15, color: T.headingText, marginBottom: 6 }}>
        {ctx.title}
      </div>
      <p style={{ fontFamily: font, fontSize: 13, color: T.text, lineHeight: 1.7, margin: "0 0 8px" }}>
        {ctx.body}
      </p>
      <div style={{ fontFamily: font, fontSize: 11, color: T.subText }}>
        {ctx.source}
      </div>
    </div>
  );
}

// ─── MAIN MODULE ─────────────────────────────────────────────────────────────
export function MilestonesModule() {
  const T = useT();
  const { activeChild, activeFamily, currentUser, isPremium } = useApp();

  const [view, setView] = useState("dashboard"); // "dashboard" | "explore"
  const [activeDomain, setActiveDomain] = useState("all");
  const [logs, setLogs] = useState({});
  const [logsLoading, setLogsLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [child, setChild] = useState(activeChild);

  const ageMonths = getAgeInMonths(child?.dob);

  // ── Load milestone logs ──
  useEffect(() => {
    if (!child?.id) { setLogsLoading(false); return; }
    supabase
      .from("milestone_logs")
      .select("*")
      .eq("child_id", child.id)
      .then(({ data }) => {
        const map = {};
        (data || []).forEach(l => { map[l.milestone_id] = l; });
        setLogs(map);
        setLogsLoading(false);
      });
  }, [child?.id]);

  // ── Log a milestone status ──
  async function handleLog(milestoneId, status) {
    if (!child?.id || !activeFamily?.id || !currentUser?.id) return;

    if (status === null) {
      // Remove log
      await supabase.from("milestone_logs").delete()
        .eq("child_id", child.id).eq("milestone_id", milestoneId);
      setLogs(prev => { const n = { ...prev }; delete n[milestoneId]; return n; });
      return;
    }

    const entry = {
      child_id: child.id,
      family_id: activeFamily.id,
      logged_by: currentUser.id,
      milestone_id: milestoneId,
      status,
      logged_at: new Date().toISOString(),
      reached_at: status === "reached" ? new Date().toISOString() : null,
    };

    const { data } = await supabase
      .from("milestone_logs")
      .upsert(entry, { onConflict: "child_id,milestone_id" })
      .select()
      .maybeSingle();

    if (data) {
      setLogs(prev => ({ ...prev, [milestoneId]: data }));

      // Warm acknowledgment from Held when reached
      if (status === "reached") {
        // Surfaced inline in the card — no modal needed
      }
    }
  }

  // ── Milestones for current age ──
  const ageMilestones = useMemo(() => {
    if (ageMonths === null) return MILESTONES;
    return getMilestonesForAge(ageMonths);
  }, [ageMonths]);

  const filteredMilestones = useMemo(() => {
    if (activeDomain === "all") return ageMilestones;
    return ageMilestones.filter(m => m.domain === activeDomain);
  }, [ageMilestones, activeDomain]);

  // ── Stats for dashboard ──
  const reachedCount = ageMilestones.filter(m => logs[m.id]?.status === "reached").length;
  const totalCount = ageMilestones.length;

  if (!child) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center", color: T.muted, fontFamily: font }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>🌱</div>
        <p style={{ fontSize: 14 }}>Select a child to view their milestones.</p>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      {showUpgradeModal && (
        <UpgradeModal onClose={() => setShowUpgradeModal(false)} T={T} currentUser={currentUser} />
      )}

      {/* ── Header ── */}
      <div style={{ marginBottom: 18 }}>
        <div style={{
          fontSize: 9.5, letterSpacing: ".15em", textTransform: "uppercase",
          color: T.subText, fontFamily: font, marginBottom: 4,
        }}>
          Rooted Connections Collective
        </div>
        <h1 style={{ fontFamily: serif, fontSize: 26, color: T.headingText, marginBottom: 4 }}>
          Milestones
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{child.gender === "girl" ? "👧" : child.gender === "boy" ? "👦" : "🧒"}</span>
          <span style={{ fontFamily: font, fontSize: 14, color: T.muted }}>
            {child.name} · {ageLabel(ageMonths) || "age unknown"}
          </span>
        </div>
      </div>

      {/* ── View toggle ── */}
      <div style={{
        display: "flex", gap: 4, background: T.faint,
        borderRadius: 12, padding: 4, marginBottom: 16,
      }}>
        {[
          { id: "dashboard", label: "Overview" },
          { id: "explore",   label: "Explore all" },
        ].map(v => (
          <button key={v.id} onClick={() => setView(v.id)} style={{
            flex: 1, padding: "8px",
            borderRadius: 9, border: "none",
            background: view === v.id ? T.bg2 : "none",
            color: view === v.id ? T.teal : T.muted,
            fontFamily: font, fontSize: 13,
            fontWeight: view === v.id ? 700 : 400,
            cursor: "pointer", transition: "all .15s",
            boxShadow: view === v.id ? T.shadow : "none",
          }}>
            {v.label}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD VIEW ── */}
      {view === "dashboard" && (
        <div>
          {/* Progress summary */}
          <div style={{
            borderRadius: 14,
            border: `1px solid ${T.border}`,
            background: T.card,
            padding: "16px 18px",
            marginBottom: 14,
          }}>
            <div style={{
              fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase",
              color: T.subText, fontFamily: font, marginBottom: 10,
            }}>
              ✦ At a glance
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { label: "Reached", value: reachedCount, icon: "✅", color: T.sage },
                { label: "Tracking", value: totalCount, icon: "🌱", color: T.teal },
                { label: "Age",
                  value: ageMonths !== null ? (ageMonths < 24 ? `${ageMonths}mo` : `${Math.floor(ageMonths/12)}y`) : "—",
                  icon: "🧒", color: T.warm },
              ].map(s => (
                <div key={s.label} style={{
                  textAlign: "center", padding: "10px 6px",
                  borderRadius: 10, background: T.faint,
                }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
                  <div style={{
                    fontFamily: font, fontSize: 17, fontWeight: 700,
                    color: s.color,
                  }}>
                    {s.value}
                  </div>
                  <div style={{
                    fontFamily: font, fontSize: 10.5,
                    color: T.muted, textTransform: "uppercase", letterSpacing: ".06em",
                  }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Wonder Weeks card */}
          <WonderWeeksCard
            child={child}
            isPremium={isPremium}
            showUpgrade={() => setShowUpgradeModal(true)}
          />

          {/* Brain context card */}
          <BrainContextCard
            ageMonths={ageMonths}
            isPremium={isPremium}
            showUpgrade={() => setShowUpgradeModal(true)}
            T={T}
          />

          {/* NS Story */}
          <NervousSystemStory
            child={child}
            familyId={activeFamily?.id}
            onUpdate={setChild}
          />

          {/* Coming up — next 3 unlogged milestones */}
          <div style={{
            borderRadius: 14, border: `1px solid ${T.border}`,
            background: T.card, padding: "16px 18px", marginBottom: 14,
          }}>
            <div style={{
              fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase",
              color: T.subText, fontFamily: font, marginBottom: 12,
            }}>
              🌱 Coming up for {child.name}
            </div>
            {ageMilestones
              .filter(m => !logs[m.id])
              .slice(0, 3)
              .map(m => (
                <div key={m.id} style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  marginBottom: 10, paddingBottom: 10,
                  borderBottom: `1px solid ${T.border}`,
                }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>
                    {DOMAINS[m.domain]?.emoji}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: font, fontSize: 13.5, color: T.text, fontWeight: 500 }}>
                      {m.title}
                    </div>
                    <div style={{ fontFamily: font, fontSize: 11.5, color: T.muted }}>
                      {m.typical_range[0]}–{m.typical_range[1]} months · {DOMAINS[m.domain]?.label}
                    </div>
                  </div>
                </div>
              ))}
            <button onClick={() => setView("explore")} style={{
              background: "none", border: "none",
              fontFamily: font, fontSize: 13, color: T.teal,
              cursor: "pointer", padding: 0, fontWeight: 600,
            }}>
              View all milestones →
            </button>
          </div>

          {/* Source note */}
          <div style={{
            padding: "12px 14px", borderRadius: 10,
            background: T.faint, border: `1px solid ${T.border}`,
          }}>
            <div style={{
              fontFamily: font, fontSize: 10, fontWeight: 700,
              letterSpacing: ".1em", textTransform: "uppercase",
              color: T.muted, marginBottom: 6,
            }}>
              📚 Sources
            </div>
            <p style={{ fontFamily: font, fontSize: 12, color: T.muted, lineHeight: 1.65, margin: 0 }}>
              Milestone data draws from CDC "Learn the Signs. Act Early." (2022 update), WHO Motor Development Study,
              AAP developmental guidelines, ASHA communication milestones, Zero to Three, and The Wonder Weeks
              (Plooij & van de Rijt). Ranges reflect typical variation — not pass/fail thresholds.
              Always consult your pediatrician with developmental concerns.
            </p>
          </div>
        </div>
      )}

      {/* ── EXPLORE VIEW ── */}
      {view === "explore" && (
        <div>
          {/* Domain filter chips */}
          <div style={{
            display: "flex", gap: 6, overflowX: "auto",
            paddingBottom: 4, marginBottom: 14,
            scrollbarWidth: "none",
          }}>
            {[{ id: "all", label: "All", emoji: "✦" }, ...Object.values(DOMAINS)].map(d => (
              <button key={d.id} onClick={() => setActiveDomain(d.id)} style={{
                flexShrink: 0,
                padding: "7px 14px", borderRadius: 20,
                border: `1.5px solid ${activeDomain === d.id ? T.teal : T.border}`,
                background: activeDomain === d.id ? `${T.teal}18` : T.faint,
                color: activeDomain === d.id ? T.teal : T.muted,
                fontFamily: font, fontSize: 12.5,
                fontWeight: activeDomain === d.id ? 700 : 400,
                cursor: "pointer", whiteSpace: "nowrap",
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <span>{d.emoji}</span>
                {d.label}
              </button>
            ))}
          </div>

          {/* Age context note */}
          {ageMonths !== null && (
            <div style={{
              padding: "8px 12px", borderRadius: 9,
              background: `${T.teal}0a`, border: `1px solid ${T.teal}20`,
              marginBottom: 12,
              fontFamily: font, fontSize: 12.5, color: T.muted,
            }}>
              Showing milestones typical for ages {Math.max(0, ageMonths - 3)}–{ageMonths + 3} months.
              {" "}
              <button onClick={() => setView("explore")} style={{
                background: "none", border: "none",
                fontFamily: font, fontSize: 12.5, color: T.teal,
                cursor: "pointer", padding: 0,
              }}>
                Browse all ages
              </button>
            </div>
          )}

          {/* Milestone list */}
          {logsLoading ? (
            <div style={{ fontFamily: font, fontSize: 13, color: T.muted, padding: "20px 0", textAlign: "center" }}>
              Loading…
            </div>
          ) : filteredMilestones.length === 0 ? (
            <div style={{ fontFamily: font, fontSize: 13, color: T.muted, padding: "20px 0", textAlign: "center" }}>
              No milestones found for this filter.
            </div>
          ) : (
            filteredMilestones.map(m => (
              <MilestoneCard
                key={m.id}
                milestone={m}
                log={logs[m.id] || null}
                onLog={handleLog}
                isPremium={isPremium}
                showUpgrade={() => setShowUpgradeModal(true)}
              />
            ))
          )}

          {/* Source note */}
          <div style={{
            padding: "12px 14px", borderRadius: 10,
            background: T.faint, border: `1px solid ${T.border}`,
            marginTop: 8,
          }}>
            <div style={{
              fontFamily: font, fontSize: 10, fontWeight: 700,
              letterSpacing: ".1em", textTransform: "uppercase",
              color: T.muted, marginBottom: 6,
            }}>
              📚 Sources
            </div>
            <p style={{ fontFamily: font, fontSize: 12, color: T.muted, lineHeight: 1.65, margin: 0 }}>
              CDC "Learn the Signs. Act Early." (2022 update) · WHO Motor Development Study ·
              AAP developmental guidelines · ASHA communication milestones ·
              Zero to Three · The Wonder Weeks (Plooij & van de Rijt).
              Typical ranges reflect the 10th–90th percentile window where available.
              These milestones are not diagnostic tools. Always consult your pediatrician with concerns.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
