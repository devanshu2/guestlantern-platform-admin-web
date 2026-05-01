"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink, RefreshCcw, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState } from "@/components/ui/data-state";
import { Field, SelectField } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import { TableFrame } from "@/components/ui/table-frame";
import { platformApi } from "@/lib/api/client";
import { useLoader } from "@/lib/api/hooks";
import { formatDateTime } from "@/lib/api/status";
import type { Page, RestaurantDirectoryItem } from "@/lib/api/types";

const statuses = ["all", "draft", "provisioning", "active", "suspended", "disabled"];
const perPage = 25;
const sortFields = [
  "updated_at",
  "created_at",
  "display_name",
  "slug",
  "status",
  "owner_email",
  "primary_host",
  "latest_job_updated_at"
] as const;
type RestaurantSortBy = (typeof sortFields)[number];
type SortDir = "asc" | "desc";

const sortLabels: Record<RestaurantSortBy, string> = {
  updated_at: "Updated",
  created_at: "Created",
  display_name: "Restaurant",
  slug: "Slug",
  status: "Status",
  owner_email: "Owner",
  primary_host: "Host",
  latest_job_updated_at: "Latest job"
};

const tableHeaders: Array<{ label: string; sortBy?: RestaurantSortBy; className?: string }> = [
  { label: "Restaurant", sortBy: "display_name" },
  { label: "Status", sortBy: "status" },
  { label: "Owner", sortBy: "owner_email" },
  { label: "Host", sortBy: "primary_host" },
  { label: "Latest job", sortBy: "latest_job_updated_at" },
  { label: "Updated", sortBy: "updated_at" },
  { label: "Open", className: "w-28" }
];

function isSortBy(value: string): value is RestaurantSortBy {
  return sortFields.includes(value as RestaurantSortBy);
}

function normalizeSortBy(value: string | null): RestaurantSortBy {
  return value && isSortBy(value) ? value : "updated_at";
}

function normalizeSortDir(value: string | null): SortDir {
  return value === "asc" || value === "desc" ? value : "desc";
}

function defaultSortDirFor(sortBy: RestaurantSortBy): SortDir {
  return sortBy === "updated_at" || sortBy === "created_at" || sortBy === "latest_job_updated_at"
    ? "desc"
    : "asc";
}

function statusLabel(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function directoryHref(
  page: number,
  q: string,
  status: string,
  sortBy: RestaurantSortBy,
  sortDir: SortDir
) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status !== "all") params.set("status", status);
  params.set("sort_by", sortBy);
  params.set("sort_dir", sortDir);
  params.set("page", String(page));
  return `/restaurants?${params.toString()}`;
}

function directoryPath(
  page: number,
  q: string,
  status: string,
  sortBy: RestaurantSortBy,
  sortDir: SortDir
) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("per_page", String(perPage));
  if (q) params.set("q", q);
  if (status !== "all") params.set("status", status);
  params.set("sort_by", sortBy);
  params.set("sort_dir", sortDir);
  return `/restaurants?${params.toString()}`;
}

function shortRestaurantId(id: string) {
  return `${id.slice(0, 8)}...${id.slice(-4)}`;
}

function sortIcon(active: boolean, sortDir: SortDir) {
  if (!active) return <ArrowUpDown aria-hidden className="h-3.5 w-3.5" />;
  return sortDir === "asc" ? (
    <ArrowUp aria-hidden className="h-3.5 w-3.5" />
  ) : (
    <ArrowDown aria-hidden className="h-3.5 w-3.5" />
  );
}

function SortHeader({
  label,
  sortBy,
  activeSortBy,
  activeSortDir,
  onSort
}: {
  label: string;
  sortBy: RestaurantSortBy;
  activeSortBy: RestaurantSortBy;
  activeSortDir: SortDir;
  onSort: (sortBy: RestaurantSortBy) => void;
}) {
  const active = sortBy === activeSortBy;
  return (
    <button
      type="button"
      className={`inline-flex min-h-8 appearance-none items-center gap-1 whitespace-nowrap rounded-md border border-transparent bg-transparent px-1.5 text-left text-xs font-bold uppercase tracking-wide transition hover:bg-surface-raised hover:text-ink ${
        active ? "text-ink" : "text-muted"
      }`}
      aria-label={`Sort by ${label.toLowerCase()}`}
      onClick={() => onSort(sortBy)}
    >
      <span>{label}</span>
      {sortIcon(active, activeSortDir)}
    </button>
  );
}

