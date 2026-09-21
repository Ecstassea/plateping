/**
 * A still picture of what the product does: the alert as it lands on a phone,
 * and the watched plates behind it. Pure markup and CSS, nothing to load.
 */
export function HeroPhone() {
  return (
    <div aria-hidden="true" className="phone-mock">
      <div className="phone-screen">
        <div className="phone-status">
          <span>09:41</span>
          <span className="phone-status-icons">
            <i />
            <i />
            <i />
          </span>
        </div>

        <div className="phone-notif">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" className="phone-notif-icon" height={36} src="/icon-192.png" width={36} />
          <div className="min-w-0">
            <p className="phone-notif-meta">
              <span>PlatePing</span>
              <span>now</span>
            </p>
            <p className="phone-notif-title">ADX 5897 is on a ZRP camera list</p>
            <p className="phone-notif-body">Listed 17 May 2025, Harare CBD. Report to ZRP National Traffic. Not a payment request.</p>
          </div>
        </div>

        <div className="phone-app">
          <p className="phone-app-title">Watched plates</p>
          <p className="phone-app-sub">3 plates · Family plan</p>
          <ul className="phone-rows">
            <li>
              <span className="phone-plate">ADX 5897</span>
              <span className="phone-label">Dad&apos;s Fortuner</span>
              <span className="phone-state phone-state-bad">On a ZRP camera list</span>
            </li>
            <li>
              <span className="phone-plate">AEQ 2231</span>
              <span className="phone-label">Work Hilux</span>
              <span className="phone-state phone-state-ok">Not on any current list</span>
            </li>
            <li>
              <span className="phone-plate">ABJ 0418</span>
              <span className="phone-label">Mum&apos;s Vitz</span>
              <span className="phone-state phone-state-ok">Not on any current list</span>
            </li>
          </ul>
          <div className="phone-tabs">
            <span>Home</span>
            <span className="phone-tab-active">Plates</span>
            <span>Alerts</span>
            <span>Team</span>
            <span>Plan</span>
          </div>
        </div>
      </div>
    </div>
  );
}
