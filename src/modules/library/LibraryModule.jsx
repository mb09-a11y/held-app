import { useState } from "react";
import { supabase } from "../../lib/supabase.js";
import { useT, useApp, font, serif } from "../../core/shared.jsx";
import { RegulationModule } from "../regulation/RegulationModule.jsx";

const C = {
  teal:"#7B9EA8", mauve:"#A8907B", purple:"#8A7BAA", sage:"#7BAA8A",
  warm:"#AA9B7B", rose:"#A87B8A", sky:"#7B8FAA", amber:"#A89B5A",
};

const BASE = "https://fzokhiqiulflvgkbzqel.supabase.co/storage/v1/object/public/Library/";

const TABS = [
  { id: "postpartum", label: "Postpartum",  emoji: "🌸" },
  { id: "newborn",    label: "Newborn",     emoji: "🍼" },
  { id: "sleep",      label: "Sleep",       emoji: "🌙" },
  { id: "toddler",    label: "Toddler+",    emoji: "🌱" },
  { id: "parenting",  label: "Parenting",   emoji: "💛" },
  { id: "scripts",    label: "Scripts",     emoji: "💬" },
  { id: "grounding",  label: "Grounding",   emoji: "🌿" },
];

const CONTENT = {
  postpartum: {
    intro: "You just did something extraordinary. These resources are here to hold you during the fourth trimester and beyond.",
    sections: [{
      items: [
        { title: "Mom's Guide to Postpartum", desc: "A gentle, honest guide to navigating the postpartum season — your body, your emotions, and your new normal.", type: "pdf", url: BASE + "Mom's%20Guide%20to%20Postpartum%20(1).pdf", color: C.rose, emoji: "🌸", tier: "free" },
        { title: "Resources to Thrive After Delivery", desc: "Curated support, tools, and community resources to help you not just survive but genuinely thrive postpartum.", type: "pdf", url: BASE + "Resources%20to%20Thrive%20After%20Delivery%20(2).pdf", color: C.mauve, emoji: "💐", tier: "free" },
      ],
    }],
  },
  newborn: {
    intro: "The newborn phase is short, sacred, and often overwhelming. These resources help you understand your baby and feel more grounded.",
    sections: [{
      items: [
        { title: "Comprehensive Newborn Guide", desc: "Everything from newborn sleep cycles to feeding, behavior cues, safe sleep, and nurturing the fourth trimester. The complete reference.", type: "pdf", url: BASE + "Comprehensive%20Newborn%20Guide%20(3).pdf", color: C.teal, emoji: "🌿", tier: "plus" },
        { title: "AAP Safe Sleep Guidelines", desc: "The American Academy of Pediatrics guidelines for safe infant sleep — clear, visual, and easy to reference at any hour.", type: "image", url: BASE + "AAP%20Guidelines%20for%20Safe%20Sleep.png", color: C.sky, emoji: "🛏️", tier: "free" },
      ],
    }],
  },
  sleep: {
    intro: "Sleep looks different at every stage. These resources cover everything from naps and regressions to troubleshooting the hard nights.",
    sections: [
      {
        label: "Understanding Sleep",
        items: [
          { title: "Attachment in Sleep", desc: "How attachment science shapes sleep — and why connection and independence aren't opposites.", type: "pdf", url: BASE + "Attachment%20in%20Sleep.pdf", color: C.sage, emoji: "🤝", tier: "free" },
          { title: "Temperament in Sleep", desc: "Your child's nervous system and temperament profile directly influence how they sleep. Learn to work with who they are.", type: "pdf", url: BASE + "Temperament%20in%20Sleep.pdf", color: C.amber, emoji: "✨", tier: "free" },
          { title: "Boundaries & Consistency in Sleep", desc: "Why consistency isn't rigidity — and how holding boundaries with warmth is one of the most loving things you can do.", type: "pdf", url: BASE + "Boundaries%20and%20Consistency%20in%20Sleep%20Training.pdf", color: C.purple, emoji: "🌙", tier: "free" },
          { title: "Nap Info", desc: "Wake windows, nap counts by age, nap transitions, and what to do when naps stop working.", type: "pdf", url: BASE + "Nap%20Info.pdf", color: C.teal, emoji: "☀️", tier: "free" },
          { title: "Sleep Regressions", desc: "What regressions actually are, why they happen, and how to ride them without undoing your progress.", type: "pdf", url: BASE + "Sleep%20Regressions.pdf", color: C.mauve, emoji: "🔄", tier: "free" },
          { title: "Travel Tips for Sleep", desc: "How to protect sleep on the road — planning, environment hacks, and managing disruptions without panic.", type: "pdf", url: BASE + "Travel%20Tips%20for%20Sleep.pdf", color: C.sky, emoji: "✈️", tier: "free" },
          { title: "When to Be Concerned", desc: "Signs that sleep struggles may have a medical root cause — and when to loop in your pediatrician.", type: "pdf", url: BASE + "When%20to%20be%20Concerned.pdf", color: C.rose, emoji: "🩺", tier: "free" },
        ],
      },
      {
        label: "Troubleshooting",
        sublabel: "Quick guides for the hard nights",
        items: [
          { title: "Night Wakings", desc: "Why they happen, how to respond, and how to reduce them over time.", type: "pdf", url: BASE + "Troubleshooting%20Night%20Wakings.pdf", color: C.purple, emoji: "🌛", tier: "plus" },
          { title: "Early Mornings", desc: "The 5am problem — why it happens and how to push wake time later.", type: "pdf", url: BASE + "Troubleshooting%20Early%20Mornings.pdf", color: C.amber, emoji: "🌅", tier: "plus" },
          { title: "False Starts", desc: "Waking 30–60 min after bedtime. What's causing it and what to do tonight.", type: "pdf", url: BASE + "Troubleshooting%20False%20Starts.pdf", color: C.warm, emoji: "⚡", tier: "plus" },
          { title: "Split Nights", desc: "Long awake stretches in the middle of the night — causes and solutions.", type: "pdf", url: BASE + "Troubleshooting%20Split%20Nights.pdf", color: C.sky, emoji: "✂️", tier: "plus" },
        ],
      },
    ],
  },
  toddler: {
    intro: "Toddlers and preschoolers bring new challenges — big feelings, boundary testing, and developmental leaps. You've got this.",
    sections: [{
      items: [
        { title: "Quiet Time Implementation", desc: "Transitioning away from naps? Quiet time is the bridge. Here's how to make it work.", type: "pdf", url: BASE + "Quiet%20Time%20Implementation.pdf", color: C.sage, emoji: "🤫", tier: "free" },
        { title: "A Parent's Guide to Potty Training", desc: "A gentle, practical approach to potty training that follows your child's readiness rather than a rigid timeline.", type: "pdf", url: BASE + "A%20Parents%20Guide%20to%20Potty%20Training%20(2).pdf", color: C.teal, emoji: "🚽", tier: "plus" },
        { title: "When Your Child Refuses Dinner", desc: "Mealtime battles, food refusal, and how to take the power struggle out of eating.", type: "image", url: BASE + "When%20Your%20Child%20Refuses%20Dinner.png", color: C.warm, emoji: "🥦", tier: "free" },
        { title: "Preschool Evaluation Questions", desc: "Questions to ask when evaluating preschools — what to look for, what to listen for.", type: "pdf", url: BASE + "Preschool_Evaluation_Questions.pdf.pdf", color: C.purple, emoji: "🏫", tier: "free" },
      ],
    }],
  },
  parenting: {
    intro: "Parenting is generational work. These resources are for the long game — who you're becoming, not just what you're doing.",
    sections: [{
      items: [
        { title: "Survival Mode Playbook", desc: "For the seasons when you're just getting through. Permission to simplify, lower the bar, and still show up for your kids.", type: "pdf", url: BASE + "Survival%20Mode%20Playbook%20(3).pdf", color: C.mauve, emoji: "🛡️", tier: "free" },
      ],
    }],
  },
  grounding: {
    intro: "Tools to help you and your little one come back to yourselves. Choose what feels right in the moment — there's no wrong way to ground.",
    sections: [{ items: [] }],
    isRegulationModule: true,
  },
};

