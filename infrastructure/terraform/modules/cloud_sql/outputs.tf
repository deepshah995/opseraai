output "connection_name" {
  description = "Cloud SQL instance connection name for Cloud Run proxy"
  value       = google_sql_database_instance.instance.connection_name
}

output "private_ip_address" {
  value = google_sql_database_instance.instance.private_ip_address
}

output "database_name" {
  value = google_sql_database.database.name
}
