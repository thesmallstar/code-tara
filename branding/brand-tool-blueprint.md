# Brand World Builder — Product Blueprint

## What this product is

A guided brand-building tool that takes a user from "I have a business idea" to "I have a complete, coherent brand system" — by understanding the *category* the business lives in and automatically generating the right surfaces, decisions, and constraints for that specific world.

The core thesis: the *thinking process* behind great branding is universal, but the *output surface area* is entirely category-dependent. A coffee shop brand and a CLI dev tool go through the same strategic steps, but the things they need to design are completely different. This product handles that translation.

---

## The mental model

Think of the product as three layers:

**Layer 1 — Brand Strategy Engine**
Positioning, voice, personality. Category-agnostic. Every business goes through this.

**Layer 2 — Category Intelligence**
The mapping of "what kind of business is this" → "what surfaces does the brand need to live on." This is the core IP.

**Layer 3 — Touchpoint Design Scaffold**
For each surface, the specific design decisions, constraints, and best practices. Not templates — thinking frameworks.

---

## The full user journey

### Step 0 — Entry & Context Capture

**What the user does:**
Describes their business in natural language. No forms, no dropdowns. Just a text input or a short conversation.

Examples of what someone might type:
- "I'm opening a specialty coffee roastery in Indiranagar, Bangalore"
- "I'm building a CLI tool for database migrations aimed at backend engineers"
- "Launching a unisex perfume line inspired by Indian monsoons"
- "Starting a sneaker brand that makes handcrafted leather shoes in Dharavi"
- "Building a B2B SaaS for restaurant inventory management"
- "Opening a co-working space for creative freelancers in Goa"

**What the product does silently:**

1. **Category detection** — maps the input to one of the category archetypes (see Category Intelligence section below)
2. **Sub-category refinement** — "coffee" alone isn't enough; is it a café, a roastery, a D2C beans brand, or a cloud kitchen? Each has different touchpoints
3. **Context extraction** — location (physical vs digital-first), market (India vs US vs global), price tier (mass vs premium vs luxury), audience (consumers vs developers vs businesses)
4. **Channel inference** — does this business primarily live in physical space, on screens, or both?

**How it presents:**

A short "brand snapshot" card that the user confirms or edits:

```
┌─────────────────────────────────────────────────┐
│  Got it. Here's what I understand:               │
│                                                   │
│  Category:    Specialty coffee — café + roastery  │
│  Location:    Indiranagar, Bangalore              │
│  Positioning: Premium, neighborhood, intentional  │
│  Primary context: Physical storefront             │
│  Audience:    Local regulars + specialty coffee    │
│               enthusiasts                         │
│                                                   │
│  [ Looks right ]    [ Let me adjust ]             │
└─────────────────────────────────────────────────┘
```

If the user says "let me adjust," it becomes a conversational back-and-forth, not a form. "Actually, we're also doing D2C beans online" → the product updates the category to "café + roastery + D2C" which changes the touchpoint map downstream.

**Key design decision for the UI:**
This step should feel like talking to a smart brand strategist, not filling out an intake form. The product should ask follow-up questions only if the input is ambiguous. If someone says "sneaker brand, handcrafted, premium," that's enough to move forward. Don't over-interview.

---

### Step 1 — Positioning Lock

**What happens:**
The product pushes the user to articulate a tight brand stance before any visual work begins. This is the "one brutally clear sentence" idea.

**How the product generates questions:**
The questions aren't generic. They're dynamically generated based on the category and context from Step 0. The product has a question bank per category, and it picks the 3–5 most revealing ones.

**Category-specific question examples:**

For a **coffee shop/roastery:**
- "What's the thing you're *against*? Fast-casual chains? Third-wave pretension? Both?"
- "When a regular walks in, what's the feeling? Their living room? A library? A club?"
- "Is this a 'grab and go' or a 'sit and stay' place — or does it shift by time of day?"
- "What would a menu board at your café never have on it?"

For a **sneaker/shoe brand:**
- "Is this about craft and materials, or about cultural identity and streetwear?"
- "When someone wears your shoes, what do they want other people to think about them?"
- "Are you competing with Nike and Adidas, or with artisan leather brands?"
- "What's the unboxing moment supposed to feel like?"

For a **dev tool / CLI:**
- "When someone finds your tool, are they frustrated with an existing workflow or discovering a new capability?"
- "Is this a 'set it and forget it' utility or something developers interact with daily?"
- "Do you want to feel like a serious infrastructure tool (Stripe, Cloudflare) or a developer-beloved indie tool (Fig, Warp)?"
- "What's the 3am-debugging energy? Reliable and boring, or clever and delightful?"

