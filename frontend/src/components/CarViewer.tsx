/// <reference types="@react-three/fiber" />
import { useRef, useState, Suspense, useMemo } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { ALL_PARTS, PART_META, type FaultPart } from "@/lib/parts";

interface Props {
  faultyParts: FaultPart[];
  selectedPart: FaultPart | null;
  onSelectPart: (p: FaultPart) => void;
  autoRotate: boolean;
}

const FAULT_COLOR = new THREE.Color("#FF4757");
const SELECTED_COLOR = new THREE.Color("#00D4FF");
const PART_COLOR = new THREE.Color("#7d7da3");
const PAINT_COLOR = new THREE.Color("#1f3a8a");

function PartGroup({
  partKey,
  position,
  faulty,
  selected,
  onSelect,
  children,
}: {
  partKey: FaultPart;
  position: [number, number, number];
  faulty: boolean;
  selected: boolean;
  onSelect: (p: FaultPart) => void;
  children: React.ReactNode;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mat = m.material as THREE.MeshStandardMaterial;
      if (!mat || !("emissive" in mat)) return;
      if (faulty) {
        const pulse = 0.5 + Math.sin(clock.elapsedTime * 4) * 0.5;
        mat.color.copy(FAULT_COLOR);
        mat.emissive.copy(FAULT_COLOR);
        mat.emissiveIntensity = 0.4 + pulse * 0.6;
      } else if (selected) {
        mat.color.copy(SELECTED_COLOR);
        mat.emissive.copy(SELECTED_COLOR);
        mat.emissiveIntensity = 0.3;
      } else {
        mat.color.copy(hover ? SELECTED_COLOR : PART_COLOR);
        mat.emissive.set(0, 0, 0);
        mat.emissiveIntensity = 0;
      }
    });
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onSelect(partKey);
      }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHover(true);
        if (typeof document !== "undefined") document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHover(false);
        if (typeof document !== "undefined") document.body.style.cursor = "default";
      }}
    >
      {children}
    </group>
  );
}

function Wheel({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Tyre */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.34, 0.16, 16, 32]} />
        <meshStandardMaterial color="#0b0b12" roughness={0.95} metalness={0.05} />
      </mesh>
      {/* Rim */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.18, 24]} />
        <meshStandardMaterial color="#cfd3da" metalness={0.95} roughness={0.18} />
      </mesh>
      {/* Hub cap */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.2, 16]} />
        <meshStandardMaterial color="#1a1a22" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

function CarBody() {
  // Smooth rounded sedan body using shape extrusion (side profile).
  const bodyGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-1.9, 0.15);
    s.lineTo(-1.85, 0.05);
    s.lineTo(1.85, 0.05);
    s.lineTo(1.95, 0.2);
    s.lineTo(1.95, 0.55);
    s.lineTo(-1.9, 0.55);
    s.lineTo(-1.9, 0.15);
    const geo = new THREE.ExtrudeGeometry(s, {
      depth: 1.6,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.08,
      bevelSegments: 4,
      curveSegments: 12,
    });
    geo.translate(0, 0, -0.8);
    return geo;
  }, []);

  // Cabin/greenhouse — trapezoidal roof.
  const cabinGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.95, 0);
    s.lineTo(0.85, 0);
    s.lineTo(0.65, 0.45);
    s.lineTo(-0.75, 0.45);
    s.lineTo(-0.95, 0);
    const geo = new THREE.ExtrudeGeometry(s, {
      depth: 1.4,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 3,
    });
    geo.translate(0, 0, -0.7);
    return geo;
  }, []);

  return (
    <group>
      {/* Painted body */}
      <mesh geometry={bodyGeo} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={PAINT_COLOR}
          metalness={0.85}
          roughness={0.25}
          clearcoat={1}
          clearcoatRoughness={0.08}
        />
      </mesh>
      {/* Cabin glass */}
      <mesh geometry={cabinGeo} position={[0.05, 0.55, 0]} castShadow>
        <meshPhysicalMaterial
          color="#0a1020"
          metalness={0.3}
          roughness={0.05}
          transmission={0.55}
          transparent
          opacity={0.85}
          clearcoat={1}
        />
      </mesh>
      {/* Hood detail line */}
      <mesh position={[1.45, 0.56, 0]}>
        <boxGeometry args={[0.85, 0.005, 1.4]} />
        <meshStandardMaterial color="#0e0e18" />
      </mesh>
      {/* Headlights */}
      <mesh position={[1.96, 0.38, 0.55]}>
        <boxGeometry args={[0.04, 0.12, 0.28]} />
        <meshStandardMaterial color="#fff8e0" emissive="#fff5d0" emissiveIntensity={1.4} />
      </mesh>
      <mesh position={[1.96, 0.38, -0.55]}>
        <boxGeometry args={[0.04, 0.12, 0.28]} />
        <meshStandardMaterial color="#fff8e0" emissive="#fff5d0" emissiveIntensity={1.4} />
      </mesh>
      {/* Taillights */}
      <mesh position={[-1.91, 0.38, 0.55]}>
        <boxGeometry args={[0.04, 0.1, 0.26]} />
        <meshStandardMaterial color="#ff2030" emissive="#ff2030" emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[-1.91, 0.38, -0.55]}>
        <boxGeometry args={[0.04, 0.1, 0.26]} />
        <meshStandardMaterial color="#ff2030" emissive="#ff2030" emissiveIntensity={0.9} />
      </mesh>
      {/* Grille */}
      <mesh position={[1.96, 0.22, 0]}>
        <boxGeometry args={[0.03, 0.12, 0.7]} />
        <meshStandardMaterial color="#0b0b12" metalness={0.6} roughness={0.5} />
      </mesh>
    </group>
  );
}

