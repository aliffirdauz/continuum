import { paginate, toSkipTake } from "./pagination";

describe("pagination", () => {
  it("converts a one-based page into an offset", () => {
    expect(toSkipTake({ page: 1, pageSize: 20 })).toEqual({
      skip: 0,
      take: 20,
    });
    expect(toSkipTake({ page: 3, pageSize: 10 })).toEqual({
      skip: 20,
      take: 10,
    });
  });

  it("reports the page count for partial and empty results", () => {
    expect(paginate(["a"], 21, { page: 2, pageSize: 20 }).meta).toEqual({
      page: 2,
      pageSize: 20,
      total: 21,
      totalPages: 2,
    });
    expect(paginate([], 0, { page: 1, pageSize: 20 }).meta.totalPages).toBe(0);
  });
});