// ─── SCRIPTS DATA ─────────────────────────────────────────────────────────────
const SCRIPTS = [
  {
    id: "hitting",
    emoji: "😤",
    label: "My child is hitting / being physical",
    grounding: "Stay steady. I'm the boundary.",
    say: [
      "\"I won't let you hit. I'm right here.\"",
      "\"Your body has big feelings. I'm going to help you.\"",
      "\"I'm keeping us safe.\"",
    ],
    do: [
      "Gently block + move body back",
      "Lower your voice instead of raising it",
    ],
  },
  {
    id: "meltdown",
    emoji: "😭",
    label: "Big meltdown / full breakdown",
    grounding: "Connection before anything else.",
    say: [
      "\"I'm here. You don't have to do this alone.\"",
      "\"That felt really big, huh?\"",
      "\"You're safe. I've got you.\"",
    ],
    do: [
      "Sit near (not over)",
      "Slow your breathing — they'll co-regulate",
    ],
  },
  {
    id: "bedtime",
    emoji: "🌙",
    label: "Bedtime resistance",
    grounding: "Hold the boundary, soften the delivery.",
    say: [
      "\"It's time for your body to rest. I'm right here.\"",
      "\"You don't have to like it. I'll help you through it.\"",
      "\"I'll stay close while your body settles.\"",
    ],
    do: [
      "Keep routine predictable",
      "Reduce talking, increase presence",
    ],
  },
  {
    id: "not_listening",
    emoji: "🙉",
    label: "Not listening / ignoring me",
    grounding: "Connection first, then direction.",
    say: [
      "\"Come here, I want to talk to you.\"",
      "\"I'm not going to repeat myself. I'll help you follow through.\"",
      "\"Let's do this together.\"",
    ],
    do: [
      "Move closer, get eye level",
      "Guide physically if needed",
    ],
  },
  {
    id: "reset",
    emoji: "🌬️",
    label: "I need a moment to reset",
    grounding: "I can't pour from empty. Pausing is parenting.",
    say: [
      "\"I need a moment to collect myself so I can show up the way I want to.\"",
      "\"I'm feeling big feelings right now. Let me breathe first.\"",
      "\"I love you. I need one minute.\"",
    ],
    do: [
      "Step away briefly if safe to do so",
      "Three slow breaths before re-entering",
      "Return with presence, not performance",
    ],
  },
  {
    id: "repair",
    emoji: "🔁",
    label: "After a hard moment (repair)",
    grounding: "Repair builds more than perfection ever will.",
    say: [
      "\"That was a hard moment. I'm still with you.\"",
      "\"I didn't like how I handled that. I'm working on it.\"",
      "\"We're okay.\"",
      "\"I raised my voice and I'm sorry. You didn't deserve that.\"",
      "\"We had a hard moment. We're still okay. We always come back to each other.\"",
      "\"I'm learning too. I'm going to keep trying.\"",
    ],
    do: [
      "Gentle touch (if welcomed)",
      "Reconnect before teaching",
    ],
  },
  {
    id: "separation",
    emoji: "😰",
    label: "Transitions / separation anxiety",
    grounding: "Predictability creates safety.",
    say: [
      "\"I'll be back. I always come back.\"",
      "\"It's okay to miss me. I miss you too.\"",
      "\"Your body might feel scared. That's normal.\"",
    ],
    do: [
      "Keep goodbye short + consistent",
      "Avoid sneaking out",
    ],
  },
  {
    id: "potty",
    emoji: "🚽",
    label: "Potty refusal / accidents",
    grounding: "This is learning, not defiance.",
    say: [
      "\"Your body is still learning. I'll help you.\"",
      "\"Accidents happen. We clean up and try again.\"",
      "\"I won't force you, but I will guide you.\"",
    ],
    do: [
      "Stay neutral — no shame, no hype",
      "Build routine vs pressure",
    ],
  },
  {
    id: "power_struggle",
    emoji: "😤",
    label: "Power struggles / saying \"no\"",
    grounding: "Don't enter the battle.",
    say: [
      "\"You don't want to. I hear you.\"",
      "\"You can say no with your words — not your body.\"",
      "\"I'm going to help you anyway.\"",
    ],
    do: [
      "Offer limited choices",
      "Stay calm + repetitive",
    ],
  },
  {
    id: "overstimulation",
    emoji: "🧠",
    label: "Overstimulation / dysregulation",
    grounding: "Regulate first, don't reason.",
    say: [
      "\"Your body feels too full right now.\"",
      "\"Let's slow it down together.\"",
      "\"I've got you.\"",
    ],
    do: [
      "Reduce input — lights, noise, people",
      "Deep pressure / grounding",
    ],
  },
  {
    id: "whining",
    emoji: "😩",
    label: "Whining / clinginess",
    grounding: "They need connection, not correction.",
    say: [
      "\"You really want me right now.\"",
      "\"Come here.\"",
      "\"I'm with you.\"",
    ],
    do: [
      "1–2 minutes of full attention",
      "Then redirect",
    ],
  },
  {
    id: "siblings",
    emoji: "👫",
    label: "Sibling conflict",
    grounding: "I'm the referee, not the judge.",
    say: [
      "\"I won't let you hurt each other.\"",
      "\"Both of you are having a hard time.\"",
      "\"I'm going to help you figure this out.\"",
    ],
    do: [
      "Separate first, talk later",
      "Avoid \"who started it\"",
    ],
  },
  {
    id: "screens",
    emoji: "📱",
    label: "Transition off screens",
    grounding: "Their brain needs help shifting.",
    say: [
      "\"It's hard to turn this off.\"",
      "\"I'll help you.\"",
      "\"Last minute, then we're done.\"",
    ],
    do: [
      "Give countdown",
      "Stay close during transition",
    ],
  },
  {
    id: "teen",
    emoji: "🧑",
    label: "Teen pushback / attitude",
    grounding: "Stay grounded, don't take the bait.",
    say: [
      "\"I'm open to talking, not disrespect.\"",
      "\"I hear you. Let's try again.\"",
      "\"We can disagree and still be respectful.\"",
    ],
    do: [
      "Pause before reacting",
      "Keep tone neutral, not reactive",
    ],
  },
];

