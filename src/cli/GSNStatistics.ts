import { PrefixedHexString } from 'ethereumjs-tx'
import { Address, IntString, ObjectMap, SemVerString } from '../common/types/Aliases'
import {
  GNSContractsEvent, HubAuthorizedEventInfo, HubUnauthorizedEventInfo,
  RelayRegisteredEventInfo,
  StakeAddedEventInfo, StakePenalizedEventInfo,
  StakeUnlockedEventInfo, StakeWithdrawnEventInfo
} from '../common/types/GNSContractsEvents'
import PingResponse from '../common/PingResponse'
import { GSNContractsDeployment } from '../common/GSNContractsDeployment'

export interface PingResult {
  pingResponse?: PingResponse
  error?: Error
}

export interface TransactionDetail {
  transactionHash: PrefixedHexString
  explorerURL?: string
}

/**
 * Simplified structure derived from 'EventData' for better types support and user-visible output.
 */
export interface EventTransactionInfo<T extends GNSContractsEvent> {
  eventInfo: T
  transactionDetail: TransactionDetail
}

export enum RelayServerRegistrationStatus {
  /** only staked, but never registered on currently selected RelayHub */
  STAKED,
  /** staked and registered on currently selected RelayHub */
  REGISTERED,
  /** stake unlocked but not yet withdrawn */
  UNLOCKED,
  /** stake withdrawn */
  WITHDRAWN,
  /** stake has been penalized */
  PENALIZED
}

export interface RelaysByStakeStatus {
  allCurrentlyStakedRelays: Set<Address>
  allCurrentlyUnlockedRelays: Set<Address>
  allCurrentlyWithdrawnRelays: Set<Address>
  allCurrentlyPenalizedRelays: Set<Address>
}

export interface StakeMangerEvents {
  stakeAddedEvents: Array<EventTransactionInfo<StakeAddedEventInfo>>
  stakeUnlockedEvents: Array<EventTransactionInfo<StakeUnlockedEventInfo>>
  stakeWithdrawnEvents: Array<EventTransactionInfo<StakeWithdrawnEventInfo>>
  stakePenalizedEvents: Array<EventTransactionInfo<StakePenalizedEventInfo>>
  hubAuthorizedEvents: Array<EventTransactionInfo<HubAuthorizedEventInfo>>
  hubUnauthorizedEvents: Array<EventTransactionInfo<HubUnauthorizedEventInfo>>
}

export interface RelayServerRegistrationInfo {
  lastRegisteredUrl: string
  pingResult: PingResult
  managerBalance: IntString
  registeredWorkers: Address[]
  workerBalances: ObjectMap<IntString>
}

export interface PaymasterInfo {
  relayHubBalance: IntString
  acceptedTransactionsCount: number
  rejectedTransactionsCount: number
}

export interface RecipientInfo {
  address: Address
  transactionCount: number
}

export interface SenderInfo {
  address: Address
  transactionCount: number
}
export interface RelayServerInfo {
  /**
   * Only when {@link currentStatus} is {@link RelayServerRegistrationStatus.REGISTERED}
   * this object will contain {@link RelayServerRegistrationInfo}
   * */
  currentStatus: RelayServerRegistrationStatus
  relayOwner: Address
  managerAddress: Address
  authorizedHubs: Address[]
  stakeManagerEvents: StakeMangerEvents
  relayRegisteredEvents: Array<EventTransactionInfo<RelayRegisteredEventInfo>>
  registrationInfo?: RelayServerRegistrationInfo
}

export interface GSNStatistics {
  blockNumber: number
  runtimeVersion: SemVerString
  contractsDeployment: GSNContractsDeployment
  senders: SenderInfo[]
  paymasters: PaymasterInfo[]
  recipients: RecipientInfo[]
  relayServers: RelayServerInfo[]
  totalGasPaidViaGSN: IntString
  totalStakesByRelays: IntString
}
