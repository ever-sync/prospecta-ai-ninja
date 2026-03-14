export const selectFirstRow = async <T = unknown>(query: any): Promise<{ data: T | null; error: any }> => {
  const { data, error } = await query.limit(1);
  return {
    data: (Array.isArray(data) ? data[0] : null) as T | null,
    error,
  };
};
