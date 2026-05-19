export type PlanField = {
  id: string;
  label: string;
  placeholder: string;
  type: "text" | "textarea" | "number";
  hint?: string;
};

export type PlanSection = {
  id: string;
  title: string;
  description: string;
  fields: PlanField[];
};

export const JOURNEY_PLAN: PlanSection[] = [
  {
    id: "S1",
    title: "Problem & Solution",
    description: "Define the problem you're solving and what you're building to solve it.",
    fields: [
      {
        id: "JP-01",
        label: "Problem statement",
        placeholder: "e.g. Lansing's east side has no grocery store within a mile — ALICE families spend 2+ hours on buses just to buy food.",
        type: "textarea",
        hint: "Be specific. Name the community, the gap, and the consequence.",
      },
      {
        id: "JP-02",
        label: "Root causes",
        placeholder: "e.g. Grocery chains redlined this zip code. No capital investment, no political will.",
        type: "textarea",
        hint: "Why does this problem exist? What's kept it unsolved?",
      },
      {
        id: "JP-03",
        label: "Your solution",
        placeholder: "e.g. A worker-owned corner market stocked with fresh produce, run by and for the neighborhood.",
        type: "textarea",
        hint: "What are you building? Keep it concrete.",
      },
      {
        id: "JP-04",
        label: "Why you",
        placeholder: "e.g. I've lived in this neighborhood for 20 years. I know the suppliers, the landlords, and the families.",
        type: "textarea",
        hint: "Why are you the right person or team to solve this?",
      },
      {
        id: "JP-05",
        label: "Why now",
        placeholder: "e.g. Three community groups have been asking for this for two years. A storefront just became available.",
        type: "textarea",
        hint: "What's changed that makes this the right moment?",
      },
    ],
  },
  {
    id: "S2",
    title: "Customer & Market",
    description: "Describe who you serve and the size of the opportunity.",
    fields: [
      {
        id: "JP-06",
        label: "Primary customer profile",
        placeholder: "e.g. ALICE families in zip code 48912 — working parents, 2–4 kids, $28–42k household income, no car.",
        type: "textarea",
        hint: "Be specific about who this person is, not just a demographic category.",
      },
      {
        id: "JP-07",
        label: "Secondary customer profile",
        placeholder: "e.g. Seniors on fixed income who can't travel. Nearby office workers looking for lunch options.",
        type: "textarea",
      },
      {
        id: "JP-08",
        label: "Market size estimate",
        placeholder: "e.g. ~4,200 households within walking distance. Average grocery spend ~$400/mo = $1.7M/yr addressable.",
        type: "textarea",
        hint: "Total addressable market — how big is the pie?",
      },
      {
        id: "JP-09",
        label: "Geographic focus",
        placeholder: "e.g. Lansing's near east side, primarily the 48912 zip code.",
        type: "text",
      },
      {
        id: "JP-10",
        label: "Customer pain in their own words",
        placeholder: "e.g. 'I spend my whole Saturday just getting groceries. There\\'s nothing close to us.'",
        type: "textarea",
        hint: "Quotes from real conversations or interviews are gold here.",
      },
    ],
  },
  {
    id: "S3",
    title: "Business Model",
    description: "How value is created, delivered, and captured.",
    fields: [
      {
        id: "JP-11",
        label: "Products and services",
        placeholder: "e.g. Fresh produce, pantry staples, hot prepared meals, community catering.",
        type: "textarea",
        hint: "What exactly do you sell or offer?",
      },
      {
        id: "JP-12",
        label: "Revenue streams",
        placeholder: "e.g. Retail sales (80%), catering contracts (15%), community fridge sponsorships (5%).",
        type: "textarea",
        hint: "How do you make money? List each stream with estimated % of revenue.",
      },
      {
        id: "JP-13",
        label: "Pricing model",
        placeholder: "e.g. Market-rate pricing on staples; 10–15% below chain stores on produce to stay competitive.",
        type: "textarea",
        hint: "How do you price? Cost-plus, market rate, sliding scale?",
      },
      {
        id: "JP-14",
        label: "Key activities",
        placeholder: "e.g. Sourcing and stocking inventory daily, managing member work schedules, community outreach.",
        type: "textarea",
        hint: "What do you do every day to deliver value?",
      },
      {
        id: "JP-15",
        label: "Key resources",
        placeholder: "e.g. Storefront lease, commercial coolers, delivery van, member labor.",
        type: "textarea",
        hint: "What do you need to operate? Physical, financial, human.",
      },
      {
        id: "JP-16",
        label: "Cost drivers",
        placeholder: "e.g. Inventory (60%), rent (15%), payroll (20%), utilities (5%).",
        type: "textarea",
        hint: "What are your biggest ongoing costs?",
      },
    ],
  },
  {
    id: "S4",
    title: "Go-to-Market",
    description: "How you reach customers and grow.",
    fields: [
      {
        id: "JP-17",
        label: "Primary channel",
        placeholder: "e.g. Walk-in foot traffic — the storefront IS the channel.",
        type: "textarea",
        hint: "How do your best customers find you?",
      },
      {
        id: "JP-18",
        label: "Secondary channel",
        placeholder: "e.g. Community Facebook groups, church bulletins, flyers at laundromats and bus stops.",
        type: "textarea",
      },
      {
        id: "JP-19",
        label: "Marketing strategy",
        placeholder: "e.g. $0 paid ads — we rely on word of mouth, community events, and being present at neighborhood meetings.",
        type: "textarea",
        hint: "How do you reach people affordably?",
      },
      {
        id: "JP-20",
        label: "First 10 customers",
        placeholder: "e.g. The 6 founding members' households + 4 neighbors we've already talked to at community meetings.",
        type: "textarea",
        hint: "Name them or describe them specifically. How will you get your first 10?",
      },
    ],
  },
  {
    id: "S5",
    title: "Financial Plan",
    description: "Startup needs, projections, and funding strategy.",
    fields: [
      {
        id: "JP-21",
        label: "Total startup cost estimate ($)",
        placeholder: "e.g. 45000",
        type: "number",
        hint: "Total capital needed to open and operate for 3 months.",
      },
      {
        id: "JP-22",
        label: "Startup cost breakdown",
        placeholder: "e.g. Equipment & coolers: $18k, First inventory: $12k, Lease deposit + first month: $6k, Legal & incorporation: $3k, Contingency: $6k.",
        type: "textarea",
        hint: "List the biggest line items.",
      },
      {
        id: "JP-23",
        label: "Monthly operating costs ($)",
        placeholder: "e.g. 11500",
        type: "number",
        hint: "Your expected monthly burn once open.",
      },
      {
        id: "JP-24",
        label: "Year 1 revenue target ($)",
        placeholder: "e.g. 180000",
        type: "number",
      },
      {
        id: "JP-25",
        label: "Year 2 revenue target ($)",
        placeholder: "e.g. 240000",
        type: "number",
      },
      {
        id: "JP-26",
        label: "Year 3 revenue target ($)",
        placeholder: "e.g. 300000",
        type: "number",
      },
      {
        id: "JP-27",
        label: "Expected break-even month",
        placeholder: "e.g. Month 9 — when monthly revenue covers all operating costs.",
        type: "text",
      },
      {
        id: "JP-28",
        label: "Funding plan",
        placeholder: "e.g. $15k member buy-in (6 members × $2,500), $20k MEDC small business grant, $10k personal savings.",
        type: "textarea",
        hint: "How will you fund the startup costs?",
      },
      {
        id: "JP-29",
        label: "Funding sources",
        placeholder: "e.g. Member equity, MEDC grant, Fledge micro-loan, self-funded.",
        type: "textarea",
        hint: "Types: grants, loans, equity investment, member buy-in, self-funded.",
      },
    ],
  },
  {
    id: "S6",
    title: "Team & Ownership",
    description: "Who's building this and how ownership is structured.",
    fields: [
      {
        id: "JP-30",
        label: "Number of founders",
        placeholder: "e.g. 4",
        type: "number",
      },
      {
        id: "JP-31",
        label: "Team description",
        placeholder: "e.g. 4 founding members: Maria (operations, 10 yrs retail), Devon (finance, bookkeeper), Rosa (sourcing, ran a catering business), James (tech + outreach).",
        type: "textarea",
        hint: "Who is on the founding team and what do they each bring?",
      },
      {
        id: "JP-32",
        label: "Ownership structure",
        placeholder: "e.g. Worker co-op LLC — each member owns an equal share, one vote.",
        type: "text",
        hint: "Sole proprietor, LLC, partnership, worker co-op, S-corp?",
      },
      {
        id: "JP-33",
        label: "Member buy-in amount",
        placeholder: "e.g. $2,500 per founding member, payable over 12 months.",
        type: "text",
        hint: "If co-op: how much does each member invest to join?",
      },
      {
        id: "JP-34",
        label: "Equity distribution plan",
        placeholder: "e.g. Equal shares for founding members. New members vest over 2 years of active participation.",
        type: "textarea",
        hint: "How is ownership divided? How do new members earn in?",
      },
      {
        id: "JP-35",
        label: "Year 3 team size target",
        placeholder: "e.g. 8 worker-owners full time, 4 part-time.",
        type: "text",
      },
    ],
  },
  {
    id: "S7",
    title: "Four Bottom Lines",
    description: "How you commit to People, Planet, Profit, and Ownership.",
    fields: [
      {
        id: "JP-36",
        label: "People commitments",
        placeholder: "e.g. All worker-owners earn at least $18/hr from day one. Full benefits by year 2. No member earns more than 4× the lowest-paid worker.",
        type: "textarea",
        hint: "Wages, benefits, working conditions, dignity practices.",
      },
      {
        id: "JP-37",
        label: "Living wage target ($/hr)",
        placeholder: "e.g. 18",
        type: "number",
        hint: "What is your minimum hourly wage for all workers?",
      },
      {
        id: "JP-38",
        label: "Planet commitments",
        placeholder: "e.g. Source 30% local within 1 year. Zero single-use plastic bags. Food waste composted with Urbandale Farm.",
        type: "textarea",
        hint: "Environmental practices, sourcing standards, waste reduction.",
      },
      {
        id: "JP-39",
        label: "Profit and surplus plan",
        placeholder: "e.g. 40% reinvested in operations, 30% distributed to members as patronage, 20% reserve fund, 10% community giving.",
        type: "textarea",
        hint: "How will you use profit or surplus? Reinvest, distribute, give back?",
      },
      {
        id: "JP-40",
        label: "Ownership commitments",
        placeholder: "e.g. Monthly member meetings, consensus-based major decisions, annual open books review with all members.",
        type: "textarea",
        hint: "Governance model — how do members have voice?",
      },
    ],
  },
  {
    id: "S8",
    title: "Partners & Ecosystem",
    description: "Who you work with and how you contribute to the broader community.",
    fields: [
      {
        id: "JP-41",
        label: "Key suppliers",
        placeholder: "e.g. Eastern Market Detroit (produce), Calder Dairy (dairy), MSU Extension (local growers network).",
        type: "textarea",
        hint: "Who do you buy from? Prioritize local and co-op sources.",
      },
      {
        id: "JP-42",
        label: "Community partners",
        placeholder: "e.g. The Fledge (coaching + space), YWCA (referrals), neighborhood church (distribution site).",
        type: "textarea",
        hint: "Organizations you work alongside.",
      },
      {
        id: "JP-43",
        label: "Collaborators",
        placeholder: "e.g. Lansing Food Bank (bulk donations), local restaurants (ready-made meal supply).",
        type: "textarea",
        hint: "Complementary businesses — you help each other.",
      },
      {
        id: "JP-44",
        label: "Co-op and mutual aid connections",
        placeholder: "e.g. Weaver Street Market (peer co-op, mentorship), Lansing Mutual Aid Network (referrals for food-insecure families).",
        type: "textarea",
        hint: "Other co-ops, credit unions, or mutual aid orgs in your ecosystem.",
      },
      {
        id: "JP-45",
        label: "Community impact",
        placeholder: "e.g. 4,200 households gain walkable food access. 8+ living-wage jobs created. Surplus stays in the neighborhood instead of leaving to investors.",
        type: "textarea",
        hint: "How is the broader community stronger because you exist?",
      },
    ],
  },
];

export const PLAN_FIELD_MAP: Record<string, string> = Object.fromEntries(
  JOURNEY_PLAN.flatMap((s) => s.fields.map((f) => [f.id, f.label]))
);
