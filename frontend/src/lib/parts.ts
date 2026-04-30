export type FaultPart =
  | "engine"
  | "battery"
  | "brakes"
  | "suspension"
  | "transmission"
  | "exhaust"
  | "ac"
  | "tyres";

export interface Fault {
  name: string;
  confidence: number;
  description: string;
}

export interface DiagnosticResult {
  faults: Fault[];
  probable_causes: string[];
  recommended_actions: string[];
  urgency: "Critical" | "Moderate" | "Low";
  estimated_cost_pkr: { min: number; max: number };
  affected_parts: string[];
}

export const PART_META: Record<FaultPart, { label: string; description: string; commonFaults: string[]; avgCost: string }> = {
  engine: {
    label: "Engine",
    description: "The heart of your vehicle. Converts fuel into motion.",
    commonFaults: ["Misfiring", "Overheating", "Oil leaks", "Knocking noise"],
    avgCost: "PKR 8,000 – 120,000",
  },
  battery: {
    label: "Battery",
    description: "Powers electrical systems and starts the engine.",
    commonFaults: ["Dead cells", "Corroded terminals", "Slow cranking"],
    avgCost: "PKR 12,000 – 28,000",
  },
  brakes: {
    label: "Brakes",
    description: "Slows and stops your vehicle safely.",
    commonFaults: ["Worn pads", "Low fluid", "Squealing", "Spongy pedal"],
    avgCost: "PKR 5,000 – 35,000",
  },
  suspension: {
    label: "Suspension",
    description: "Absorbs road shocks and keeps tyres on the road.",
    commonFaults: ["Worn shocks", "Broken struts", "Bushing wear"],
    avgCost: "PKR 10,000 – 60,000",
  },
  transmission: {
    label: "Transmission",
    description: "Transfers engine power to the wheels.",
    commonFaults: ["Slipping gears", "Hard shifting", "Fluid leaks"],
    avgCost: "PKR 15,000 – 250,000",
  },
  exhaust: {
    label: "Exhaust",
    description: "Routes burnt gases away from the engine.",
    commonFaults: ["Holes / leaks", "Loud rumble", "Catalytic converter failure"],
    avgCost: "PKR 6,000 – 45,000",
  },
  ac: {
    label: "AC System",
    description: "Cools the cabin and demists the windshield.",
    commonFaults: ["Low refrigerant", "Compressor failure", "Weak airflow"],
    avgCost: "PKR 4,000 – 50,000",
  },
  tyres: {
    label: "Tyres",
    description: "The only contact between your car and the road.",
    commonFaults: ["Uneven wear", "Low pressure", "Sidewall damage"],
    avgCost: "PKR 8,000 – 60,000",
  },
};

export const ALL_PARTS = Object.keys(PART_META) as FaultPart[];

export const partMatchesFault = (part: FaultPart, faults: string[]): boolean => {
  const p = part.toLowerCase();
  return faults.some((f) => f.toLowerCase().includes(p) || p.includes(f.toLowerCase()));
};
