import { RestaurantSummaryPage } from "@/features/restaurants/restaurant-summary-page";

export default async function Page({ params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await params;
  return <RestaurantSummaryPage restaurantId={restaurantId} />;
}
