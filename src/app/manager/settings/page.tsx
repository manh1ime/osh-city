import { SettingsForm } from "@/components/manager/SettingsForm";
import { requireManager } from "@/lib/auth";
import { getRestaurant } from "@/lib/restaurant";

export const dynamic = "force-dynamic";

export default async function ManagerSettingsPage() {
  await requireManager("settings");
  const restaurant = await getRestaurant();

  return (
    <SettingsForm
      values={{
        name: restaurant.name,
        description: restaurant.description,
        address: restaurant.address,
        logoUrl: restaurant.logoUrl,
        coverImageUrl: restaurant.coverImageUrl,
        primaryColor: restaurant.primaryColor,
        currency: restaurant.currency,
        isOrderingEnabled: restaurant.isOrderingEnabled,
      }}
    />
  );
}
