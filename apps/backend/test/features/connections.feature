Feature: Connection ingestion
  The Go client captures network packets and sends batches of connections to
  the backend. The backend enriches each connection with GeoIP data, stores it
  in MongoDB, and broadcasts updates to dashboard clients via Socket.IO.

  Background:
    Given the backend is running
    And I am signed in as "user@example.com" with access to tenant "default"

  Scenario: A client posts a valid batch of connections
    When I send POST "/api/connections" with tenant "default" and body:
      """
      {
        "connections": [
          {
            "sourceIp": "192.168.1.10",
            "destIp": "8.8.8.8",
            "sourcePort": 54321,
            "destPort": 443,
            "protocol": "TCP",
            "status": "active"
          }
        ]
      }
      """
    Then the response status should be 202
    And the response body should contain "received" as 1
    And the response body should contain "status" as "processing"

  Scenario: A client posts a batch with multiple connections
    When I send POST "/api/connections" with tenant "default" and body:
      """
      {
        "connections": [
          { "sourceIp": "10.0.0.1", "destIp": "1.1.1.1", "destPort": 80,  "protocol": "TCP" },
          { "sourceIp": "10.0.0.1", "destIp": "1.1.1.2", "destPort": 443, "protocol": "TCP" },
          { "sourceIp": "10.0.0.1", "destIp": "8.8.4.4", "destPort": 53,  "protocol": "UDP" }
        ]
      }
      """
    Then the response status should be 202
    And the response body should contain "received" as 3

  Scenario: Posting connections with an empty array is accepted
    When I send POST "/api/connections" with tenant "default" and body:
      """
      { "connections": [] }
      """
    Then the response status should be 202
    And the response body should contain "received" as 0

  Scenario: Posting connections without authentication is rejected
    Given I am not authenticated
    When I send POST "/api/connections" with body:
      """
      { "connections": [{ "destIp": "8.8.8.8" }] }
      """
    Then the response status should be 401

  Scenario: Posting connections without the connections field is rejected
    When I send POST "/api/connections" with tenant "default" and body:
      """
      { "data": "wrong field" }
      """
    Then the response status should be 400
    And the response body should contain an "error" field

  Scenario: Posting connections with a non-array connections field is rejected
    When I send POST "/api/connections" with tenant "default" and body:
      """
      { "connections": "not-an-array" }
      """
    Then the response status should be 400
    And the response body should contain an "error" field

  Scenario: A user cannot post connections for a tenant they do not own
    When I send POST "/api/connections" with tenant "other-tenant" and body:
      """
      { "connections": [{ "destIp": "8.8.8.8" }] }
      """
    Then the response status should be 403
    And the response body should contain an "error" field

  Scenario: Connections with unsupported protocol values are normalised to OTHER
    When I send POST "/api/connections" with tenant "default" and body:
      """
      {
        "connections": [
          { "sourceIp": "10.0.0.1", "destIp": "8.8.8.8", "protocol": "QUIC" }
        ]
      }
      """
    Then the response status should be 202

  Scenario: The reporter IP is extracted from the X-Forwarded-For header
    When I send POST "/api/connections" with tenant "default", header "X-Forwarded-For: 203.0.113.5", and body:
      """
      { "connections": [{ "destIp": "8.8.8.8" }] }
      """
    Then the response status should be 202