For a **perfume brand:**
- "Is this a daily signature scent or a special-occasion ritual?"
- "What's the reference world — fashion, nature, architecture, memory?"
- "Are you selling the juice or the story? (Both is fine, but one leads.)"
- "Where does someone first encounter this — a store shelf, an Instagram ad, a friend's recommendation?"

For a **D2C skincare brand:**
- "Is this clinical/science-led or sensorial/ritual-led?"
- "What's the bathroom shelf aesthetic? Minimalist glass? Playful color? Apothecary?"
- "Are you trying to replace a specific product people already use, or create a new habit?"
- "What ingredient or process is your 'reason to believe'?"

For a **SaaS product (B2B):**
- "Who's the buyer vs the user? Are they the same person?"
- "Is this replacing spreadsheets, replacing a competitor, or creating a new category?"
- "What's the first 'aha' moment — what does the user see that makes them go 'oh, this is good'?"
- "Are you selling efficiency, insight, or control?"

For a **restaurant/bar:**
- "Is this a destination people plan for, or a neighborhood drop-in?"
- "What's the one dish or drink that defines the experience?"
- "What would someone's Instagram story look like from your place?"
- "What cuisine or vibe are you deliberately *not*?"

For a **co-working space:**
- "Is this for heads-down deep work, collaborative energy, or both at different times?"
- "What's the membership identity — are people proud to say they work here?"
- "What's the thing that's broken about existing co-working that you're fixing?"

**Output of this step:**

A **Positioning Card** that becomes the foundation for everything:

```
┌─────────────────────────────────────────────────┐
│  POSITIONING LOCK                                │
│                                                   │
│  "A slow, neighborhood club for people who       │
│   care way too much about coffee."               │
│                                                   │
│  Brand attributes:                                │
│  Calm · Intentional · Obsessive · Unhurried      │
│                                                   │
│  We are:                                          │
│  → A neighborhood sanctuary                      │
│  → A place for coffee rituals                    │
│  → Quietly premium                               │
│                                                   │
│  We are not:                                      │
│  → A productivity hub                            │
│  → A chain or a franchise                        │
│  → Instagrammable for the sake of it             │
│                                                   │
│  [ Lock this ] [ Keep refining ]                  │
└─────────────────────────────────────────────────┘
```

**Presentation note:** This card should feel like a manifesto, not a form output. Good typography, intentional spacing. The user should *want* to screenshot it.

---

### Step 2 — Brand World Exploration

**What happens:**
Before jumping to logos, the product generates 2–3 "brand world" directions — each is a coherent visual and verbal territory, not just a moodboard.

**What a brand world includes:**
- A **concept hook** (one sentence that captures the creative direction)
- **Tonal references** — not Pinterest images, but "this brand feels like X meets Y" comparisons the user can immediately feel
- **Color territory** — not final hex codes, but a palette mood (warm earth tones, cold industrial, muted botanical, etc.)
- **Typography family** — serif-led, sans-led, monospace-led, or mixed — with reasoning
- **Visual identity concept** — the *idea* behind the logo, not the logo itself. For Quick Brown Fox, this would be "luxury fashion mascot applied to coffee"

**How it presents:**

Three cards side by side, each representing a different creative direction. The user can pick one, blend elements, or ask for more.

Example for the coffee roastery:

```
Direction A: "The Quiet Club"
Feels like: A private library meets a Japanese kissaten
Color: Deep ink, warm stone, aged paper
Type: Humanist serif + neutral sans
Identity concept: A fox as a luxury club mascot — 
think Lacoste's crocodile but for a coffee sanctuary
────────────────────────────────────

Direction B: "The Craft Obsessive"
Feels like: A watchmaker's workshop meets a Scandinavian kitchen
Color: Bone white, matte black, one copper accent
Type: Geometric sans with custom letter details
Identity concept: Typographic-led — the name IS the logo, 
with one ownable letterform quirk (the Q's tail = fox tail)
────────────────────────────────────

Direction C: "The Neighborhood Ritual"
Feels like: Your favorite uncle's study meets a community notice board
Color: Terracotta, cream, forest green, faded indigo
Type: Slab serif with hand-drawn accents
Identity concept: Illustrative — the fox appears in different 
scenes (reading, brewing, resting) across touchpoints, 
like a recurring character in a storybook
```

**Key design decision:**
The user is choosing a *world*, not a final look. This prevents premature commitment and ensures the logo, packaging, and everything else all come from the same conceptual root.

---

