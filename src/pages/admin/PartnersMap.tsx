import { RoleGuard } from "@/components/admin/RoleGuard";
import PartnerMap from "@/components/PartnerMap";

const PartnersMapContent = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Partner Locations</h1>
        <p className="text-muted-foreground">View all partner locations on the map</p>
      </div>

      <PartnerMap />
    </div>
  );
};

const PartnersMap = () => {
  return (
    <RoleGuard allowedRoles={['admin', 'manager', 'viewer']}>
      <PartnersMapContent />
    </RoleGuard>
  );
};

export default PartnersMap;