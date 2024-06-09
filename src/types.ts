import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
export type {
  ComparisonOperator,
  UpdateItemInput,
  GetItemInput,
  PutItemInput,
  ScanInput,
  QueryInput,
  DeleteItemInput,
} from "@aws-sdk/client-dynamodb";

export interface IDLArgumentsBase<TOptionShape> {
  docClient: DynamoDBDocumentClient;
  tableName: string;
  verbose: boolean;
  options: Omit<TOptionShape, "TableName" | "Item" | "Key">;
}

export type IDLWrappedOptions<TOptionShape> = Partial<TOptionShape> & {
  verbose?: boolean;
  forTrx?: boolean;
  autoTimeStamp?: boolean;
  pagination?: boolean;
};
