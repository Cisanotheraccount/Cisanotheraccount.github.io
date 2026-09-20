import type { ReactNode } from 'react';
import './shotflowPhoneFrame.css';

/** One handset geometry for the case, live walkthrough and enlarged captures. */
export function ShotFlowPhoneFrame({ children }: { children: ReactNode }) {
  return <div className="gxc-shotflow-phone-wrap">
    <div className="gxc-shotflow-phone">
      <div className="gxc-shotflow-phone-keys" aria-hidden="true"><i/><i/><i/><i/></div>
      <div className="gxc-shotflow-phone-display">
        {children}
        <div className="gxc-shotflow-phone-island" aria-hidden="true"/>
      </div>
    </div>
  </div>;
}
