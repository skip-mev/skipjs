# skipjs

A util for 

1. Signing and sending bundles
2. Sending secure transactions

through the Skip Sentinel.

# Usage

For signing and sending bundles, skipjs exposes a single default export, `SkipBundleClient`.
`SkipBundleClient` has two functions:
`signBundle` and `sendBundle`.

```
type SignedBundle = {
  transactions: Array<string>
  pubKey: string
  signature: string
}

async signBundle(transactions: string[], privKey: Uint8Array): SignedBundle

async sendBundle(bundle: SignedBundle, desiredHeight: number, sync?: boolean): Promise<object>
```

For sending secure transactions, skipjs exposes an export, `SkipSecureClient`, with a single function: `sendSecureTransaction`.
```
async sendSecureTransaction(transaction: string)
```

# SkipBundleClient

## signBundle
`signBundle` is used to sign a bundle of transactions. It must be provided with an array of `string`, and a sepc256k1 private key, used to sign the bundle.
The transactions argument should be an array of base64-encoded transaction strings. The encoded bytes can be either Cosmos SDK `TxRaw`s or Ethereum native transactions (such as those produced from `ethers`, for Ethermint EVM chains. See the examples for more details.
`signBundle` returns a `SignedBundle`, which can be passed to `sendBundle` to send the bundle to the Sentinel.

## sendBundle

`sendBundle` sends a `SignedBundle` to the Sentinel.
`desiredHeight` is the desired height for the bundle to be included on-chain. Submitted bundles will only be considered in the auction for this height. Passing `0` as `desiredHeight` will cause the Sentinel to consider the bundle for the immediate next height.
`sync` specifies whether to use the async or sync RPC endpoint. If set to `true`, the promise will not resolve until the bundle has been simulated. If set to `false`, the promise resolves on bundle submission, prior to its simulation.


## Example usage:
Import `SkipBundleClient`, as well as a way to get an sepc256k1 private key, and other utils for the chain you're using. For this example, we'll use Juno.
```
import { SkipBundleClient } from '@skip-mev/skipjs'
import { getOfflineSignerProto } from 'cosmjs-utils'
import { juno, getSigningCosmosClient, cosmos } from 'juno-network'
import { chains } from 'chain-registry'
```
Create your transactions:
```
const {
    multiSend,
    send
} = cosmos.bank.v1beta1.MessageComposer.fromPartial

var msg = send({
    amount: [
    {
        denom: 'ujuno',
        amount: '10'
    }
    ],
    toAddress: toAddress,
    fromAddress: fromAddress
})

const fee = {
    amount: [
    {
        denom: 'ujuno',
        amount: '864'
    }
    ],
    gas: '86364'
}
```

Sign your transactions:
```
const mnemonic = "" // Insert your mnemonic
const signer = await getOfflineSignerProto({
    mnemonic,
    chain: chains.find(({ chain_name }) => chain_name === 'juno')
})

const client = await getSigningCosmosClient({
  rpcEndpoint,
  signer
})

const { accountNumber, sequence } = await client.getSequence(address);
const txRaw = await client.sign(address, [msg], fee, '', {
    accountNumber: accountNumber,
    sequence: sequence,
    chainId: 'juno-1'
})
```

Convert your TxRaw into a base64 string:
```
import { TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx.js'
const txString = Buffer.from(TxRaw.encode(txRaw).finish()).toString('base64')
```

Get the secp256k1 private key for signing the bundle.
For example, this can be done with the cosmjs-utils offline signer:
```
const privKey = (await signer.getAccountsWithPrivkeys())[0].privkey
```

Create your SkipBundleClient:
```
const skipBundleClient = new SkipBundleClient(SENTINEL_RPC_ENDPOINT)
```

The RPC endpoint is an `ip:port` string that depends on the chain you're using. Skip Sentinel endpoints for each chain can be found [here](https://www.notion.so/skip-protocol/Skip-Configurations-By-Chain-a6076cfa743f4ab38194096403e62f3c).

Sign and send your bundle:
```
const signedBundle = await skipBundleClient.signBundle([txString], privKey)
const sendBundleResponse = await skipBundleClient.sendBundle(signedBundle, DESIRED_HEIGHT_FOR_BUNDLE, true)
```

`DESIRED_HEIGHT_FOR_BUNDLE` should be a number, where 0 asks the Sentinel to autodetermine the next height.

# SkipSecureClient

## sendSecureTransaction
`sendSecureTransaction` is used to send transactions privately to the Skip Sentinel to keep the transaction hidden from the public mempool. The Sentinel attempts to privately send the transaction to the a Skip proposer for 5 minutes until discarding the transaction. It takes a single transaction, where the memo of the transaction must be equal to the sender's address.

## Example usage:

Import `SkipSecureClient`, as well as other utils for generating transactions for the chain you're using. For this example, we'll use Juno.
```
import { SkipSecureClient } from '@skip-mev/skipjs'
import { getOfflineSignerProto } from 'cosmjs-utils'
import { juno, getSigningCosmosClient, cosmos } from 'juno-network'
import { chains } from 'chain-registry'
```
Create your transactions:
```
const {
    multiSend,
    send
} = cosmos.bank.v1beta1.MessageComposer.fromPartial

var msg = send({
    amount: [
    {
        denom: 'ujuno',
        amount: '10'
    }
    ],
    toAddress: toAddress,
    fromAddress: fromAddress
})

const fee = {
    amount: [
    {
        denom: 'ujuno',
        amount: '864'
    }
    ],
    gas: '86364'
}
```

Sign your transactions. Note that the memo of the transaction must be the same as the sender address in order to be accepted by the Sentinel.
```
const mnemonic = "" // Insert your mnemonic
const signer = await getOfflineSignerProto({
    mnemonic,
    chain: chains.find(({ chain_name }) => chain_name === 'juno')
})

const client = await getSigningCosmosClient({
  rpcEndpoint,
  signer
})

const { accountNumber, sequence } = await client.getSequence(address);
// Note that we use the address for the memo.
const txRaw = await client.sign(address, [msg], fee, address, {
    accountNumber: accountNumber,
    sequence: sequence,
    chainId: 'juno-1'
})
```

Convert your TxRaw into a base64 string:
```
import { TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx.js'
const txString = Buffer.from(TxRaw.encode(txRaw).finish()).toString('base64')
```

Create your SkipSecureClient:
```
const skipSecureClient = new SkipSecureClient(SENTINEL_RPC_ENDPOINT)
```

The RPC endpoint is an `ip:port` string that depends on the chain you're using. Skip Sentinel endpoints for each chain can be found [here](https://www.notion.so/skip-protocol/Skip-Configurations-By-Chain-a6076cfa743f4ab38194096403e62f3c).

Send your secure transaction:
```
const sendSecureTransactionResponse = await skipSecureClient.sendSecureTransaction(txString)
```
