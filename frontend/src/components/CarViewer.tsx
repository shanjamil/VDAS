/// <reference types="@react-three/fiber" />
import { useState, Suspense, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stage, useGLTF, OrbitControls, Html } from "@react-three/drei";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { ALL_PARTS, PART_META, type FaultPart } from "@/lib/parts";
import * as THREE from "three";

interface Props {
  faultyParts: FaultPart[];
  selectedPart: FaultPart | null;
  onSelectPart: (p: FaultPart) => void;
  autoRotate: boolean;
}

const DRACO_CDN = "https://www.gstatic.com/draco/versioned/decoders/1.5.7/";
const CAR_MODELS = ["/car1.glb", "/car2.glb", "/car3.glb"];

function LoadingSpinner() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Loading 3D Model…</p>
      </div>
    </Html>
  );
}

function GlbModel({ url }: { url: string }) {
  const { scene } = useGLTF(url, DRACO_CDN);
  return <primitive object={scene} />;
}

export const CarViewer = ({ autoRotate }: Props) => {
  const [carIndex, setCarIndex] = useState(0);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCarIndex((i) => (i - 1 + CAR_MODELS.length) % CAR_MODELS.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCarIndex((i) => (i + 1) % CAR_MODELS.length);
  };

  return (
    <div className="w-full h-full relative group">
      <Canvas shadows dpr={[1, 2]} camera={{ fov: 45 }}>
        <Suspense fallback={<LoadingSpinner />}>
          {/* Stage automatically centers, scales, and lights arbitrary GLB models beautifully */}
          <Stage environment="city" intensity={0.5} adjustCamera scale={1}>
            <GlbModel url={CAR_MODELS[carIndex]} />
          </Stage>
        </Suspense>
        <OrbitControls
          autoRotate={autoRotate}
          autoRotateSpeed={0.8}
          enableZoom={true}
          makeDefault
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.05}
        />
      </Canvas>

      {/* Navigation Arrows (Appear on hover) */}
      <button
        onClick={handlePrev}
        className="absolute left-3 lg:left-6 top-1/2 -translate-y-1/2 h-10 w-10 lg:h-12 lg:w-12 rounded-full glass card-shadow flex items-center justify-center text-foreground opacity-100 lg:opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-white active:scale-95 z-20"
      >
        <ChevronLeft className="h-5 w-5 lg:h-6 lg:w-6" />
      </button>
      <button
        onClick={handleNext}
        className="absolute right-3 lg:right-6 top-1/2 -translate-y-1/2 h-10 w-10 lg:h-12 lg:w-12 rounded-full glass card-shadow flex items-center justify-center text-foreground opacity-100 lg:opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-white active:scale-95 z-20"
      >
        <ChevronRight className="h-5 w-5 lg:h-6 lg:w-6" />
      </button>
    </div>
  );
};

// Preload the first model immediately for instant display
try {
  useGLTF.preload(CAR_MODELS[0], DRACO_CDN);
} catch (e) {
  console.warn("Failed to preload", CAR_MODELS[0]);
}

// Delay preloading the other models by 3 seconds so it doesn't compete with initial page load
if (typeof window !== "undefined") {
  window.setTimeout(() => {
    try {
      useGLTF.preload(CAR_MODELS[1], DRACO_CDN);
      useGLTF.preload(CAR_MODELS[2], DRACO_CDN);
    } catch (e) {
      // Ignore background preload errors
    }
  }, 3000);
}

export { ALL_PARTS, PART_META };
export type { FaultPart };

