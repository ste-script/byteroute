Feature: Metrics ingestion
  The Go client periodically sends bandwidth and traffic time-series snapshots
  to the backend. These metrics are scoped per tenant and are used by the
  dashboard to render time-based bandwidth charts.

  Background:
    Given the backend is running
    And I am signed in as "user@example.com" with access to tenant "default"

  Scenario: A client posts a valid metrics snapshot batch
    When I send POST "/api/metrics" with tenant "default" and body:
      """
      {
        "snapshots": [
          { "timestamp": "2025-01-01T00:00:00.000Z", "bytesIn": 1024, "bytesOut": 512 }
        ]
      }
      """
    Then the response status should be 202
    And the response body should contain "received" as 1
    And the response body should contain "status" as "processing"

  Scenario: A client posts multiple snapshots in one batch
    When I send POST "/api/metrics" with tenant "default" and body:
      """
      {
        "snapshots": [
          { "timestamp": "2025-01-01T00:00:00.000Z", "bytesIn": 1024, "bytesOut": 512 },
          { "timestamp": "2025-01-01T00:00:05.000Z", "bytesIn": 2048, "bytesOut": 256 },
          { "timestamp": "2025-01-01T00:00:10.000Z", "bytesIn": 768,  "bytesOut": 1024 }
        ]
      }
      """
    Then the response status should be 202
    And the response body should contain "received" as 3

  Scenario: Posting metrics without authentication is rejected
    Given I am not authenticated
    When I send POST "/api/metrics" with body:
      """
      { "snapshots": [{ "timestamp": "2025-01-01T00:00:00.000Z", "bytesIn": 100 }] }
      """
    Then the response status should be 401

  Scenario: Posting metrics without the snapshots field is rejected
    When I send POST "/api/metrics" with tenant "default" and body:
      """
      { "data": "wrong field" }
      """
    Then the response status should be 400
    And the response body should contain an "error" field

  Scenario: Posting metrics with a non-array snapshots field is rejected
    When I send POST "/api/metrics" with tenant "default" and body:
      """
      { "snapshots": "not-an-array" }
      """
    Then the response status should be 400
    And the response body should contain an "error" field

  Scenario: A user cannot post metrics for a tenant they do not own
    When I send POST "/api/metrics" with tenant "foreign-tenant" and body:
      """
      { "snapshots": [{ "timestamp": "2025-01-01T00:00:00.000Z", "bytesIn": 100 }] }
      """
    Then the response status should be 403
    And the response body should contain an "error" field

  Scenario: The tenant is resolved from the X-Tenant-Id header
    When I send POST "/api/metrics" with header "X-Tenant-Id: default" and body:
      """
      { "snapshots": [{ "timestamp": "2025-01-01T00:00:00.000Z", "bytesIn": 100 }] }
      """
    Then the response status should be 202
