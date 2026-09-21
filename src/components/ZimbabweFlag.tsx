export function ZimbabweFlag({
  className = "",
  title = "Flag of Zimbabwe",
  animated = false,
}: {
  className?: string;
  title?: string;
  animated?: boolean;
}) {
  if (!animated) {
    return <img alt={title} className={`zw-flag shrink-0 ${className}`.trim()} src="/zimbabwe-flag.svg" />;
  }

  return (
    <div aria-label={title} className={`zw-flag-fly ${className}`.trim()} role="img">
      <svg aria-hidden="true" className="zw-flag-filters" height="0" width="0">
        <filter height="140%" id="zw-wave" width="130%" x="-8%" y="-20%">
          <feTurbulence
            baseFrequency="0.006 0.035"
            numOctaves="1"
            result="ripple"
            seed="2"
            type="turbulence"
          >
            <animate
              attributeName="baseFrequency"
              dur="5s"
              repeatCount="indefinite"
              values="0.005 0.028;0.008 0.048;0.005 0.028"
            />
          </feTurbulence>
          <feDisplacementMap
            in="SourceGraphic"
            in2="ripple"
            scale="5"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>
      <span aria-hidden="true" className="zw-flag-pole" />
      <span aria-hidden="true" className="zw-flag-cloth">
        <img alt="" src="/zimbabwe-flag.svg" />
      </span>
    </div>
  );
}