function Car({ faultyParts, selectedPart, onSelectPart }: Omit<Props, "autoRotate">) {
  const isFaulty = (p: FaultPart) => faultyParts.includes(p);
  const isSelected = (p: FaultPart) => selectedPart === p;

  return (
    <group position={[0, -0.05, 0]}>
      <CarBody />

      <PartGroup partKey="engine" position={[1.45, 0.7, 0]} faulty={isFaulty("engine")} selected={isSelected("engine")} onSelect={onSelectPart}>
        <mesh>
          <boxGeometry args={[0.55, 0.18, 0.95]} />
          <meshStandardMaterial color={PART_COLOR} roughness={0.5} metalness={0.6} />
        </mesh>
      </PartGroup>

      <PartGroup partKey="battery" position={[1.5, 0.7, -0.55]} faulty={isFaulty("battery")} selected={isSelected("battery")} onSelect={onSelectPart}>
        <mesh>
          <boxGeometry args={[0.28, 0.14, 0.22]} />
          <meshStandardMaterial color={PART_COLOR} />
        </mesh>
      </PartGroup>

      <PartGroup partKey="transmission" position={[0.4, 0.18, 0]} faulty={isFaulty("transmission")} selected={isSelected("transmission")} onSelect={onSelectPart}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.16, 0.16, 0.7, 16]} />
          <meshStandardMaterial color={PART_COLOR} metalness={0.7} roughness={0.4} />
        </mesh>
      </PartGroup>

      <PartGroup partKey="ac" position={[0.6, 0.66, 0.4]} faulty={isFaulty("ac")} selected={isSelected("ac")} onSelect={onSelectPart}>
        <mesh>
          <boxGeometry args={[0.32, 0.16, 0.26]} />
          <meshStandardMaterial color={PART_COLOR} />
        </mesh>
      </PartGroup>

      <PartGroup partKey="exhaust" position={[-1.95, 0.18, -0.45]} faulty={isFaulty("exhaust")} selected={isSelected("exhaust")} onSelect={onSelectPart}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.06, 0.06, 0.5, 16]} />
          <meshStandardMaterial color={PART_COLOR} metalness={0.85} roughness={0.25} />
        </mesh>
      </PartGroup>

      <PartGroup partKey="suspension" position={[0, 0, 0]} faulty={isFaulty("suspension")} selected={isSelected("suspension")} onSelect={onSelectPart}>
        {[
          [1.2, 0.18, 0.7],
          [1.2, 0.18, -0.7],
          [-1.2, 0.18, 0.7],
          [-1.2, 0.18, -0.7],
        ].map((p, i) => (
          <mesh key={i} position={p as [number, number, number]}>
            <cylinderGeometry args={[0.05, 0.05, 0.3, 8]} />
            <meshStandardMaterial color={PART_COLOR} metalness={0.5} />
          </mesh>
        ))}
      </PartGroup>

      <PartGroup partKey="brakes" position={[0, 0, 0]} faulty={isFaulty("brakes")} selected={isSelected("brakes")} onSelect={onSelectPart}>
        {[
          [1.2, 0.05, 0.78],
          [1.2, 0.05, -0.78],
          [-1.2, 0.05, 0.78],
          [-1.2, 0.05, -0.78],
        ].map((p, i) => (
          <mesh key={i} position={p as [number, number, number]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.05, 18]} />
            <meshStandardMaterial color={PART_COLOR} metalness={0.7} />
          </mesh>
        ))}
      </PartGroup>

      <PartGroup partKey="tyres" position={[0, 0, 0]} faulty={isFaulty("tyres")} selected={isSelected("tyres")} onSelect={onSelectPart}>
        <Wheel position={[1.2, 0.05, 0.85]} />
        <Wheel position={[1.2, 0.05, -0.85]} />
        <Wheel position={[-1.2, 0.05, 0.85]} />
        <Wheel position={[-1.2, 0.05, -0.85]} />
      </PartGroup>
    </group>
  );
}

export const CarViewer = ({ faultyParts, selectedPart, onSelectPart, autoRotate }: Props) => {
  return (
    <Canvas shadows camera={{ position: [4.8, 2.6, 5.6], fov: 38 }} dpr={[1, 2]}>
      <ambientLight intensity={0.35} />
      <directionalLight position={[6, 8, 4]} intensity={0.9} castShadow />
      <directionalLight position={[-6, 4, -4]} intensity={0.3} color={"#00D4FF"} />
      <Suspense fallback={null}>
        <Environment preset="city" />
        <Car faultyParts={faultyParts} selectedPart={selectedPart} onSelectPart={onSelectPart} />
        <ContactShadows position={[0, -0.05, 0]} opacity={0.55} scale={10} blur={2.4} far={3} />
      </Suspense>
      <OrbitControls
        enablePan={false}
        enableZoom
        enableRotate
        autoRotate={autoRotate}
        autoRotateSpeed={0.8}
        minDistance={3}
        maxDistance={14}
        maxPolarAngle={Math.PI / 2.05}
      />
    </Canvas>
  );
};

export { ALL_PARTS, PART_META };
export type { FaultPart };
