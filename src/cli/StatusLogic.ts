import { EventData } from 'web3-eth-contract'

import HttpClient from '../relayclient/HttpClient'
import { Address, EventName, IntString, ObjectMap } from '../common/types/Aliases'
import ContractInteractor from '../common/ContractInteractor'
import { address2topic } from '../common/Utils'

import {
  allStakeManagerEvents,
  GNSContractsEvent,
  HubAuthorized,
  HubAuthorizedEventInfo,
  HubUnauthorized,
  HubUnauthorizedEventInfo,
  RelayRegisteredEventInfo,
  RelayServerRegistered,
  StakeAdded,
  StakeAddedEventInfo,
  StakeChangeEvent,
  StakePenalized,
  StakePenalizedEventInfo,
  StakeUnlocked,
  StakeUnlockedEventInfo,
  StakeWithdrawn,
  StakeWithdrawnEventInfo
} from '../common/types/GNSContractsEvents'
import {
  EventTransactionInfo,
  GSNStatistics,
  PaymasterInfo,
  PingResult,
  RecipientInfo,
  RelaysByStakeStatus,
  RelayServerInfo,
  RelayServerRegistrationInfo,
  RelayServerRegistrationStatus,
  SenderInfo,
  StakeMangerEvents
} from './GSNStatistics'
import { gsnRuntimeVersion } from '../common/Version'

// TODO: something like that so that CLI does not get 'stuck' while gathering...
export enum GatheringProgress {
  START,
  MIDDLE,
  FINISHED
}

export interface StatusConfig {
  blockExplorerUrl?: string
  /**
   * A timeout in milliseconds to abort a request. If set to 0 (default) a timeout is not created.
   */
  getAddressTimeoutMs: number
}

export default class StatusLogic {
  private readonly contractInteractor: ContractInteractor
  private readonly httpClient: HttpClient
  private readonly config: StatusConfig
  private allStakeManagerEvents!: StakeMangerEvents

  constructor (contractInteractor: ContractInteractor, httpClient: HttpClient, config: StatusConfig) {
    this.contractInteractor = contractInteractor
    this.httpClient = httpClient
    this.config = config
  }

  async gatherStatistics (): Promise<GSNStatistics> {
    const blockNumber = await this.contractInteractor.getBlockNumber()

    const stakeManagerAddress = this.contractInteractor.stakeManagerAddress()
    const totalStakesByRelays = await this.contractInteractor.getBalance(stakeManagerAddress)

    this.allStakeManagerEvents = await this.getStakeManagerEvents()

    const relayServers = await this.getRelayServersInfo()
    const paymasters = await this.getPaymastersInfo()
    const senders = await this.getSendersInfo()
    const recipients = await this.getRecipientsInfo()
    const totalGasPaidViaGSN = '0'

    const runtimeVersion = gsnRuntimeVersion
    const contractsDeployment = this.contractInteractor.getDeployment()
    return {
      runtimeVersion,
      contractsDeployment,
      blockNumber,
      totalStakesByRelays,
      paymasters,
      senders,
      recipients,
      relayServers,
      totalGasPaidViaGSN
    }
  }

  async getSendersInfo (): Promise<SenderInfo[]> {
    return []
  }

  async getRecipientsInfo (): Promise<RecipientInfo[]> {
    return []
  }

  async getPaymastersInfo (): Promise<PaymasterInfo[]> {
    return []
  }

  extractUnique (events: Array<EventTransactionInfo<StakeChangeEvent>>): Set<Address> {
    const set = new Set<Address>()
    events.forEach(it => {
      set.add(it.eventInfo.relayManager)
    })
    return set
  }

  // TODO: extract shared code
  async getRelaysByStakeStatus (): Promise<RelaysByStakeStatus> {
    const allEverStakedRelays = this.extractUnique(this.allStakeManagerEvents.stakeAddedEvents)
    const allEverUnlockedRelays = this.extractUnique(this.allStakeManagerEvents.stakeUnlockedEvents)
    const allCurrentlyWithdrawnRelays = this.extractUnique(this.allStakeManagerEvents.stakeWithdrawnEvents)
    const allCurrentlyPenalizedRelays = this.extractUnique(this.allStakeManagerEvents.stakePenalizedEvents)
    const allCurrentlyUnlockedRelays = new Set(
      [...allEverUnlockedRelays]
        .filter(it => !allCurrentlyWithdrawnRelays.has(it))
        .filter(it => !allCurrentlyPenalizedRelays.has(it))
    )
    const allCurrentlyStakedRelays = new Set(
      [...allEverStakedRelays]
        .filter(it => !allCurrentlyWithdrawnRelays.has(it))
        .filter(it => !allCurrentlyPenalizedRelays.has(it))
    )
    return {
      allCurrentlyStakedRelays,
      allCurrentlyUnlockedRelays,
      allCurrentlyWithdrawnRelays,
      allCurrentlyPenalizedRelays
    }
  }

