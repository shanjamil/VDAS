import type { DiagnosticResult } from "./parts";

export const DEMO_RESULT: DiagnosticResult = {
  faults: [
    {
      name: "Worn Brake Pads",
      confidence: 92,
      description: "Friction material on the front brake pads is below safe thickness, causing squealing on braking.",
    },
    {
      name: "Glazed Brake Rotors",
      confidence: 67,
      description: "Heat-glazed rotor surface reduces stopping power and amplifies pad noise.",
    },
  ],
  probable_causes: [
    "Extended use beyond pad service life (~40,000 km)",
    "Frequent stop-and-go city driving",
    "Low-quality replacement pads installed previously",
  ],
  recommended_actions: [
    "Replace front brake pads with OEM-grade ceramic set",
    "Resurface or replace front rotors if scored",
    "Bleed brake fluid and inspect caliper slides",
    "Test drive and re-torque wheel lug nuts",
  ],
  urgency: "Moderate",
  estimated_cost_pkr: { min: 9000, max: 18000 },
  affected_parts: ["brakes"],
};

export interface MechanicData {
  id: string;
  name: string;
  distance_km: number;
  phone: string;
  specialties: string[];
  lat: number;
  lng: number;
  address: string;
}

export const FALLBACK_MECHANICS: MechanicData[] = [
  {
    id: "m1",
    name: "AutoCare Garage",
    distance_km: 1.2,
    phone: "+92 300 1234567",
    specialties: ["Brakes", "Suspension"],
    lat: 31.5204,
    lng: 74.3587,
    address: "Main Boulevard, Lahore",
  },
  {
    id: "m2",
    name: "Speedy Motors Workshop",
    distance_km: 2.7,
    phone: "+92 321 7654321",
    specialties: ["Engine", "Brakes", "AC"],
    lat: 31.5314,
    lng: 74.3437,
    address: "Ferozepur Road, Lahore",
  },
  {
    id: "m3",
    name: "Precision Auto Hub",
    distance_km: 3.4,
    phone: "+92 333 9988776",
    specialties: ["Brakes", "Diagnostics", "Tyres"],
    lat: 31.5104,
    lng: 74.3687,
    address: "Mall Road, Lahore",
  },
];

export interface MockGuide {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  time: string;
  tools: string[];
  steps: string[];
}

export const MOCK_GUIDES: MockGuide[] = [
  {
    id: "g1",
    title: "Inspect Brake Pad Thickness",
    difficulty: "Easy",
    time: "15 min",
    tools: ["Jack", "Lug wrench", "Flashlight"],
    steps: [
      "Loosen lug nuts and safely raise the front of the vehicle.",
      "Remove the wheel to expose the brake caliper and rotor.",
      "Visually measure pad thickness - replace if under 3 mm.",
    ],
  },
  {
    id: "g2",
    title: "Replace Front Brake Pads",
    difficulty: "Medium",
    time: "60 min",
    tools: ["Socket set", "C-clamp", "Brake grease"],
    steps: [
      "Remove caliper bolts and lift the caliper aside (do not let it hang).",
      "Slide out the worn pads; compress the piston with a C-clamp.",
      "Install new pads with shim grease, refit caliper, and torque to spec.",
    ],
  },
  {
    id: "g3",
    title: "Bed-In New Brakes Properly",
    difficulty: "Easy",
    time: "20 min",
    tools: ["Open road"],
    steps: [
      "Perform 6-8 moderate stops from 60 -> 20 km/h with light pedal pressure.",
      "Follow with 2-3 firmer stops from 80 -> 20 km/h without coming to a halt.",
      "Allow brakes to cool fully without sitting on the pedal.",
    ],
  },
];