### Step 3 — Logo System Generation

**What happens:**
Within the chosen brand world, the product generates logo concepts — but as a *system*, not a single mark.

**What a logo system includes:**
1. **Primary mark** — the full logo (symbol + wordmark together)
2. **Symbol only** — the standalone icon/mascot/abstract mark
3. **Wordmark only** — the name in the brand typeface
4. **Compact mark** — for small spaces (monogram, simplified symbol, badge)
5. **Hierarchy variations** — symbol-led vs wordmark-led layouts

**How it presents:**

Not just "here are 4 logos." Instead, a canvas showing the system:

```
┌──────────────────────────────────────────────────────┐
│  YOUR LOGO SYSTEM                                     │
│                                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │
│  │  PRIMARY     │  │  SYMBOL     │  │  WORDMARK    │  │
│  │  Fox +       │  │  Fox only   │  │  "Quick      │  │
│  │  "Quick      │  │             │  │   Brown Fox" │  │
│  │  Brown Fox"  │  │             │  │              │  │
│  └─────────────┘  └─────────────┘  └──────────────┘  │
│                                                        │
│  ┌─────────────┐  ┌─────────────┐                     │
│  │  COMPACT     │  │  BADGE      │                     │
│  │  "QBF"       │  │  Fox in     │                     │
│  │  monogram    │  │  circle     │                     │
│  └─────────────┘  └─────────────┘                     │
│                                                        │
│  Each version exists for a reason.                     │
│  The product tells you where each one goes.            │
└──────────────────────────────────────────────────────┘
```

**Smart behavior:**
The product generates the right *kind* of system based on the category:

- **Physical businesses** (café, store, restaurant) → need strong standalone symbols for signage, and badge versions for stamps/packaging
- **Digital products** (SaaS, apps) → need a tight app icon mark, a favicon, and a horizontal lockup for headers
- **D2C brands** (skincare, food, fashion) → need a flexible system that works on tiny labels AND large shipping boxes
- **Personal brands / studios** → might not need a symbol at all — a strong wordmark with one custom move might be enough

---

### Step 4 — Category-Specific Touchpoint Map

**This is the core of the product.**

Once the logo system is taking shape, the product auto-generates the full map of surfaces where this brand needs to exist. The map is generated from the category + sub-category + context identified in Step 0.

**How the touchpoint map presents:**

Not a flat checklist. A **layered map** with three tiers:

```
┌──────────────────────────────────────────────────────┐
│  YOUR BRAND TOUCHPOINT MAP                            │
│                                                        │
│  ● LAUNCH ESSENTIALS (design these first)             │
│    Items you cannot open/ship/launch without           │
│                                                        │
│  ○ GROWTH LAYER (design within first 3 months)        │
│    Items that strengthen the brand as you scale        │
│                                                        │
│  ◌ MATURITY LAYER (design as the brand evolves)       │
│    Items that deepen the brand world over time         │
└──────────────────────────────────────────────────────┘
```

Each touchpoint in the map is not just a name — it's a **design brief card** that tells the user:
- What this touchpoint is and why it matters
- The key design decisions they need to make
- Constraints (size, material, print method)
- How the logo system maps to this surface (which version to use)
- One "most brands get this wrong" warning

**See the full Category Intelligence section below for touchpoint maps across all categories.**

---

### Step 5 — Touchpoint Design (Per Item)

**What happens:**
The user picks a touchpoint from the map and the product walks them through designing it.

**How it works:**

For each touchpoint, the product presents:

1. **The decision framework** — not "design a cup" but "here are the 4 decisions you need to make about your cup"
2. **Reference examples** — "here's how three brands in your space handled this, and what worked/didn't"
3. **Constraints and specs** — dimensions, bleed, material considerations, print method implications
4. **Brand system application** — "based on your positioning and logo system, here's the recommended approach"

**Example: Designing a coffee cup**

