import FlowerIcon from "@/components/FlowerIcon";

interface FlowerClusterProps {
  className?: string;
}

/** A loose little bouquet — three flowers in the deck's coral/mint/gold
 * trio, for decorative use around hero copy and section breaks. */
export default function FlowerCluster({ className }: FlowerClusterProps) {
  return (
    <div className={`relative ${className ?? ""}`} aria-hidden="true">
      <FlowerIcon
        className="absolute left-0 top-2 h-10 w-10 -rotate-12 opacity-90"
        petalColor="#2FE39B"
        centerColor="#F5B841"
      />
      <FlowerIcon
        className="absolute left-7 top-0 h-14 w-14 rotate-6"
        petalColor="#FF7A59"
        centerColor="#F5B841"
      />
      <FlowerIcon
        className="absolute left-16 top-3 h-8 w-8 rotate-12 opacity-80"
        petalColor="#F5B841"
        centerColor="#FF7A59"
      />
    </div>
  );
}