function DirectoryTable({
  restaurants,
  sortBy,
  sortDir,
  onSort
}: {
  restaurants: RestaurantDirectoryItem[];
  sortBy: RestaurantSortBy;
  sortDir: SortDir;
  onSort: (sortBy: RestaurantSortBy) => void;
}) {
  if (restaurants.length === 0) {
    return (
      <EmptyState title="No restaurants found">
        No restaurants match the current search and status filters.
      </EmptyState>
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {restaurants.map((restaurant) => (
          <article
            key={restaurant.restaurant_id}
            data-testid="restaurant-directory-row"
            className="rounded-lg border border-line bg-surface-raised p-3 shadow-control"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-ink">
                  {restaurant.display_name}
                </h3>
                <p className="mt-1 truncate text-xs text-muted">{restaurant.slug}</p>
              </div>
              <StatusBadge status={restaurant.status} />
            </div>
            <dl className="mt-3 grid gap-2 text-xs text-muted">
              <div>
                <dt className="font-semibold uppercase tracking-wide">Owner</dt>
                <dd className="mt-1 truncate">{restaurant.owner_email ?? "No owner email"}</dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide">Host</dt>
                <dd className="mt-1 truncate">{restaurant.primary_host ?? "No primary host"}</dd>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <dt className="font-semibold uppercase tracking-wide">Updated</dt>
                  <dd className="mt-1">{formatDateTime(restaurant.updated_at)}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wide">Latest job</dt>
                  <dd className="mt-1">
                    {restaurant.latest_provisioning_job_status ? (
                      <StatusBadge status={restaurant.latest_provisioning_job_status} />
                    ) : (
                      "No jobs"
                    )}
                  </dd>
                </div>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-wide">ID</dt>
                <dd className="mt-1 font-mono">{shortRestaurantId(restaurant.restaurant_id)}</dd>
              </div>
            </dl>
            <div className="mt-3 flex flex-wrap gap-3 border-t border-line pt-3">
              <Link
                className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
                href={`/restaurants/${restaurant.restaurant_id}`}
              >
                Summary <ExternalLink aria-hidden className="h-3.5 w-3.5" />
              </Link>
              {restaurant.latest_provisioning_job_id ? (
                <Link
                  className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
                  href={`/jobs/${restaurant.latest_provisioning_job_id}`}
                >
                  Job <ExternalLink aria-hidden className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      <div className="hidden md:block">
        <TableFrame>
          <table className="data-table w-full table-fixed [&_td]:px-2 [&_th]:px-2">
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[9%]" />
              <col className="w-[15%]" />
              <col className="w-[15%]" />
              <col className="w-[13%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead>
              <tr>
                {tableHeaders.map((header) => (
                  <th
                    key={header.label}
                    className={header.className}
                    aria-sort={
                      header.sortBy && header.sortBy === sortBy
                        ? sortDir === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                  >
                    {header.sortBy ? (
                      <SortHeader
                        label={header.label}
                        sortBy={header.sortBy}
                        activeSortBy={sortBy}
                        activeSortDir={sortDir}
                        onSort={onSort}
                      />
                    ) : (
                      header.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {restaurants.map((restaurant) => (
                <tr key={restaurant.restaurant_id} data-testid="restaurant-directory-row">
                  <td>
                    <div className="truncate font-medium text-ink" title={restaurant.display_name}>
                      {restaurant.display_name}
                    </div>
                    <div className="mt-1 truncate text-xs text-muted" title={restaurant.slug}>
                      {restaurant.slug}
                    </div>
                    <div
                      className="mt-1 truncate font-mono text-xs text-muted"
                      title={restaurant.restaurant_id}
                    >
                      {shortRestaurantId(restaurant.restaurant_id)}
                    </div>
                    <div
                      className="mt-1 truncate text-xs text-muted"
                      title={restaurant.external_code}
                    >
                      {restaurant.external_code}
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={restaurant.status} />
                  </td>
                  <td className="text-xs text-muted">
                    <div className="truncate" title={restaurant.owner_email ?? undefined}>
                      {restaurant.owner_email ?? "No owner email"}
                    </div>
                  </td>
                  <td className="text-xs text-muted">
                    <div className="truncate" title={restaurant.primary_host ?? undefined}>
                      {restaurant.primary_host ?? "No primary host"}
                    </div>
                  </td>
                  <td className="text-xs text-muted">
                    {restaurant.latest_provisioning_job_status ? (
                      <>
                        <StatusBadge status={restaurant.latest_provisioning_job_status} />
                        <div className="mt-2 whitespace-nowrap">
                          {formatDateTime(restaurant.latest_provisioning_job_updated_at)}
                        </div>
                      </>
                    ) : (
                      "No jobs"
                    )}
                  </td>
                  <td className="whitespace-nowrap text-xs text-muted">
                    {formatDateTime(restaurant.updated_at)}
                  </td>
                  <td>
                    <div className="flex flex-col gap-2">
                      <Link
                        className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-brand hover:underline"
                        href={`/restaurants/${restaurant.restaurant_id}`}
                      >
                        Summary <ExternalLink aria-hidden className="h-3.5 w-3.5" />
                      </Link>
                      {restaurant.latest_provisioning_job_id ? (
                        <Link
                          className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-brand hover:underline"
                          href={`/jobs/${restaurant.latest_provisioning_job_id}`}
                        >
                          Job <ExternalLink aria-hidden className="h-3.5 w-3.5" />
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableFrame>
      </div>
    </>
  );
}

export function RestaurantDirectoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim();
  const status = searchParams.get("status") ?? "all";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const sortBy = normalizeSortBy(searchParams.get("sort_by"));
  const sortDir = normalizeSortDir(searchParams.get("sort_dir"));
  const [searchValue, setSearchValue] = useState(q);
  const apiPath = useMemo(
    () => directoryPath(page, q, status, sortBy, sortDir),
    [page, q, status, sortBy, sortDir]
  );
  const restaurants = useLoader<Page<RestaurantDirectoryItem>>(
    (signal) => platformApi(apiPath, { signal }),
    [apiPath]
  );

  useEffect(() => {
    setSearchValue(q);
  }, [q]);

  function runSearch(event: FormEvent) {
    event.preventDefault();
    const nextQuery = searchValue.trim();
    router.push(directoryHref(1, nextQuery, status, sortBy, sortDir));
  }

  function setStatus(nextStatus: string) {
    router.push(directoryHref(1, q, nextStatus, sortBy, sortDir));
  }

  function setSort(nextSortBy: RestaurantSortBy) {
    const nextSortDir =
      nextSortBy === sortBy ? (sortDir === "asc" ? "desc" : "asc") : defaultSortDirFor(nextSortBy);
    router.push(directoryHref(1, q, status, nextSortBy, nextSortDir));
  }

  const totalPages = restaurants.data
    ? Math.max(1, Math.ceil(restaurants.data.total / restaurants.data.per_page))
    : 1;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Tenant directory"
        title="Restaurants"
        description="Find restaurants by name, slug, external code, owner email, primary host, or UUID. Open summaries for repair details and keep provisioning work in Jobs."
        actions={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => restaurants.reload()}
              icon={<RefreshCcw aria-hidden className="h-4 w-4" />}
            >
              Refresh
            </Button>
            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-brand px-3 py-2 text-sm font-medium text-on-brand shadow-control transition hover:bg-brand-strong"
              href="/provision"
            >
              Provision restaurant
            </Link>
          </>
        }
      />

      <Panel
        title="Restaurant directory"
        description="Directory rows are safe operator summaries; database, auth, and secret-ref details stay on the restaurant summary."
      >
        <form
          data-testid="restaurant-directory-filters"
          className="mb-4 rounded-lg border border-line bg-surface-muted p-3"
          onSubmit={runSearch}
        >
          <div
            data-testid="restaurant-directory-filter-row"
            className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_13rem_auto] lg:items-start"
          >
            <div data-testid="restaurant-search-control" className="min-w-0">
              <Field
                label="Search"
                name="restaurant_search"
                className="input mt-1 h-10"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                helper="UUID, external code, slug, name, owner email, or primary host."
                maxLength={100}
              />
            </div>
            <div data-testid="restaurant-status-control" className="w-full lg:w-auto">
              <SelectField
                label="Status"
                name="restaurant_status"
                className="input mt-1 h-10"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {item === "all" ? "All statuses" : statusLabel(item)}
                  </option>
                ))}
              </SelectField>
            </div>
            <div data-testid="restaurant-search-action" className="flex flex-col lg:w-auto">
              <span aria-hidden className="hidden h-5 lg:block" />
              <Button
                type="submit"
                data-testid="restaurant-search-submit"
                className="h-10 w-full min-w-28 whitespace-nowrap px-3 py-0 leading-5 lg:mt-1 lg:w-auto [&_span]:leading-5 [&_svg]:shrink-0"
                icon={<Search aria-hidden className="h-4 w-4 shrink-0" />}
              >
                Search
              </Button>
            </div>
          </div>
          <div className="mt-3 grid gap-3 border-t border-line pt-3 md:hidden">
            <SelectField
              label="Sort"
              name="restaurant_sort"
              value={sortBy}
              onChange={(event) => setSort(event.target.value as RestaurantSortBy)}
            >
              {sortFields.map((item) => (
                <option key={item} value={item}>
                  {sortLabels[item]}
                </option>
              ))}
            </SelectField>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSort(sortBy)}
              icon={sortIcon(true, sortDir)}
            >
              {sortDir === "asc" ? "Ascending" : "Descending"}
            </Button>
          </div>
        </form>

        {restaurants.error ? <Alert tone="danger">{restaurants.error}</Alert> : null}
        {restaurants.data ? (
          <DirectoryTable
            restaurants={restaurants.data.items}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={setSort}
          />
        ) : (
          <LoadingState>Loading restaurants...</LoadingState>
        )}

        {restaurants.data ? (
          <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
            <span>
              Page {restaurants.data.page} of {totalPages}; {restaurants.data.total} matching
              restaurants.
            </span>
            <div className="flex gap-2">
              <Link
                aria-disabled={page <= 1}
                className={`rounded-md border border-line px-3 py-2 ${
                  page <= 1
                    ? "pointer-events-none opacity-50"
                    : "bg-surface-raised text-ink hover:bg-surface-muted"
                }`}
                href={directoryHref(Math.max(1, page - 1), q, status, sortBy, sortDir)}
              >
                Previous
              </Link>
              <Link
                aria-disabled={page >= totalPages}
                className={`rounded-md border border-line px-3 py-2 ${
                  page >= totalPages
                    ? "pointer-events-none opacity-50"
                    : "bg-surface-raised text-ink hover:bg-surface-muted"
                }`}
                href={directoryHref(page + 1, q, status, sortBy, sortDir)}
              >
                Next
              </Link>
            </div>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