```
┌──────────────────────────────────────────────────────┐
│  TOUCHPOINT: Takeaway Cup                             │
│                                                        │
│  Why it matters:                                       │
│  The cup is your most visible brand ambassador.        │
│  It walks out the door and into the street. Every      │
│  cup is a tiny billboard held at eye level.            │
│                                                        │
│  DECISIONS TO MAKE:                                    │
│                                                        │
│  1. Logo placement                                     │
│     → Centered (classic, safe, visible)                │
│     → Wrap-around (immersive, bolder)                  │
│     → Small corner/bottom (understated, premium)       │
│                                                        │
│     Recommendation for your brand: Small placement.    │
│     Your positioning is "calm and intentional" —       │
│     a giant logo screams, a small one whispers.        │
│                                                        │
│  2. Which logo version?                                │
│     → Fox symbol only (on a cup, this is enough;       │
│       people already know where they are)              │
│     → Fox + "QBF" compact mark                         │
│     → Full wordmark (only if cup is large enough)      │
│                                                        │
│  3. Copy on the cup                                    │
│     → Nothing (let the mark speak)                     │
│     → One short line ("Slow coffee, quiet rituals")    │
│     → Rotating lines (seasonal, or small quotes)       │
│                                                        │
│  4. Inner rim / bottom surprise                        │
│     → Nothing                                          │
│     → A small message inside the cup rim               │
│     → Logo on the cup bottom (seen when finishing)     │
│                                                        │
│  SPECS:                                                │
│  Standard sizes: 8oz, 12oz, 16oz                       │
│  Print method: Usually 1-2 color offset or flexo       │
│  Sleeve: Separate surface — can carry different art    │
│                                                        │
│  COMMON MISTAKE:                                       │
│  Putting the full logo + website + tagline + social    │
│  handles on a cup. It's a cup, not a business card.    │
│  Pick ONE thing to say and say it well.                │
└──────────────────────────────────────────────────────┘
```

**Example: Designing a CLI experience (dev tool)**

```
┌──────────────────────────────────────────────────────┐
│  TOUCHPOINT: Terminal / CLI Output                     │
│                                                        │
│  Why it matters:                                       │
│  For a dev tool, the terminal IS your storefront.      │
│  The install command is your unboxing moment.          │
│  Error messages are your customer support.             │
│                                                        │
│  DECISIONS TO MAKE:                                    │
│                                                        │
│  1. Install moment                                     │
│     → Silent (just works, no fanfare)                  │
│     → ASCII logo art on first run                      │
│     → Short welcome message with next steps            │
│                                                        │
│     Recommendation for your brand: If you're going     │
│     for "developer-beloved," a small ASCII mark on     │
│     first run builds affection. If "serious infra      │
│     tool," keep it silent and reliable.                │
│                                                        │
│  2. Output styling                                     │
│     → Monochrome (serious, no-nonsense)                │
│     → Colored status indicators (green/yellow/red)     │
│     → Branded colors in output (bold move, do          │
│       carefully)                                       │
│     → Spinners and progress bars style                 │
│                                                        │
│  3. Error experience                                   │
│     → Terse error codes (for pros)                     │
│     → Helpful error messages with suggestions          │
│     → Links to docs in error output                    │
│                                                        │
│  4. Brand presence level                               │
│     → Tool name in every output line (strong brand)    │
│     → Tool name only at start/end (moderate)           │
│     → No branding in output, just in docs (invisible)  │
│                                                        │
│  SPECS:                                                │
│  Standard terminal width: 80 columns minimum           │
│  Colors: Use ANSI 256 or truecolor with fallbacks      │
│  Test in: dark and light terminal themes                │
│                                                        │
│  COMMON MISTAKE:                                       │
│  Over-designing CLI output. Developers want signal,    │
│  not decoration. Every emoji, color, and box-drawing   │
│  character should earn its place.                      │
└──────────────────────────────────────────────────────┘
```

---

### Step 6 — Brand System Synthesis

**What happens:**
As the user designs touchpoints, the product continuously builds and updates a **living brand system document** — the single source of truth.

**What the brand system doc contains:**

1. **Positioning statement** (from Step 1)
2. **Logo system** — all versions, with usage rules and minimum sizes
3. **Color system** — primary, secondary, accent, with hex/RGB/CMYK specs and usage guidance
4. **Typography system** — primary display, secondary body, and any tertiary/utility styles, with sizing scales
5. **Voice & tone guidelines** — how the brand speaks, with examples per context (menu vs social vs error message vs packaging)
6. **Photography/illustration direction** — if applicable
7. **Layout principles** — spacing, grid behavior, how much negative space, pacing
8. **Touchpoint specs** — a summary card for each designed touchpoint
9. **Do / Don't examples** — concrete "this, not that" visuals

**How it presents:**

A scrollable, well-designed document with clear sections. It should look like something a designer at a studio would produce — not a generic brand guideline template. The user can export it as a PDF, share it with collaborators, or keep building on it.

---

### Step 7 — Ongoing Brand QA

**What happens post-launch:**
The product becomes a lightweight brand integrity checker.

**Use cases:**
- Upload a photo of a new menu → get feedback on whether it's on-brand
- Paste a social media caption → get voice consistency feedback
- Share a new packaging design → check logo usage, color accuracy, spacing
- Adding a new channel (wholesale, partnerships, events) → generate the touchpoint brief for that new context