  async getRelayServersInfo (): Promise<RelayServerInfo[]> {
    const relayServersInfo: RelayServerInfo[] = []
    const relaysByStatus = await this.getRelaysByStakeStatus()
    for (const inactiveRelayManager of relaysByStatus.allCurrentlyWithdrawnRelays) {
      relayServersInfo.push(await this.gatherRelayInfo(inactiveRelayManager, RelayServerRegistrationStatus.WITHDRAWN))
    }
    for (const inactiveRelayManager of relaysByStatus.allCurrentlyUnlockedRelays) {
      relayServersInfo.push(await this.gatherRelayInfo(inactiveRelayManager, RelayServerRegistrationStatus.UNLOCKED))
    }
    for (const inactiveRelayManager of relaysByStatus.allCurrentlyPenalizedRelays) {
      relayServersInfo.push(await this.gatherRelayInfo(inactiveRelayManager, RelayServerRegistrationStatus.PENALIZED))
    }
    for (const inactiveRelayManager of relaysByStatus.allCurrentlyStakedRelays) {
      relayServersInfo.push(await this.gatherRelayInfo(inactiveRelayManager, RelayServerRegistrationStatus.STAKED))
    }
    return relayServersInfo
  }

  async gatherRelayInfo (managerAddress: Address, relayServerRegistrationStatus: RelayServerRegistrationStatus): Promise<RelayServerInfo> {
    let registrationInfo: RelayServerRegistrationInfo | undefined
    let currentStatus = relayServerRegistrationStatus
    const authorizedHubs: Address[] = [] // TODO
    const stakeManagerEvents = await this.getStakeManagerEvents(managerAddress)
    const relayOwner = stakeManagerEvents.stakeAddedEvents[0].eventInfo.owner
    const relayRegisteredEventsData =
      await this.contractInteractor.getPastEventsForHub([address2topic(managerAddress)], { fromBlock: 1 }, [RelayServerRegistered])
    const relayRegisteredEvents = this.extractTransactionInfos<RelayRegisteredEventInfo>(relayRegisteredEventsData, RelayServerRegistered)

    const isServerRegistered = relayServerRegistrationStatus === RelayServerRegistrationStatus.STAKED && relayRegisteredEvents.length !== 0
    if (isServerRegistered) {
      currentStatus = RelayServerRegistrationStatus.REGISTERED
      const lastRegisteredUrl = relayRegisteredEvents[relayRegisteredEvents.length - 1].eventInfo.relayUrl
      const pingResult = await this.attemptPing(lastRegisteredUrl)
      const managerBalance = await this.contractInteractor.getBalance(managerAddress)
      const registeredWorkers: Address[] = await this.contractInteractor.getRegisteredWorkers(managerAddress)
      const workerBalances: ObjectMap<IntString> = {}
      for (const worker of registeredWorkers) {
        workerBalances[worker] = await this.contractInteractor.getBalance(worker)
      }
      registrationInfo = {
        pingResult,
        workerBalances,
        managerBalance,
        lastRegisteredUrl,
        registeredWorkers
      }
    }
    return {
      relayOwner,
      currentStatus,
      authorizedHubs,
      managerAddress,
      registrationInfo,
      stakeManagerEvents,
      relayRegisteredEvents
    }
  }

  async getStakeManagerEvents (managerAddress?: Address): Promise<StakeMangerEvents> {
    const extraTopics = []
    if (managerAddress != null) {
      extraTopics.push(address2topic(managerAddress))
    }
    const eventData = await this.contractInteractor.getPastEventsForStakeManager(allStakeManagerEvents, extraTopics, { fromBlock: 1 })

    const stakeAddedEvents = this.extractTransactionInfos<StakeAddedEventInfo>(eventData, StakeAdded)
    const stakeUnlockedEvents = this.extractTransactionInfos<StakeUnlockedEventInfo>(eventData, StakeUnlocked)
    const stakeWithdrawnEvents = this.extractTransactionInfos<StakeWithdrawnEventInfo>(eventData, StakeWithdrawn)
    const stakePenalizedEvents = this.extractTransactionInfos<StakePenalizedEventInfo>(eventData, StakePenalized)
    const hubAuthorizedEvents = this.extractTransactionInfos<HubAuthorizedEventInfo>(eventData, HubAuthorized)
    const hubUnauthorizedEvents = this.extractTransactionInfos<HubUnauthorizedEventInfo>(eventData, HubUnauthorized)

    return {
      stakeAddedEvents,
      stakeUnlockedEvents,
      stakeWithdrawnEvents,
      stakePenalizedEvents,
      hubAuthorizedEvents,
      hubUnauthorizedEvents
    }
  }

  async attemptPing (url: string): Promise<PingResult> {
    let relayPing: PingResult
    try {
      const pingResponse = await this.httpClient.getPingResponse(url)
      relayPing = { pingResponse }
    } catch (error) {
      relayPing = { error }
    }
    return relayPing
  }

  extractTransactionInfos<T extends GNSContractsEvent> (eventData: EventData[], eventName: EventName): Array<EventTransactionInfo<T>> {
    return eventData
      .filter(it => it.event === eventName)
      .map(
        it => {
          return {
            eventInfo: it.returnValues as T,
            transactionDetail: {
              transactionHash: it.transactionHash,
              explorerURL: 'TODO TODO'
            }
          }
        }
      )
  }

  // setListener (listener: (() => void)): void {
  //   listener()
  // }
}
