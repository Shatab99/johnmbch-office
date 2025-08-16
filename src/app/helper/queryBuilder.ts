import { equal } from "assert";

interface QueryOptions {
  model: any;
  query: any;
  searchableFields?: string[];
  forcedFilters?: Record<string, any>; // 👈 new
  includes?: Record<string, any>; // 👈 optional includes for relations
}

export const dynamicQueryBuilder = async ({
  model,
  query,
  searchableFields = [],
  forcedFilters = {},
  includes = {},
}: QueryOptions) => {
  const {
    page = 1,
    limit = 10,
    search,
    sortBy = "createdAt",
    order = "desc",
    ...filters
  } = query;

  const numericLimit = parseInt(limit as string, 10);
  const numericPage = parseInt(page as string, 10);
  const skip = (numericPage - 1) * numericLimit;

  const searchCondition =
    search && searchableFields.length > 0
      ? {
          OR: searchableFields.map((field) => {
            const keys = field.includes(".") ? field.split(".") : [field];
            const value = {
              contains: search,
              mode: "insensitive",
            };

            // @ts-ignore
            return keys.reduceRight((acc, key) => ({ [key]: acc }), value);
          }),
        }
      : {};

  const { sportName, ...restFilters } = filters;

  const relationFilter: any[] = [];

  if (sportName)
    relationFilter.push(
      {
        AthleteInfo: { sportName: { equals: sportName, mode: "insensitive" } },
      },
      { ClubInfo: { sportName: { equals: sportName, mode: "insensitive" } } }
    );

  const filterConditions = {
    ...restFilters,
    ...forcedFilters, // ✅ override or enforce protected filters like userId
  };

  const where = {
    ...searchCondition,
    ...filterConditions,
    ...(relationFilter.length > 0 ? { OR: relationFilter } : {}),
  };

  const [data, total] = await Promise.all([
    model.findMany({
      where,
      skip,
      take: numericLimit,
      orderBy: {
        [sortBy]: order,
      },
      include: includes || {}, // 👈 include relations if specified
    }),
    model.count({ where }),
  ]);

  const totalPages = Math.ceil(total / numericLimit);

  return {
    query: sportName,
    meta: {
      currentPage: numericPage,
      totalPages,
      totalItems: total,
      perPage: numericLimit,
    },
    data,
  };
};
