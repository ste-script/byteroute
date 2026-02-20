Feature: Health check
  The backend exposes a health endpoint so that clients and infrastructure
  can verify the service is running and check its database connectivity.

  Scenario: Health endpoint returns ok when service is running
    Given the backend is running
    When I request GET "/health"
    Then the response status should be 200
    And the response body should contain "ok" as true

  Scenario: Health endpoint reports MongoDB connection state
    Given the backend is running
    When I request GET "/health"
    Then the response body should contain a "mongo" object with a "readyState" field

  Scenario: Health endpoint is publicly accessible without authentication
    Given I am not authenticated
    When I request GET "/health"
    Then the response status should be 200
