variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "letsdoit"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "domain_name" {
  description = "Custom domain name for the website"
  type        = string
  default     = "lets-do-it.xyz"
}

# =============================================================================
# Slack OAuth Credentials
# =============================================================================

variable "slack_client_id" {
  description = "Slack App Client ID (from Slack App Settings > Basic Information)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "slack_client_secret" {
  description = "Slack App Client Secret (from Slack App Settings > Basic Information)"
  type        = string
  sensitive   = true
  default     = ""
}