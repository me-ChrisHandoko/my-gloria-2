export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}

export class PaginationUtil {
  static getOptions(options: PaginationOptions): {
    skip: number;
    take: number;
    orderBy?: Record<string, 'asc' | 'desc'>;
  } {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const result: any = {
      skip,
      take: limit,
    };

    if (options.sortBy) {
      result.orderBy = {
        [options.sortBy]: options.sortOrder || 'asc',
      };
    }

    return result;
  }

  static createResult<T>(
    data: T[],
    total: number,
    options: PaginationOptions,
  ): PaginationResult<T> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      },
    };
  }

  static getPageLinks(
    baseUrl: string,
    currentPage: number,
    totalPages: number,
  ): {
    first: string;
    previous?: string;
    next?: string;
    last: string;
  } {
    const links: any = {
      first: `${baseUrl}?page=1`,
      last: `${baseUrl}?page=${totalPages}`,
    };

    if (currentPage > 1) {
      links.previous = `${baseUrl}?page=${currentPage - 1}`;
    }

    if (currentPage < totalPages) {
      links.next = `${baseUrl}?page=${currentPage + 1}`;
    }

    return links;
  }
}
