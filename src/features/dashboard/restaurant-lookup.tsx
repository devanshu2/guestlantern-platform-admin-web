"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { uuidSchema } from "@/lib/validation/platform";

export function RestaurantLookup() {
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const result = uuidSchema.safeParse(restaurantId);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Enter a valid restaurant UUID.");
      return;
    }
    router.push(`/restaurants/${result.data}`);
  }

  return (
    <form className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start" onSubmit={onSubmit}>
      <Field
        label="Restaurant UUID"
        name="restaurant_id"
        value={restaurantId}
        onChange={(event) => {
          setRestaurantId(event.target.value);
          setError(null);
        }}
        helper="Use the tenant ID returned by provisioning or shown in a job row. Example: 33333333-3333-4333-8333-333333333333."
        error={error ?? undefined}
      />
      <Button type="submit" className="sm:mt-6" icon={<Search aria-hidden className="h-4 w-4" />}>
        Open summary
      </Button>
    </form>
  );
}
