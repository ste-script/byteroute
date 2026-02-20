Feature: Authentication
  Users can register, sign in, and manage their session.
  Protected routes require a valid Bearer token issued on sign in or sign up.

  Background:
    Given the backend is running

  # --- Sign Up ---

  Scenario: A new user registers with valid credentials
    When I send POST "/auth/signup" with body:
      | name     | Test User         |
      | email    | new@example.com   |
      | password | securePass1!      |
    Then the response status should be 201
    And the response body should contain a "token"
    And the response body should contain a "user" with email "new@example.com"

  Scenario: Registration fails when email is already taken
    Given a user with email "taken@example.com" already exists
    When I send POST "/auth/signup" with body:
      | name     | Another User      |
      | email    | taken@example.com |
      | password | securePass1!      |
    Then the response status should be 409
    And the response body should contain an "error" field

  Scenario: Registration fails when the request body is invalid
    When I send POST "/auth/signup" with body:
      | email    | bad@example.com |
    Then the response status should be 400
    And the response body should contain an "error" field

  Scenario: Registration fails when password is too short
    When I send POST "/auth/signup" with body:
      | name     | Test User       |
      | email    | short@example.com |
      | password | abc             |
    Then the response status should be 400
    And the response body should contain an "error" field

  # --- Sign In ---

  Scenario: A registered user can sign in with correct credentials
    Given a user with email "user@example.com" and password "securePass1!" exists
    When I send POST "/auth/signin" with body:
      | email    | user@example.com |
      | password | securePass1!     |
    Then the response status should be 200
    And the response body should contain a "token"
    And the response body should contain a "user" with email "user@example.com"

  Scenario: Sign in fails with wrong password
    Given a user with email "user@example.com" and password "securePass1!" exists
    When I send POST "/auth/signin" with body:
      | email    | user@example.com |
      | password | wrongPassword!   |
    Then the response status should be 401
    And the response body should contain an "error" field

  Scenario: Sign in fails for a non-existent user
    When I send POST "/auth/signin" with body:
      | email    | ghost@example.com |
      | password | somePassword1!    |
    Then the response status should be 401
    And the response body should contain an "error" field

  Scenario: Sign in fails when the request body is invalid
    When I send POST "/auth/signin" with body:
      | email    | notanemail |
    Then the response status should be 400
    And the response body should contain an "error" field

  # --- Current User ---

  Scenario: An authenticated user can retrieve their profile
    Given I am signed in as "user@example.com"
    When I send GET "/auth/me" with the auth token
    Then the response status should be 200
    And the response body should contain a "user" with email "user@example.com"

  Scenario: An unauthenticated request to /auth/me is rejected
    Given I am not authenticated
    When I request GET "/auth/me"
    Then the response status should be 401

  # --- Sign Out ---

  Scenario: A user can sign out
    Given I am signed in as "user@example.com"
    When I send POST "/auth/logout" with the auth token
    Then the response status should be 204

  # --- Client Token ---

  Scenario: An authenticated user can generate a short-lived client token
    Given I am signed in as "user@example.com"
    When I send POST "/auth/client-token" with the auth token
    Then the response status should be 200
    And the response body should contain a "token"
    And the response body should contain an "expiresIn" field
