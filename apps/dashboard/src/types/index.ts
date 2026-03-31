/*

 * Copyright 2026 Stefano Babini
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Re-export all types from shared package
export {
  type Connection,
  type TrafficFlow,
  type Statistics,
  type CountryStats,
  type AsnStats,
  type ProtocolStats,
  type TimeSeriesData,
  type MapViewState,
  type SocketMessage,
  type DashboardFilters,
  type ServerToClientEvents,
  type ClientToServerEvents,
  type InterServerEvents,
  type SocketData,
} from '@byteroute/shared'

export type {
  AuthUser,
  AuthResponse,
  SignInPayload,
  SignUpPayload
} from './auth'
