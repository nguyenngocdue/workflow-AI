import type {
  ConditionBranch,
  ConditionOperator,
  OutputSchemaSourceKey,
} from "@/src/core/types";

export const StringConditionOperator = {
  Equals: "equals",
  NotEquals: "not_equals",
  Contains: "contains",
  NotContains: "not_contains",
  StartsWith: "starts_with",
  EndsWith: "ends_with",
  IsEmpty: "is_empty",
  IsNotEmpty: "is_not_empty",
} as const;

export const NumberConditionOperator = {
  Equals: "equals",
  NotEquals: "not_equals",
  GreaterThan: "greater_than",
  LessThan: "less_than",
  GreaterThanOrEqual: "greater_than_or_equal",
  LessThanOrEqual: "less_than_or_equal",
} as const;

export const BooleanConditionOperator = {
  IsTrue: "is_true",
  IsFalse: "is_false",
} as const;

export function getFirstConditionOperator(
  type: "string" | "number" | "boolean",
): ConditionOperator {
  if (type === "number") {
    return NumberConditionOperator.Equals;
  }
  if (type === "boolean") {
    return BooleanConditionOperator.IsTrue;
  }
  return StringConditionOperator.Equals;
}

export function checkConditionBranch(
  branch: ConditionBranch,
  getSourceValue: (
    source: OutputSchemaSourceKey,
  ) => string | number | boolean | undefined,
): boolean {
  const results = branch.conditions?.map((condition) =>
    checkConditionRule({
      operator: condition.operator,
      target: String(condition.value ?? ""),
      source: getSourceValue(condition.source),
    }),
  ) ?? [false];

  if (branch.logicalOperator === "AND") {
    return results.every(Boolean);
  }
  return results.some(Boolean);
}

function checkConditionRule({
  operator,
  target,
  source,
}: {
  operator: ConditionOperator;
  target: string;
  source?: string | number | boolean;
}): boolean {
  try {
    switch (operator) {
      case StringConditionOperator.Equals:
        return source == target;
      case StringConditionOperator.NotEquals:
        return source != target;
      case StringConditionOperator.Contains:
        return String(source ?? "").includes(target);
      case StringConditionOperator.NotContains:
        return !String(source ?? "").includes(target);
      case StringConditionOperator.StartsWith:
        return String(source ?? "").startsWith(target);
      case StringConditionOperator.EndsWith:
        return String(source ?? "").endsWith(target);
      case StringConditionOperator.IsEmpty:
        return !source;
      case StringConditionOperator.IsNotEmpty:
        return Boolean(source);
      case NumberConditionOperator.GreaterThan:
        return Number(source) > Number(target);
      case NumberConditionOperator.LessThan:
        return Number(source) < Number(target);
      case NumberConditionOperator.GreaterThanOrEqual:
        return Number(source) >= Number(target);
      case NumberConditionOperator.LessThanOrEqual:
        return Number(source) <= Number(target);
      case BooleanConditionOperator.IsTrue:
        return Boolean(source);
      case BooleanConditionOperator.IsFalse:
        return !source;
      default:
        return false;
    }
  } catch {
    return false;
  }
}