**How it presents:**
A simple upload/paste interface with a "brand score" and specific, actionable feedback. Not vague — "your logo is too close to the edge on the left, your blue is #2B4C7E but your brand blue is #1E3A5F" level specific.

---

---

## Category Intelligence System

This is the engine that makes the product smart. For each business category, the product knows the full touchpoint universe and how to prioritize it.

### How categories are structured

```
Category (Level 1)
  └── Sub-category (Level 2)
        └── Context modifiers (Level 3)
```

Example:
```
Food & Beverage
  └── Coffee
        └── Café + Roastery
              ├── Physical storefront: yes
              ├── D2C online: yes
              ├── Delivery: no
              ├── Market: India
              └── Tier: Premium
```

The touchpoint map is generated from ALL three levels. A "premium café + roastery with D2C in India" has different touchpoints than a "mass-market coffee D2C brand in the US with no physical store."

---

### Full Category Maps

Below is the touchpoint universe for each major category. Each touchpoint is tagged:

- **[L]** = Launch essential
- **[G]** = Growth layer
- **[M]** = Maturity layer

---

#### ☕ COFFEE SHOP / ROASTERY

**Physical Space**
- [L] Exterior fascia sign (primary logo, lit or unlit)
- [L] Menu board (counter-mounted or wall-mounted)
- [G] Hanging/projecting sign (for street visibility — fox icon)
- [G] Window decals (hours, logo, tagline)
- [G] Wayfinding signage ("order here," "pick-up," "restrooms")
- [M] Wall murals or graphic installations
- [M] Etched glass doors or partitions
- [M] Branded furniture details (debossed logos on tables, custom stools)

**Packaging — Drinks**
- [L] Paper cups — 3 sizes (logo placement, copy, sleeve design)
- [L] Cup sleeves (secondary brand surface — icon, short copy, or pattern)
- [G] Takeaway carriers
- [G] Cold drink cups + lids (if applicable)
- [M] Reusable branded mugs/tumblers (merch or dine-in)

**Packaging — Coffee Beans**
- [L] Coffee bag design — fixed template (logo, brand story area)
- [L] Coffee label system (origin, process, tasting notes, roast date — color-coded or pattern-coded per origin)
- [G] Sample/taster packs
- [M] Subscription box design (if D2C)
- [M] Gift set packaging

**Packaging — Food**
- [G] Pastry bags
- [G] Cake/sandwich boxes
- [G] Seal stickers (fox icon or badge)
- [M] Branded napkins, sugar packets

**On-Table & In-Cafe**
- [G] Coasters
- [G] Table tent cards (seasonal specials, wifi info, brand story)
- [G] Loyalty/stamp cards
- [M] Mini zines or "about" cards (sourcing story, brew philosophy)
- [M] Ritual cards (brewing method explanations, slow ritual prompts)

**Merch**
- [G] Tote bags
- [M] Enamel pins, patches, keychains
- [M] Branded notebooks
- [M] Posters or art prints

**Staff**
- [L] Aprons (small embroidered fox or wordmark)
- [G] Staff t-shirts
- [G] Name badges

**Print Collateral**
- [G] Business cards
- [G] Event flyers (cupping sessions, workshops)
- [M] Brand story poster (framed, in-café)
- [M] Coffee guide booklet

