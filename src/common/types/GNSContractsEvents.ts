import { Address, EventName, IntString } from './Aliases'

// Empty interface used on purpose to mark various Event Infos in collections, used in StatusLogic.
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GNSContractsEvent {}

/** IRelayHub.sol */

export const RelayServerRegistered: EventName = 'RelayServerRegistered'
export const RelayWorkersAdded: EventName = 'RelayWorkersAdded'
export const TransactionRejectedByPaymaster: EventName = 'TransactionRejectedByPaymaster'
export const TransactionRelayed: EventName = 'TransactionRelayed'

/**
 * Emitting any of these events is handled by GSN clients as a sign of activity by a RelayServer.
 */
export const ActiveManagerEvents = [RelayServerRegistered, RelayWorkersAdded, TransactionRelayed, TransactionRejectedByPaymaster]

export interface RelayInfoUrl {
  relayUrl: string
}

export interface RelayRegisteredEventInfo extends RelayInfoUrl, GNSContractsEvent {
  relayManager: Address
  baseRelayFee: IntString
  pctRelayFee: IntString
}

export function isInfoFromEvent (info: RelayInfoUrl): boolean {
  return 'relayManager' in info && 'baseRelayFee' in info && 'pctRelayFee' in info
}

/** IStakeManager.sol */

export const HubAuthorized: EventName = 'HubAuthorized'
export const HubUnauthorized: EventName = 'HubUnauthorized'
export const StakeAdded: EventName = 'StakeAdded'
export const StakePenalized: EventName = 'StakePenalized'
export const StakeUnlocked: EventName = 'StakeUnlocked'
export const StakeWithdrawn: EventName = 'StakeWithdrawn'

export const allStakeManagerEvents = [StakeAdded, HubAuthorized, HubUnauthorized, StakeUnlocked, StakeWithdrawn, StakePenalized]

export interface StakeAddedEventInfo extends GNSContractsEvent {
  relayManager: Address
  owner: Address
  stake: IntString
  unstakeDelay: IntString
}

export interface StakeUnlockedEventInfo extends GNSContractsEvent {
  relayManager: Address
  owner: Address
  withdrawBlock: IntString
}

export interface StakeWithdrawnEventInfo extends GNSContractsEvent {
  relayManager: Address
  owner: Address
  amount: IntString
}

export interface StakePenalizedEventInfo extends GNSContractsEvent {
  relayManager: Address
  beneficiary: Address
  reward: IntString
}

export type StakeChangeEvent =
  StakeAddedEventInfo
  | StakeUnlockedEventInfo
  | StakeWithdrawnEventInfo
  | StakePenalizedEventInfo

export interface HubAuthorizedEventInfo extends GNSContractsEvent {
  relayManager: Address
  relayHub: Address
}

export interface HubUnauthorizedEventInfo extends GNSContractsEvent {
  relayManager: Address
  relayHub: Address
  removalBlock: IntString
}
