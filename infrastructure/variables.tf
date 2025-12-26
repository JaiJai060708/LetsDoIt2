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

