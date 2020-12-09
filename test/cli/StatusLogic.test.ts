import StatusLogic, { StatusConfig } from '../../src/cli/StatusLogic'
import ContractInteractor, { ConstructorParams } from '../../src/common/ContractInteractor'
import { GsnTestEnvironment } from '../../src/relayclient/GsnTestEnvironment'
import { HttpProvider } from 'web3-core'
import { createCommandsLogger } from '../../src/cli/CommandsWinstonLogger'
import HttpClient from '../../src/relayclient/HttpClient'
import HttpWrapper from '../../src/relayclient/HttpWrapper'

contract.only('StatusLogic', function () {
  let statusLogic: StatusLogic

  before(async function () {
    const provider = web3.currentProvider as HttpProvider
    const { contractsDeployment: deployment } = await GsnTestEnvironment.startGsn(provider?.host ?? 'localhost')
    const logger = createCommandsLogger('error')
    const constructorParams: ConstructorParams =
      {
        logger,
        provider,
        deployment
      }
    const contractInteractor = await new ContractInteractor(constructorParams).init()
    const httpClient = new HttpClient(new HttpWrapper(), logger)
    const statusConfig: StatusConfig = {
      getAddressTimeoutMs: 10
    }
    statusLogic = new StatusLogic(contractInteractor, httpClient, statusConfig)
  })

  describe('on active GSN deployment', function () {
    it('should gather network statistics', async function () {
      const statistics = await statusLogic.gatherStatistics()
      console.log(JSON.stringify(statistics))
      assert.equal(statistics.relayServers.length, 1) // TODO: at least 4 (by state)
      assert.equal(statistics.senders.length, 1)
      assert.equal(statistics.recipients.length, 1)
      assert.equal(statistics.paymasters.length, 1)
    })
  })
})
