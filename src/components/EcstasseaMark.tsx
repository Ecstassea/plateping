const CRESCENT =
  "M258.013,102.761C388.292,13.9374,466.965,-1.84792,624.513,0.760538C518.978,22.9495,476.35,53.4978,417.013,126.261c-64.349,98.533-83.208,164.279-91.5,296.999-1.211,148.219,4.375,230.877,40,376.501-23.504,35.395-36.756,53.329-60.5,82.5-58.738,66.418-85.207,89.46-116,94.5-24.243,3.767-35.632,2.272-51-8.5-14.604-12.142-18.565-26.198-11.5-75.5c4.521-26.434-1.101-42.496-42.9997-76-11.9412-11.814-9.2198-19.988,16.4997-38c12.118-10.86,12.518-14.937-6.4997-16-10.2154-.51-15.9128-1.17-25.5-9.5-1.8345-13.149-.8774-21.605,10.5-41c9.132-16.223,12.0703-24.124-10.5-23-15.6847-1.48-24.7367-2.74-41.5-6-15.5401-5.708-23.13905-9.909-25.999994-27c8.651754-26.74,27.320594-48.536,73.999994-94c14.2768-17.054,20.789-33.814,25.4997-97.001c3.191-74.922,8.887-114.532,27.5-180c33.86-83.479,62.462-123.433,130.5-182.499Z";

const ASPECT = 1487 / 980;

const CIRCUITS = [
  "M946.513,234.76 L846.513,234.76 L778.013,169.26 L424.013,169.26 L421.013,187.76 L770.013,187.76 L837.013,253.76 L946.513,253.76",
  "M1205.51,355.26 L748.513,355.26 L671.013,278.26 L377.513,278.26 L373.513,297.76 L663.513,297.76 L740.513,374.26 L1205.51,374.26",
  "M1421.51,520.76 L1010.01,520.76 L925.013,435.76 L643.513,435.76 L601.013,475.26 L354.513,475.26 L354.513,493.76 L608.013,493.76 L651.013,453.76 L917.013,453.76 L998.513,539.76 L1421.51,539.76",
  "M854.013,530.761 L672.513,530.761 L600.013,598.761 L366.013,598.761 L366.013,616.761 L611.513,616.761 L681.513,549.261 L854.013,549.261",
  "M1088.51,648.261 L916.513,648.261 L845.013,722.761 L383.013,722.761 L385.513,743.761 L851.013,743.761 L925.513,667.261 L1088.51,667.261",
] as const;

const NODES = [
  { cx: 979.013, cy: 243.76, r: 32 },
  { cx: 1235.01, cy: 364.76, r: 32 },
  { cx: 1454.01, cy: 530.76, r: 32 },
  { cx: 886.013, cy: 539.76, r: 32 },
  { cx: 1121.01, cy: 655.76, r: 32 },
] as const;

export function EcstasseaMark({
  size = 40,
  color = "#E85D24",
  instanceId = "ecs",
  className = "",
}: {
  size?: number;
  color?: string;
  instanceId?: string;
  className?: string;
}) {
  const gradId = `${instanceId}-fade`;
  const maskId = `${instanceId}-mask`;
  const glowId = `${instanceId}-glow`;
  const width = Math.round(size * ASPECT);

  return (
    <svg
      aria-label="Ecstassea"
      className={`ecstassea-mark ${className}`.trim()}
      height={size}
      overflow="visible"
      role="img"
      style={{ ["--ai-color" as string]: color }}
      viewBox="0 0 1487 980"
      width={width}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient cx="28%" cy="48%" id={gradId}>
          <stop offset="58%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0.55" />
        </radialGradient>
        <mask id={maskId}>
          <rect fill={`url(#${gradId})`} height="980" width="1487" x="0" y="0" />
        </mask>
        <filter id={glowId} x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="3" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path className="ecs-crescent" d={CRESCENT} />
      <g mask={`url(#${maskId})`}>
        {CIRCUITS.map((d) => (
          <path className="ecs-track" d={d} key={`track-${d.slice(0, 22)}`} />
        ))}
        <g filter={`url(#${glowId})`}>
          {CIRCUITS.map((d) => (
            <path className="ecs-line" d={d} key={`flow-${d.slice(0, 22)}`} />
          ))}
        </g>
        {NODES.map((node) => (
          <circle className="ecs-node" cx={node.cx} cy={node.cy} key={`${node.cx}-${node.cy}`} r={node.r} />
        ))}
      </g>
    </svg>
  );
}