**Digital**
- [L] Website/landing page (hours, address, menu, brand story)
- [L] Social media profile icons (fox symbol)
- [G] Social media post templates (new beans, seasonal drinks, events)
- [G] Story templates
- [G] Online/PDF menu
- [M] Email newsletter template
- [M] Playlist cover art (for the café's Spotify playlist)

---

#### 👟 SNEAKER / SHOE BRAND

**The Product Itself**
- [L] Insole print/branding
- [L] Tongue label (woven or printed)
- [L] Heel tab branding
- [G] Outsole logo deboss
- [G] Lace tips (aglets) — branded or color-matched
- [M] Lace dubrae (decorative charm)
- [M] Custom lace design

**Packaging**
- [L] Shoe box — outer design (logo, color, pattern, brand line)
- [L] Shoe box — inner lid (surprise moment: message, pattern, illustration)
- [L] Tissue paper (branded or plain)
- [G] Dust bags (one per shoe)
- [G] Hang tags with brand story + care info
- [G] Size stickers (branded, small)
- [M] Shipping box (if D2C — separate from shoe box, branded outer)
- [M] Insert cards (thank you, care guide, founder's note)

**Retail**
- [G] Store window display concept
- [G] Shelf talkers / product info cards
- [G] Wall display system (how shoes are presented)
- [M] POP (point of purchase) display for wholesale partners
- [M] Shopping bags — paper, branded

**Digital**
- [L] E-commerce PDP (product detail page) layout — how each shoe is photographed and presented
- [L] Website — brand story, collection pages, lookbook
- [L] Social media profile icons
- [G] Social templates — product launch, campaign, behind-the-scenes
- [G] Email templates (launch, restock, campaign)
- [M] Lookbook / campaign microsites

**Content & Brand World**
- [G] Lookbook (digital or printed) — styled editorial photography
- [G] Campaign concept — visual language for launches
- [M] Collaboration frameworks — how to co-brand with artists, other brands
- [M] Brand film / video direction

**Merch / Lifestyle**
- [M] Socks
- [M] Cleaning kits in branded packaging
- [M] Apparel (tees, hoodies) to extend the brand

---

#### 🧴 PERFUME / FRAGRANCE BRAND

**The Product**
- [L] Bottle design — shape, material, cap style
- [L] Bottle label or print (logo, scent name, volume)
- [L] Cap/topper design (a major brand signature in perfume)

**Packaging**
- [L] Outer box — structure, material, print, opening mechanism
- [L] Box interior (tissue, holder, reveal moment)
- [G] Cellophane/shrink wrap with branded seal
- [G] Sample vials + mini labels
- [G] Discovery set box (holds 3–5 samples)
- [M] Travel size packaging
- [M] Refill system packaging (if sustainability angle)
- [M] Gift wrapping system

**Retail**
- [G] Counter display unit (for multi-brand retailers)
- [G] Tester strips / scent cards (branded, with scent name + notes)
- [G] Shelf presence design (how bottles look grouped)
- [M] Pop-up / experiential booth design
- [M] Shopping bags

**Storytelling**
- [L] Scent storytelling system — how each fragrance's story is told (copy framework, visual coding per scent)
- [G] Note cards or booklets per fragrance (top/mid/base notes, inspiration, suggested rituals)
- [M] Brand book / coffee table publication

**Digital**
- [L] Website — hero experience, scent exploration, brand story
- [L] PDP — how each scent is presented (without being able to smell it — imagery, copy, and interaction matter hugely here)
- [G] Social templates
- [G] Email templates
- [M] AR try-on or scent quiz experience

---

#### 💻 DEV TOOL / CLI

**Terminal & Code**
- [L] CLI output styling (colors, formatting, verbosity levels)
- [L] Install experience (first-run message, ASCII art or not)
- [L] Error messages (tone, helpfulness, linking to docs)
- [G] Progress indicators (spinners, progress bars — style)
- [G] ASCII logo / wordmark for terminal headers
- [M] Interactive mode UI (if applicable — prompts, selection styling)
- [M] Config file format and comments style

**Developer Ecosystem**
- [L] README — format, tone, badges, hero image/gif
- [L] npm / brew / pip package listing (description, keywords, icon)
- [G] VS Code extension icon + sidebar branding (if applicable)
- [G] GitHub social preview image (the card that shows when you share a repo link)
- [G] GitHub profile / org page styling
- [M] GitHub Actions marketplace listing
- [M] Changelog format and tone

**Documentation**
- [L] Docs site — layout, navigation, code block styling, search
- [G] API reference design
- [G] Tutorial / quickstart page design
- [M] Interactive playground or sandbox

**Marketing & Community**
- [L] Landing page / marketing site
- [L] Twitter/X social card
- [G] Product Hunt launch assets (logo, gallery images, tagline)
- [G] Hacker News Show HN post format
- [G] Dev blog template
- [M] Conference talk slide template
- [M] Swag — stickers, t-shirts (developer culture specific)
- [M] Discord / community space branding

**Brand System**
- [L] Logo system (primary, icon-only for small spaces, monochrome for terminal)
- [L] Color palette (must work on both dark and light backgrounds)
- [G] Illustration style for docs and blog
- [G] Code syntax highlighting theme (subtle brand touch)

---

#### 🧴 D2C SKINCARE BRAND

**Primary Packaging (the product itself)**
- [L] Tube / jar / bottle design — shape, material, closure type
- [L] Label design — logo, product name, key ingredient callout, usage, volume
- [L] Label system across product line — how different products relate visually (color coding, numbering, naming)

**Secondary Packaging**
- [L] Product box — structure, print, unboxing experience
- [G] Box inserts — ingredient cards, founder's note, how-to-use
- [M] Refill packaging (if sustainability positioning)

**Shipping & Fulfillment**
- [G] Shipping box — outer branded or plain? Inner print?
- [G] Tissue paper
- [G] Sticker seals
- [G] Insert cards (thank you, routine suggestion, referral code)
- [M] Subscription box variation (monthly box design)

**Retail (if applicable)**
- [G] Shelf display unit
- [G] Tester packaging
- [G] Shelf talkers / info cards
- [M] POP displays for partner stores

**Digital**
- [L] Website — PDP design (how each product is shown), brand story, ingredient philosophy
- [L] Social media templates
- [G] Email templates (launch, routine guides, education)
- [G] UGC framework — how customer photos should look/feel
- [M] App (if applicable — routine tracking, reorder)
- [M] Quiz / skin analysis tool design

---

#### 🍽 RESTAURANT / BAR

**Physical Space**
- [L] Exterior sign
- [L] Menu design — format, layout, typography, paper
- [L] Table setting — napkins, coasters, placemats
- [G] Window treatment
- [G] Interior signage — specials board, restrooms, bar
- [G] Bill presenter / check folder
- [M] Wall art / murals
- [M] Private dining or event space branding
- [M] Matchboxes / branded small objects

**Packaging (Takeaway)**
- [G] Takeaway containers (if applicable)
- [G] Bags — paper or cloth
- [G] Stickers / seals
- [M] Branded cutlery wraps

**Staff**
- [L] Aprons
- [G] Uniforms (shirts, jackets)
- [G] Name pins

**Digital**
- [L] Website (menu, reservations, story)
- [L] Google Maps / Zomato / Swiggy listing (photo standards, icon)
- [G] Social templates
- [G] Reservation confirmation design (email/SMS)
- [M] Newsletter

**Print**
- [G] Business cards
- [G] Event flyers
- [M] Cookbook or recipe cards

---

#### 🏢 B2B SaaS PRODUCT

**Product UI**
- [L] App icon and favicon
- [L] Login/signup page design
- [L] Empty states (first-use screens)
- [L] Loading states and micro-interactions
- [G] Email notification templates (system emails, alerts, reports)
- [G] In-app onboarding flow design
- [M] Dark mode considerations
- [M] Mobile app (if applicable)

**Marketing**
- [L] Marketing website (hero, features, pricing, testimonials)
- [L] Social media profiles and templates
- [G] Blog template
- [G] Case study template
- [G] Webinar / event slides template
- [G] Email sequences (onboarding, nurture, re-engagement)
- [M] Partner / integration marketplace listing
- [M] Conference booth design

**Sales & Enablement**
- [G] Pitch deck template
- [G] One-pager / product brief
- [G] Sales email templates
- [M] Comparison sheets
- [M] ROI calculator or interactive tool

**Documentation**
- [G] Help center / knowledge base design
- [G] API docs (if applicable)
- [M] Video tutorial style guide

**Brand**
- [L] Logo system
- [L] Color + type system (must work within the product UI)
- [G] Illustration / icon style
- [G] Photography direction (if using humans — team, customers)
- [M] Swag (stickers, tees for team and customers)

---

#### 📰 NEWSLETTER / PUBLICATION

**Core Product**
- [L] Email template — header, body, footer, CTA style
- [L] Logo and wordmark (must work at small sizes in email headers)
- [L] Web archive page design

**Growth**
- [L] Landing page (subscribe, about, sample issues)
- [G] Social sharing cards (auto-generated per issue)
- [G] Referral program visual assets
- [G] Social media templates (quotes, highlights, announcements)
- [M] Podcast episode template (if expanding to audio)

**Merch & Community**
- [M] Subscriber-only merch (hats, stickers, notebooks)
- [M] Event branding (meetups, dinners)
- [M] Annual report / year-in-review design

---

#### 🧘 FITNESS / WELLNESS STUDIO

**Physical Space**
- [L] Exterior sign
- [L] Lobby / reception branding
- [G] Studio room branding (wall logo, motivational typography)
- [G] Wayfinding (changing rooms, studios, reception)
- [M] Murals / environmental graphics

**Digital**
- [L] Website (schedule, pricing, class descriptions, brand story)
- [L] Class booking app or page
- [G] Social templates (class announcements, tips, instructor features)
- [G] Email templates (welcome, class reminders, membership renewals)
- [M] Video/live-stream overlay branding

**Physical Touchpoints**
- [G] Member cards or app pass
- [G] Water bottles, towels with branding
- [M] Mat bags or equipment branding
- [M] Merch (tanks, joggers, accessories)

**Staff**
- [L] Staff uniforms (tees, tanks with brand mark)
- [G] Instructor bio cards

---

#### 🏨 HOTEL / BOUTIQUE STAY

**Guest Room**
- [L] Room key cards
- [G] In-room collateral (welcome card, wifi info, minibar menu, do-not-disturb signs)
- [G] Bathroom amenities packaging (soap, shampoo, lotion)
- [M] Stationery set (notepad, pen, envelope)
- [M] Bathrobe or slipper embroidery

**Common Areas**
- [L] Lobby signage and reception branding
- [G] Restaurant/bar menus (if on-site)
- [G] Wayfinding (floors, pool, spa, gym)
- [M] Art direction for common space photography

**Digital**
- [L] Website (rooms, booking, story, location)
- [G] Booking confirmation email design
- [G] Social templates
- [M] Review response templates (consistent voice)

**Packaging & Takeaway**
- [G] Shopping bags (for gift shop)
- [M] Branded merchandise (candles, scents, linens for sale)

---

#### 🏗 CO-WORKING SPACE

**Physical Space**
- [L] Exterior signage
- [L] Reception/lobby branding
- [G] Room names and wayfinding (meeting rooms, phone booths, kitchen, bathrooms)
- [G] Event space branding
- [M] Environmental graphics (quotes, patterns, murals)

**Member Experience**
- [L] Membership card or digital pass
- [G] Welcome kit (onboarding booklet, stickers, small branded item)
- [G] Event posters and flyers
- [M] Community newsletter template
- [M] Member directory or profile design

**Digital**
- [L] Website (plans, location, community, brand story)
- [G] App (if applicable — room booking, community)
- [G] Social templates
- [M] Partner benefit cards

**Operational**
- [G] Meeting room booking screens (if digital — branded UI)
- [G] Kitchen/pantry labels
- [M] Branded stationery for members

---

---

## Smart Behaviors & Edge Cases

### Multi-category businesses

If someone says "I'm opening a coffee roastery with a co-working space upstairs," the product should merge touchpoint maps from both categories, deduplicate, and create a unified priority list. Shared surfaces (signage, website) get merged; category-specific ones (coffee bags, meeting room screens) stay separate.

### "I'm not sure what I need"

If the user doesn't know what touchpoints to start with, the product defaults to the **[L] Launch** tier and presents them as a focused 5–7 item starter kit. "You can't open without these. Everything else can wait."

### Adding a new channel later

User comes back 6 months after launch: "We're starting to do wholesale — we need a sell sheet and retailer packaging." The product generates new touchpoints for the wholesale context, inheriting all existing brand system rules.

### Category the product hasn't seen

If the input doesn't map cleanly to any archetype, the product asks one clarifying question: "Is this more of a physical product, a digital product, a service, or a space?" That alone narrows the touchpoint universe enough to generate a useful map.

### Competitor audit integration

Optional power feature: the user inputs 2–3 competitor brands, and the product maps *their* touchpoints to show gaps and opportunities. "Your competitor has strong packaging but weak digital presence — you could differentiate by leading with a killer website."

---

## Presentation Principles (The whole product UI)

### Visual feel of the product itself

This product should feel like working with a thoughtful senior brand strategist, not using a template tool. That means:

- **Generous negative space** throughout the interface
- **Conversational UI** for input steps, not forms
- **Beautiful output cards** that the user wants to screenshot and share
- **Progressive disclosure** — never show everything at once; reveal layers as the user is ready
- **No generic stock illustrations** — if the product uses visuals, they should feel as intentional as the brands it helps create

### Navigation model

Not a dashboard with 10 tabs. A **linear journey** with the ability to jump back:

```
[ Context ] → [ Positioning ] → [ Brand World ] → [ Logo ] → [ Touchpoints ] → [ System Doc ]
     ↑              ↑                ↑               ↑             ↑
     └──────────────┴────────────────┴───────────────┴─────────────┘
                           Can revisit any step
```

The current step is always front and center. Previous steps become reference panels on the side — you can see your positioning card while working on touchpoints.

### Collaboration

At minimum: shareable links for the brand system doc and individual touchpoint briefs. Ideally: a way for the user to invite a designer or partner who can see the whole journey and contribute.

### Export

Every output should be exportable:
- Positioning card → PNG or PDF
- Logo system → SVG + PNG at multiple sizes
- Touchpoint map → interactive checklist or PDF
- Brand system doc → PDF brand guidelines
- Individual touchpoint briefs → PDF or Notion-like doc
