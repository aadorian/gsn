import Web3 from 'web3'

import ContractInteractor from '../../common/ContractInteractor'
import HttpClient from '../../relayclient/HttpClient'
import HttpWrapper from '../../relayclient/HttpWrapper'
import { GSNContractsDeployment } from '../../common/GSNContractsDeployment'

import { getNetworkUrl, getRelayHubAddress, gsnCommander } from '../utils'
import StatusLogic, { StatusConfig } from '../StatusLogic'
import { createCommandsLogger } from '../CommandsWinstonLogger'
import { printStatistics } from '../StatisticsPrinter'

const commander = gsnCommander(['n', 'h'])
  .parse(process.argv);

(async () => {
  const host = getNetworkUrl(commander.network)
  const relayHubAddress = getRelayHubAddress(commander.hub)

  if (relayHubAddress == null) {
    console.error('Please specify RelayHub address')
    process.exit(1)
  }

  const statusConfig: StatusConfig = {
    getAddressTimeoutMs: 1000
  }

  const deployment: GSNContractsDeployment = { relayHubAddress }
  const logger = createCommandsLogger(commander.loglevel)
  const provider = new Web3.providers.HttpProvider(host)
  const contractInteractor = new ContractInteractor({ provider, logger, deployment })
  await contractInteractor.init()
  const httpClient = new HttpClient(new HttpWrapper({ timeout: statusConfig.getAddressTimeoutMs }), logger)

  const statusLogic = new StatusLogic(contractInteractor, httpClient, statusConfig)

  const statistics = await statusLogic.gatherStatistics()
  printStatistics(statistics)
})().catch(
  reason => {
    console.error(reason)
    process.exit(1)
  }
)
