import { QueryCommand, QueryCommandInput, QueryCommandOutput } from "@aws-sdk/lib-dynamodb";
import { IDLArgumentsBase } from "../types";
import { buildKeyConditionExpressions, concatBatchFetchResult, mergeOptions } from "../utils/helper";

interface IDLQuery extends IDLArgumentsBase<QueryCommandInput> {
  indexName: string | undefined;
  pagination: boolean;
  partitionKey: string | undefined;
  partitionKeyValue: unknown;
  sortKey: string | undefined;
  sortKeyOperator: string | undefined;
  sortKeyValue: unknown;
}

export default async function query({
  docClient,
  tableName,
  indexName,
  partitionKey,
  partitionKeyValue,
  sortKey,
  sortKeyOperator,
  sortKeyValue,
  options = {},
  pagination = false,
  verbose = false,
}: IDLQuery) {
  /**
   * Check for errors
   */
  if (!partitionKey || !partitionKeyValue) {
    throw new Error(
      `Query fail: argument partitionKey - ${partitionKey} or partitionKeyValue ${partitionKeyValue} is invalid`,
    );
  }
  if (sortKey) {
    if (!sortKeyValue || !sortKeyOperator) {
      throw new Error(`Query fail: both sortKeyValue and sortKeyOperator are required`);
    }
  }

  /**
   * Update query options / params
   */
  const keyConditionExpressions = buildKeyConditionExpressions({
    partitionKey,
    partitionKeyValue,
    sortKey,
    sortKeyOperator,
    sortKeyValue,
  });

  const params: QueryCommandInput = mergeOptions(
    {
      TableName: tableName,
      ...(indexName && { IndexName: indexName }),
      ...keyConditionExpressions,
    },
    options,
  );
  if (verbose) {
    console.log("params", params);
  }

  try {
    /**
     * Make the query
     */
    let result;
    let shouldKeepFetching = false;
    while (!result || shouldKeepFetching) {
      // eslint-disable-next-line no-await-in-loop
      const fetchedData: QueryCommandOutput = await docClient.send(new QueryCommand(params));
      const { LastEvaluatedKey } = fetchedData;
      result = concatBatchFetchResult(result, fetchedData);
      params.ExclusiveStartKey = LastEvaluatedKey;
      if (params.Limit) {
        params.Limit -= fetchedData.Items?.length ?? 0;
      }
      const wantToFetchMore = (params.Limit === undefined || params.Limit > 0) && !pagination;
      const hasMoreToFetch = !!LastEvaluatedKey;
      shouldKeepFetching = wantToFetchMore && hasMoreToFetch;
    }
    if (verbose) {
      console.log(`Successfully queried ${result.Count} items from table ${tableName}`);
    }
    return result;
  } catch (error) {
    if (verbose) {
      console.error(
        `Unable to query items from ${tableName}. Error JSON:`,
        JSON.stringify(error),
        (error as Error).stack,
      );
      console.log("params", JSON.stringify(params));
    }
    throw error;
  }
}
