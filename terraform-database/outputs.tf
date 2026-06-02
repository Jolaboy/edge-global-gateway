output "dynamodb_table_arn" {
  value       = aws_dynamodb_table.global_session_store.arn
  description = "Global Primary DynamoDB Table ARN"
}