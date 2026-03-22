"use client";

import {
  useTopPages,
  useTopReferrers,
  useDeviceBreakdown,
  useCountryBreakdown,
} from "@/hooks/useStats";
import BreakdownTable from "./BreakdownTable";
import IdentificationCard from "./IdentificationCard";

export default function AdvancedView({ siteId }: { siteId: string }) {
  const pages = useTopPages(siteId);
  const referrers = useTopReferrers(siteId);
  const devices = useDeviceBreakdown(siteId);
  const countries = useCountryBreakdown(siteId);

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
      <BreakdownTable title="Top Pages" rows={pages.data ?? []} loading={pages.isLoading} />
      <BreakdownTable title="Referrers" rows={referrers.data ?? []} loading={referrers.isLoading} />
      <BreakdownTable title="Devices" rows={devices.data ?? []} loading={devices.isLoading} />
      <BreakdownTable title="Countries" rows={countries.data ?? []} loading={countries.isLoading} />
      <IdentificationCard siteId={siteId} />
    </div>
  );
}
