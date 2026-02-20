Feature: Tenant management
  Authenticated users can create and manage tenants. Each tenant scopes the
  connection and metrics data that the Go client reports to the backend.
  A tenant ID is a lowercase slug used to route data from client to backend.

  Background:
    Given the backend is running
    And I am signed in as "user@example.com"

  # --- List tenants ---

  Scenario: An authenticated user can list their tenants
    Given I own a tenant with id "my-tenant"
    When I send GET "/api/tenants" with the auth token
    Then the response status should be 200
    And the response body should contain a "tenants" array including "my-tenant"

  Scenario: The tenants list is empty when the user owns no tenants
    Given I own no tenants
    When I send GET "/api/tenants" with the auth token
    Then the response status should be 200
    And the response body should contain an empty "tenants" array

  Scenario: Listing tenants requires authentication
    Given I am not authenticated
    When I request GET "/api/tenants"
    Then the response status should be 401

  # --- Create tenant ---

  Scenario: An authenticated user creates a new tenant with a name
    When I send POST "/api/tenants" with the auth token and body:
      | name | My Home Network |
    Then the response status should be 201
    And the response body should contain a "tenant" with tenantId "my-home-network"
    And the response body should contain a "tenant" with name "My Home Network"

  Scenario: A tenant can be created with an explicit tenantId
    When I send POST "/api/tenants" with the auth token and body:
      | name     | Office Network |
      | tenantId | office-net-01  |
    Then the response status should be 201
    And the response body should contain a "tenant" with tenantId "office-net-01"

  Scenario: Creating a tenant requires a name
    When I send POST "/api/tenants" with the auth token and body:
      | tenantId | no-name |
    Then the response status should be 400
    And the response body should contain an "error" field

  Scenario: Creating a tenant with a duplicate tenantId is rejected
    Given a tenant with id "existing-tenant" already exists
    When I send POST "/api/tenants" with the auth token and body:
      | name     | Existing Tenant |
      | tenantId | existing-tenant |
    Then the response status should be 409
    And the response body should contain an "error" field

  Scenario: Creating a tenant with an invalid tenantId is rejected
    When I send POST "/api/tenants" with the auth token and body:
      | name     | Bad ID Tenant    |
      | tenantId | Invalid Tenant!  |
    Then the response status should be 400
    And the response body should contain an "error" field

  Scenario: Creating a tenant requires authentication
    Given I am not authenticated
    When I send POST "/api/tenants" with body:
      | name | Unauthorized Tenant |
    Then the response status should be 401

  # --- Delete tenant ---

  Scenario: An authenticated user can delete their own tenant
    Given I own a tenant with id "to-delete"
    When I send DELETE "/api/tenants/to-delete" with the auth token
    Then the response status should be 204

  Scenario: Deleting a non-existent tenant returns 404
    When I send DELETE "/api/tenants/non-existent" with the auth token
    Then the response status should be 404
    And the response body should contain an "error" field

  Scenario: Deleting a tenant requires authentication
    Given I am not authenticated
    When I send DELETE "/api/tenants/some-tenant"
    Then the response status should be 401
