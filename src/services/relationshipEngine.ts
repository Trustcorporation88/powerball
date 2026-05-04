export interface RelationshipTable {
  id: string;
  name: string;
  headers: string[];
  data: Record<string, unknown>[];
}

export interface RelationshipDefinition {
  id: string;
  leftTable: string;
  leftColumn: string;
  rightTable: string;
  rightColumn: string;
  joinType: "inner" | "left";
}

interface MergedDataset {
  headers: string[];
  data: Record<string, unknown>[];
}

function getFieldName(table: RelationshipTable, column: string, isPrimary: boolean): string {
  return isPrimary ? column : `${table.name}.${column}`;
}

function normalizeJoinedRow(
  row: Record<string, unknown> | undefined,
  table: RelationshipTable,
): Record<string, unknown> {
  if (!row) {
    return Object.fromEntries(table.headers.map((header) => [`${table.name}.${header}`, null]));
  }

  return Object.fromEntries(
    table.headers.map((header) => [`${table.name}.${header}`, row[header] ?? null]),
  );
}

export function buildMergedDataset(
  primaryTable: RelationshipTable,
  additionalTables: RelationshipTable[],
  relationships: RelationshipDefinition[],
): MergedDataset {
  const tableMap = new Map<string, RelationshipTable>([
    [primaryTable.id, primaryTable],
    ...additionalTables.map((table) => [table.id, table] as const),
  ]);

  const includedTables = new Set<string>([primaryTable.id]);
  const remaining = [...relationships];
  let mergedRows = [...primaryTable.data];
  let changed = true;

  while (remaining.length > 0 && changed) {
    changed = false;

    for (let index = remaining.length - 1; index >= 0; index -= 1) {
      const relationship = remaining[index];
      const leftIncluded = includedTables.has(relationship.leftTable);
      const rightIncluded = includedTables.has(relationship.rightTable);

      if (leftIncluded === rightIncluded) {
        continue;
      }

      const sourceTableId = leftIncluded ? relationship.leftTable : relationship.rightTable;
      const targetTableId = leftIncluded ? relationship.rightTable : relationship.leftTable;
      const sourceColumn = leftIncluded ? relationship.leftColumn : relationship.rightColumn;
      const targetColumn = leftIncluded ? relationship.rightColumn : relationship.leftColumn;
      const sourceTable = tableMap.get(sourceTableId);
      const targetTable = tableMap.get(targetTableId);

      if (!sourceTable || !targetTable) {
        continue;
      }

      const sourceField = getFieldName(sourceTable, sourceColumn, sourceTableId === primaryTable.id);
      const targetIndex = new Map<string, Record<string, unknown>[]>();

      targetTable.data.forEach((row) => {
        const key = String(row[targetColumn] ?? "");
        const existing = targetIndex.get(key) ?? [];
        existing.push(row);
        targetIndex.set(key, existing);
      });

      const nextRows: Record<string, unknown>[] = [];

      mergedRows.forEach((row) => {
        const matches = targetIndex.get(String(row[sourceField] ?? "")) ?? [];

        if (matches.length === 0) {
          if (relationship.joinType === "left") {
            nextRows.push({
              ...row,
              ...normalizeJoinedRow(undefined, targetTable),
            });
          }
          return;
        }

        matches.forEach((match) => {
          nextRows.push({
            ...row,
            ...normalizeJoinedRow(match, targetTable),
          });
        });
      });

      mergedRows = nextRows;
      includedTables.add(targetTableId);
      remaining.splice(index, 1);
      changed = true;
    }
  }

  const headerSet = new Set<string>(primaryTable.headers);
  additionalTables
    .filter((table) => includedTables.has(table.id))
    .forEach((table) => {
      table.headers.forEach((header) => headerSet.add(`${table.name}.${header}`));
    });

  return {
    headers: [...headerSet],
    data: mergedRows,
  };
}

