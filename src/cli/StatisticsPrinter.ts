import { GSNStatistics, RelayServerInfo, RelayServerRegistrationStatus } from './GSNStatistics'
import Web3 from 'web3'

export function printStatistics (statistics: GSNStatistics): void {
  console.log(`GSN status for version ${statistics.runtimeVersion} at block height ${statistics.blockNumber}`)

  console.log(`Total stakes by all relays: ${Web3.utils.fromWei(statistics.totalStakesByRelays)} ETH`)
  console.log(`GSN contracts deployment:
  Version Registry: ${statistics.contractsDeployment.versionRegistryAddress}
  Stake Manager: ${statistics.contractsDeployment.stakeManagerAddress}
  Relay Hub: ${statistics.contractsDeployment.relayHubAddress}
  Penalizer: ${statistics.contractsDeployment.penalizerAddress}
  `)

  console.log('\n# Relays:')
  statistics.relayServers.forEach(relayServerInfo => {
    printServerInfo(relayServerInfo)
  })
  /*
    console.log('\n# Owners:')
    Object.keys(owners).forEach(k => {
      const ethBalance = web3.eth.getBalance(k)
      const relayBalance = r.methods.balanceOf(k).call()
      Promise.all([ethBalance, relayBalance])
        .then(async () => {
          // @ts-ignore
          console.log('-', owners[k], ':', k, 'on-hub:', (await relayBalance) / 1e18, '\tbal', (await ethBalance) / 1e18)
        })
        .catch(reason => {
          console.error(reason)
        })
    })
  */
}

function printServerInfo (relayServerInfo: RelayServerInfo): void {
  console.log(`Relay is currently ${stringServerStatus(relayServerInfo.currentStatus)}.`)

  console.log()

  relayServerInfo.res.push(relayServerInfo.relayManager)
  res.push(relayServerInfo.relayUrl)
  res.push(`\tfee: ${relayServerInfo.baseRelayFee} wei + ${relayServerInfo.pctRelayFee}%`)
  const managerBalance = statistics.balances.get(relayServerInfo.relayManager)
  if (managerBalance == null) {
    res.push('\tbalance: N/A')
  } else {
    res.push(`\tbalance: ${Web3.utils.fromWei(managerBalance)} ETH`)
  }
  const pingResult = statistics.relayPings.get(relayServerInfo.relayUrl)
  const status = pingResult?.pingResponse != null ? pingResult.pingResponse.ready.toString() : pingResult?.error?.toString() ?? 'unknown'
  res.push(`\tstatus: ${status}`)
  console.log('- ' + res.join(' '))
}

function stringServerStatus (status: RelayServerRegistrationStatus): string {
  switch (status) {
    case RelayServerRegistrationStatus.REGISTERED:
      return 'registered'
    case RelayServerRegistrationStatus.STAKED:
      return 'staked'
    case RelayServerRegistrationStatus.WITHDRAWN:
      return 'withdrawn'
    case RelayServerRegistrationStatus.UNLOCKED:
      return 'unlocked'
    case RelayServerRegistrationStatus.PENALIZED:
      return 'penalized'
  }
}
