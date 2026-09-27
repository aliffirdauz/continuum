export type SearchParams = Record<string, string | string[] | undefined>;
type SearchParam = SearchParams[string];

// Mirrors the API's identifier rule so malformed IDs never reach the API.
const RESOURCE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_TEXT_LENGTH = 100;
const MAX_PAGE = 10_000;

function firstValue(value: SearchParam): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function isResourceId(value: string | undefined): value is string {
  return value !== undefined && RESOURCE_ID_PATTERN.test(value);
}

export function parsePage(value: SearchParam): number {
  const page = Number(firstValue(value));

  return Number.isInteger(page) && page >= 1 && page <= MAX_PAGE ? page : 1;
}

export function parseText(value: SearchParam): string | undefined {
  const text = firstValue(value)?.trim().slice(0, MAX_TEXT_LENGTH);

  return text || undefined;
}

export function parseId(value: SearchParam): string | undefined {
  const id = firstValue(value);

  return isResourceId(id) ? id : undefined;
}

export function parseOption<T extends string>(
  value: SearchParam,
  options: readonly T[],
): T | undefined {
  const option = firstValue(value);

  return options.find((candidate) => candidate === option);
}

/** Builds a link that keeps set parameters and drops empty ones and page 1. */
export function buildHref(
  pathname: string,
  params: Record<string, string | number | undefined>,
): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (
      value === undefined ||
      value === "" ||
      (key === "page" && value === 1)
    ) {
      continue;
    }
    search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}
