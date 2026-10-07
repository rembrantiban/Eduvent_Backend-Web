/** Query filter for documents that have not been soft-deleted (older docs have no isDeleted field). */
export const NOT_DELETED = { isDeleted: { $ne: true } } as const;