// ─── SCRIPTS TAB ──────────────────────────────────────────────────────────────
export function ScriptsTab() {
  const T = useT();
  const [open, setOpen] = useState(null);

  return (
    <div>
      {/* Intro quote */}
      <div style={{
        padding: "14px 16px", borderRadius: 12, marginBottom: 20,
        background: T.faint, border: `1px solid ${T.border}`,
      }}>
        <div style={{
          fontFamily: serif, fontSize: 14, fontStyle: "italic",
          color: T.warm, lineHeight: 1.65,
        }}>
          "You don't need the perfect words. You just need words that come from a grounded place."
        </div>
      </div>

      {/* Script list */}
      {SCRIPTS.map(s => (
        <div key={s.id} style={{ marginBottom: 8 }}>
          {/* Accordion trigger */}
          <button
            onClick={() => setOpen(open === s.id ? null : s.id)}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12,
              padding: "14px 16px", borderRadius: open === s.id ? "14px 14px 0 0" : 14,
              background: open === s.id ? T.bark : T.card2,
              border: `1px solid ${open === s.id ? T.bark : T.border}`,
              borderBottom: open === s.id ? "none" : undefined,
              cursor: "pointer", textAlign: "left", transition: "all .18s",
            }}
          >
            <span style={{ fontSize: 20, flexShrink: 0 }}>{s.emoji}</span>
            <span style={{
              flex: 1, fontFamily: font, fontSize: 13.5, fontWeight: 600,
              color: open === s.id ? "#fff" : T.text,
            }}>
              {s.label}
            </span>
            <span style={{
              color: open === s.id ? "rgba(255,255,255,0.6)" : T.muted,
              fontSize: 16,
              transform: open === s.id ? "rotate(90deg)" : "none",
              transition: "transform .2s",
            }}>›</span>
          </button>

          {/* Expanded content */}
          {open === s.id && (
            <div style={{
              borderRadius: "0 0 14px 14px",
              background: T.card2,
              border: `1px solid ${T.border}`,
              borderTop: "none",
              padding: "16px 18px",
            }}>
              {/* Grounding cue */}
              <div style={{
                fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase",
                color: T.warm, fontFamily: font, fontWeight: 700, marginBottom: 6,
              }}>
                Grounding cue
              </div>
              <div style={{
                fontFamily: serif, fontSize: 14, fontStyle: "italic",
                color: T.text, lineHeight: 1.6, marginBottom: 16,
              }}>
                "{s.grounding}"
              </div>

              {/* Say */}
              <div style={{
                fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase",
                color: T.teal, fontFamily: font, fontWeight: 700, marginBottom: 8,
              }}>
                Say
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                {s.say.map((line, i) => (
                  <div key={i} style={{
                    padding: "10px 14px", borderRadius: 10,
                    background: T.faint, borderLeft: `3px solid ${T.teal}`,
                    fontFamily: serif, fontSize: 14, fontStyle: "italic",
                    color: T.text, lineHeight: 1.6,
                  }}>
                    {line}
                  </div>
                ))}
              </div>

              {/* Do */}
              <div style={{
                fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase",
                color: T.muted, fontFamily: font, fontWeight: 700, marginBottom: 8,
              }}>
                Do
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {s.do.map((action, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "flex-start", gap: 8,
                    fontFamily: font, fontSize: 13.5, color: T.text, lineHeight: 1.6,
                  }}>
                    <span style={{ color: T.warm, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>→</span>
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Footer note */}
      <div style={{
        marginTop: 16, padding: "12px 16px", borderRadius: 12,
        background: T.faint, border: `1px solid ${T.border}`,
        fontFamily: font, fontSize: 12.5,
        color: T.muted, lineHeight: 1.65, fontStyle: "italic",
      }}>
        These words set a boundary without disconnecting. They regulate through presence, not correction — which is what the nervous system actually needs in this moment.
      </div>
    </div>
  );
}


function ResourceCard({ item, locked }) {
  const T = useT();
  const [hover, setHover] = useState(false);
  const typeIcon = item.type === "pdf" ? "📄" : item.type === "image" ? "🖼️" : "↗";
  const typeLabel = item.type === "pdf" ? "PDF" : item.type === "image" ? "Image" : "Link";
  return (
    <div onClick={() => { if (!locked) window.open(item.url, "_blank", "noopener noreferrer"); }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ borderRadius: 14, border: `1px solid ${locked ? T.border : hover ? item.color + "55" : T.border}`, background: locked ? T.faint : hover ? `${item.color}08` : T.card, padding: "16px 18px", cursor: locked ? "default" : "pointer", transition: "all .2s", transform: (!locked && hover) ? "translateY(-1px)" : "none", boxShadow: (!locked && hover) ? `0 4px 16px ${item.color}20` : "none", opacity: locked ? 0.75 : 1 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: locked ? T.faint : `${item.color}18`, border: `1px solid ${locked ? T.border : item.color + "30"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
          {locked ? "🔒" : item.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: locked ? T.muted : T.headingText, marginBottom: 4, lineHeight: 1.3 }}>{item.title}</div>
          <div style={{ fontFamily: font, fontSize: 12.5, color: T.muted, lineHeight: 1.6, marginBottom: 10 }}>{item.desc}</div>
          {locked ? (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, background: `${T.teal}15`, border: `1px solid ${T.teal}25` }}>
              <span style={{ fontSize: 11, fontFamily: font, fontWeight: 700, color: T.teal, letterSpacing: ".06em", textTransform: "uppercase" }}>Plus feature · Upgrade to unlock</span>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, fontFamily: font, fontWeight: 700, color: item.color, letterSpacing: ".06em", textTransform: "uppercase" }}>{typeIcon} {typeLabel}</span>
              <span style={{ fontSize: 11, color: T.muted, fontFamily: font }}>· Tap to open</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OvercorrectingCard() {
  const T = useT();
  const [hover, setHover] = useState(false);
  return (
    <div onClick={() => window.open("https://a.co/d/0bu4Ep46", "_blank", "noopener noreferrer")}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ borderRadius: 18, border: `2px solid ${C.warm}55`, background: hover ? `linear-gradient(135deg, ${C.warm}18, ${C.mauve}12)` : `linear-gradient(135deg, ${C.warm}0e, ${C.mauve}08)`, padding: "24px 22px", cursor: "pointer", transition: "all .25s", transform: hover ? "translateY(-2px)" : "none", boxShadow: hover ? `0 8px 32px ${C.warm}30` : `0 2px 12px ${C.warm}15`, marginBottom: 20, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", border: `2px solid ${C.warm}18`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: -15, right: -15, width: 80, height: 80, borderRadius: "50%", border: `2px solid ${C.warm}25`, pointerEvents: "none" }} />
      <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 20, marginBottom: 14, background: `${C.warm}25`, border: `1px solid ${C.warm}50` }}>
        <span style={{ fontSize: 12 }}>✨</span>
        <span style={{ fontFamily: font, fontSize: 11, fontWeight: 800, color: C.warm, letterSpacing: ".1em", textTransform: "uppercase" }}>Featured · Must Read</span>
      </div>
      <div style={{ fontFamily: serif, fontSize: 26, color: T.headingText, lineHeight: 1.15, marginBottom: 6 }}>Overcorrecting</div>
      <div style={{ fontFamily: font, fontSize: 12, color: C.warm, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 14 }}>By Manu Brune</div>
      <div style={{ fontFamily: font, fontSize: 13.5, color: T.muted, lineHeight: 1.75, marginBottom: 20, maxWidth: 480 }}>
        The book that started it all. <em>Overcorrecting</em> explores how well-meaning parents can unintentionally work against themselves — and how to find your way back to connection, confidence, and calm.<br /><br />If you only read one thing from this library, make it this.
      </div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 22px", borderRadius: 12, background: hover ? C.warm : `${C.warm}dd`, color: "#fff", fontFamily: font, fontSize: 13.5, fontWeight: 700, transition: "background .2s", boxShadow: `0 4px 14px ${C.warm}40` }}>
        📖 Get it on Amazon <span style={{ fontSize: 14 }}>→</span>
      </div>
    </div>
  );
}

function SectionBlock({ section, canAccessFullLibrary }) {
  const T = useT();
  return (
    <div style={{ marginBottom: 24 }}>
      {section.label && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: section.sublabel ? 4 : 0 }}>
            <div style={{ height: 1, width: 20, background: T.border }} />
            <div style={{ fontFamily: font, fontSize: 11, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: T.muted }}>{section.label}</div>
            <div style={{ flex: 1, height: 1, background: T.border }} />
          </div>
          {section.sublabel && <div style={{ fontFamily: font, fontSize: 12, color: T.subText, textAlign: "center", marginTop: 4 }}>{section.sublabel}</div>}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {section.items.map((item, i) => (
          <ResourceCard key={i} item={item} locked={item.tier === "plus" && !canAccessFullLibrary} />
        ))}
      </div>
    </div>
  );
}


// ─── UPGRADE MODAL ────────────────────────────────────────────────────────────
function UpgradeModal({ onClose, T, currentUser }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleUpgrade() {
    setLoading(true); setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-parent-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email: currentUser?.email,
          name: currentUser?.name,
          user_id: currentUser?.id,
          tier: "plus",
        }),
      });
      const data = await res.json();
      if (data.url) { window.open(data.url, "_blank"); onClose(); }
      else setError(data.error || "Something went wrong. Please try again.");
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: T.bg, borderRadius: 20, padding: 28, maxWidth: 340, width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
        <div style={{ fontSize: 32, textAlign: "center", marginBottom: 12 }}>🌿</div>
        <div style={{ fontFamily: serif, fontSize: 20, color: T.headingText, textAlign: "center", marginBottom: 8 }}>Upgrade to Plus</div>
        <p style={{ fontFamily: font, fontSize: 13.5, color: T.muted, lineHeight: 1.65, textAlign: "center", marginBottom: 24 }}>
          Unlock all courses, masterclasses, and troubleshooting guides for $15/month.
        </p>
        {error && (
          <p style={{ fontFamily: font, fontSize: 12.5, color: "#B91C1C", marginBottom: 12, textAlign: "center" }}>{error}</p>
        )}
        <button onClick={handleUpgrade} disabled={loading}
          style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", background: C.teal, color: "#fff", fontFamily: font, fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer", marginBottom: 10 }}>
          {loading ? "Opening checkout…" : "Upgrade to Plus →"}
        </button>
        <button onClick={onClose}
          style={{ width: "100%", padding: "11px", borderRadius: 10, border: `1px solid ${T.border}`, background: "none", color: T.muted, fontFamily: font, fontSize: 13.5, cursor: "pointer" }}>
          Maybe later
        </button>
      </div>
    </div>
  );
}

export function LibraryModule({ defaultTab, onOpenDrawer }) {
  const T = useT();
  const { canAccessFullLibrary, currentUser } = useApp();
  const [activeTab, setActiveTab] = useState(defaultTab || "postpartum");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const tabContent = CONTENT[activeTab];
  const isGrounding = activeTab === "grounding";
  const isScripts = activeTab === "scripts";

  return (
    <div style={{ fontFamily: font, color: T.text, paddingBottom: 80, padding: "0 18px 80px" }}>
      {showUpgradeModal && <UpgradeModal onClose={() => setShowUpgradeModal(false)} T={T} currentUser={currentUser} />}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 9.5, letterSpacing: ".18em", textTransform: "uppercase", color: T.subText, fontWeight: 600, marginBottom: 6 }}>Rooted Connections Collective</div>
          <h1 style={{ fontFamily: serif, fontSize: 28, color: T.headingText, lineHeight: 1.1, marginBottom: 8 }}>Library</h1>
          <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>Resources curated for every stage of your parenting journey.</div>
        </div>
        {onOpenDrawer && (
          <button onClick={onOpenDrawer} style={{
            width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
            background: "transparent", border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 4, marginTop: 4,
          }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 18, height: 1.5, borderRadius: 2, background: T.muted }} />
            ))}
          </button>
        )}
      </div>

      {!canAccessFullLibrary && (
        <div style={{ marginBottom: 20, padding: "14px 16px", borderRadius: 14, background: `linear-gradient(135deg, ${C.teal}12, ${C.sage}08)`, border: `1px solid ${C.teal}30`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 24, flexShrink: 0 }}>🌿</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: T.headingText, marginBottom: 3 }}>Some resources are Plus features</div>
            <div style={{ fontFamily: font, fontSize: 12, color: T.muted, lineHeight: 1.6 }}>Upgrade to Plus for $15/mo to unlock all courses, masterclasses, and troubleshooting guides.</div>
          </div>
          <button onClick={() => setShowUpgradeModal(true)} style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 10, border: "none", background: C.teal, color: "#fff", fontFamily: font, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>Upgrade</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 24, paddingBottom: 4, scrollbarWidth: "none" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ flexShrink: 0, padding: "8px 16px", borderRadius: 20, border: `1.5px solid ${activeTab === t.id ? C.teal : T.border}`, fontFamily: font, fontSize: 13, fontWeight: activeTab === t.id ? 700 : 500, background: activeTab === t.id ? `${C.teal}20` : T.card, color: activeTab === t.id ? C.teal : T.muted, cursor: "pointer", transition: "all .18s", whiteSpace: "nowrap", boxShadow: activeTab === t.id ? `0 2px 10px ${C.teal}25` : "none" }}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {tabContent?.intro && !isScripts && (
        <div style={{ fontFamily: font, fontSize: 13.5, color: T.muted, lineHeight: 1.7, marginBottom: 24, padding: "14px 16px", borderRadius: 12, background: T.faint, borderLeft: `3px solid ${C.teal}` }}>
          {tabContent.intro}
        </div>
      )}

      {activeTab === "parenting" && <OvercorrectingCard />}

      {isScripts ? (
        <ScriptsTab />
      ) : isGrounding ? (
        <RegulationModule />
      ) : (
        tabContent?.sections.map((section, i) => (
          <SectionBlock key={i} section={section} canAccessFullLibrary={canAccessFullLibrary} />
        ))
      )}

      {(activeTab === "postpartum" || activeTab === "parenting") && (
        <div style={{ borderRadius: 14, border: `1px dashed ${T.border}`, padding: "20px 18px", textAlign: "center", marginTop: 8 }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>🎓</div>
          <div style={{ fontFamily: serif, fontSize: 15, color: T.headingText, marginBottom: 4 }}>
            {activeTab === "postpartum" ? "Postpartum Secrets Masterclass" : "The Parenting Reset Course"}
          </div>
          <div style={{ fontFamily: font, fontSize: 12.5, color: T.muted, lineHeight: 1.6 }}>
            {activeTab === "postpartum" ? "An on-demand masterclass for navigating the postpartum season with more support and less overwhelm." : "A Cycle Breaker's Blueprint — on-demand course for breaking generational parenting patterns."}
          </div>
          <div style={{ display: "inline-block", marginTop: 12, padding: "6px 14px", borderRadius: 20, background: T.faint, border: `1px solid ${T.border}`, fontFamily: font, fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: ".06em", textTransform: "uppercase" }}>
            Coming soon
          </div>
        </div>
      )}
    </div>
  );
}
